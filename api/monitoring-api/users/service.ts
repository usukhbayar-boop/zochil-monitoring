import bcrypt from "bcrypt";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import moment from "moment";
import omit from "lodash/omit";
import APIService from "core/base/service";
import { ApiFilter, ID } from "core/types";

export default class UserAdminService extends APIService {
  async list(filter = {}, options = {}) {
    const { list, totalCount } = await this.findForList(
      this._buildFilter(filter),
      options
    );

    return {
      total: totalCount,
      data: list.map((row) =>
        omit(row, ["hashed_password", "hashed_otp", "facebook_token"])
      )
    };
  }

  async detail(id: ID) {
    const user = await super.findOne("id", id);

    if (user) {
      user.shops = await this.connector.db_readonly
        .raw(
          `
        select
          ss.logo, ss.id, ss.name, ss.custom_domain, ss.uid, ss.created_at
        from shops ss
        inner join shops_users su on su.shop_id = ss.id
        where
          su.user_id=:user_id
      `,
          { user_id: id }
        )
        .then((res) => (res || {}).rows || []);
    }

    return {
      data: omit(user, ["hashed_password", "hashed_otp", "facebook_token"])
    };
  }

  async create({
    phone,
    first_name,
    last_name,
    password
  }: {
    phone: string;
    first_name: string;
    last_name: string;
    password: string;
  }) {
    const hashed_password = await bcrypt.hash(password, 10);

    await super.insert({
      phone,
      first_name,
      last_name,
      hashed_password,
      is_verified: true,
      auth_type: "phone",
      full_name: `${first_name} ${last_name}`
    });
  }

  async update({
    id,
    phone,
    first_name,
    last_name,
    password
  }: {
    id: ID;
    phone: string;
    first_name: string;
    last_name: string;
    password?: string;
  }) {
    const user = await super.findOne("id", id);
    if (!user) {
      throw new Error(user);
    }

    let hashed_password = user.hashed_password;
    if (password) {
      hashed_password = await bcrypt.hash(password, 10);
    }

    await super.update(
      {
        phone,
        first_name,
        last_name,
        hashed_password,
        is_verified: true,
        auth_type: "phone",
        full_name: `${first_name} ${last_name}`
      },
      { id }
    );
  }

  async remove(user_id: ID) {
    await super.update({ user_id: null }, { user_id }, "social_pages");
    await super.removeByConditions({ user_id }, "shops_users");
    await super.removeByConditions({ id: user_id }, "users");
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter = pickBy(pick(filter, ["status"]));

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `created_at < :end`,
        { end: moment(filter.end).toDate() }
      ];
    }

    if (filter.phone) {
      theFilter.phone = [
        `lower(phone) like :phone`,
        { phone: `%${filter.phone.toLowerCase()}%` }
      ];
    }

    if (filter.name) {
      theFilter.name = [
        `(
          lower(first_name) like :name OR
          lower(last_name) like :name OR
          lower(facebook_name) like :name OR
          lower(full_name) like :name OR
          lower(first_name || ' ' || last_name) like :name OR
          lower(last_name || ' ' || first_name) like :name
        )`,
        { name: `%${filter.name.trim().toLowerCase()}%` }
      ];
    }

    return theFilter;
  }
}
