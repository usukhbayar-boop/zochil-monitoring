import pick from "lodash/pick";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, ID, User } from "core/types";

export default class PagesService extends APIService {
  async list(user: User, filter: ApiFilter, options: ApiOptions) {
    const theFilter = this._buildFilter(filter, user);
    const pages = await super.findForList(theFilter, options);
    return { data: pages };
  }

  _buildFilter(filter: ApiFilter, user: User) {
    const theFilter: ApiFilter = {
      ...pick(filter, []),
      marketplace_uid: [
        "marketplace_pages.marketplace_uid = :marketplace_uid",
        { marketplace_uid: filter.marketplace_uid }
      ]
    };

    if (user.admin_type === "marketplace_admin") {
      theFilter.marketplace_uid = user.marketplace_uid || "none";
    }
    return theFilter;
  }

  async detail(id: ID, user: User) {
    const conditions: { [key: string]: any } = { id };

    if (user.admin_type === "marketplace_admin") {
      conditions.marketplace_uid = user.marketplace_uid || "none";
    }

    const page = await super.findOneByConditions(conditions);

    return { data: page };
  }

  async update({
    id,
    name,
    code,
    body,
    image,
    user
  }: {
    id: ID;
    name: string;
    code: string;
    body: string;
    image: string;
    user: User;
  }) {
    await super.update(
      {
        name,
        body,
        code,
        image
      },
      {
        id,
        marketplace_uid: user.marketplace_uid
      }
    );
  }

  async remove(id: ID, user: User) {
    await super.removeByConditions({
      id,
      marketplace_uid: user.marketplace_uid || "none"
    });
  }

  async create({
    name,
    body,
    code,
    image,
    marketplace_uid
  }: {
    name: string;
    body: string;
    code: string;
    image?: string;
    marketplace_uid: string;
  }) {
    await super.insert({
      name,
      body,
      code,
      image,
      marketplace_uid
    });
  }
}
