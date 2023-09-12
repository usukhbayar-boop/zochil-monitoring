import bcrypt from "bcrypt";
import pickBy from "lodash/pickBy";
import pick from "lodash/pick";
import omit from "lodash/omit";
import CustomError from "lib/errors/custom_error";
import APIService from "core/base/service";
import UserService from "core/users/service";
import { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";

export default class MarketPlaceAdminService extends APIService {
  private _userService: UserService;
  constructor(db: DBConnection) {
    super(db, "admins");
    this._userService = new UserService(db, "admins");
  }

  async loginWithPassword(username: string, password: string) {
    return await this._userService.loginWithPassword(
      username,
      password,
      "username"
    );
  }

  async changePassword(id: ID, currentPassword: string, newPassword: string) {
    return await this._userService.changePassword(
      id,
      currentPassword,
      newPassword
    );
  }

  async list(filter: ApiFilter = {}, options: ApiOptions) {
    const listFilter = this._buildFilter(filter);
    const { list: marketplace_admins, totalCount } = await super.findForList(
      listFilter,
      options
    );
    return { data: marketplace_admins, total: totalCount };
  }

  async create({
    last_name,
    first_name,
    username,
    phone,
    password,
    regno,
    marketplace_uid,
    user
  }: {
    last_name: string;
    first_name: string;
    username: string;
    phone: string;
    password: string;
    marketplace_uid: string;
    regno: string;
    user: User;
  }) {
    if (user.admin_type !== "super_admin" && !user.is_super) {
      throw new CustomError("only super admin access", "Хандах эрхгүй");
    }
    const hashed_password = await bcrypt.hash(password, 10);
    await super.insert({
      last_name,
      first_name,
      username,
      phone,
      marketplace_uid,
      admin_type: "marketplace_admin",
      is_super: false,
      is_verified: true,
      hashed_password,
      regno
    });
  }

  async update({
    id,
    last_name,
    first_name,
    username,
    phone,
    marketplace_uid,
    regno,
    password
  }: {
    id: ID;
    last_name: string;
    first_name: string;
    username: string;
    phone: string;
    marketplace_uid: string;
    regno: string;
    password: string;
  }) {
    const params = pickBy(
      {
        last_name,
        first_name,
        username,
        phone,
        marketplace_uid,
        regno
      },
      (v) => v
    );

    if (password) {
      params.hashed_password = await bcrypt.hash(password, 10);
    }
    await super.update(params, { id, admin_type: "marketplace_admin" });
  }

  async detail(id: ID) {
    return { data: await this.getMarketPlaceAdmin({ id }) };
  }

  async remove(id: ID, user: User) {
    if (user.admin_type === "super_admin" && user.is_super) {
      await this.removeByConditions({ id, admin_type: "marketplace_admin" });
    } else throw new CustomError("only super admin access", "Хандах эрхгүй");
  }

  _buildFilter(filter: ApiFilter) {
    const listFilter: ApiFilter = {
      ...pick(filter, []),
      admin_type: ["admins.admin_type = 'marketplace_admin'", {}]
    };
    return listFilter;
  }

  async addRole({ id, role, user }: { id: ID; role: any; user: User }) {
    let marketplace_admin: any;
    if (user.admin_type === "super_admin" && user.is_super) {
      await this.getMarketPlaceAdmin({ id }).then((res) => {
        marketplace_admin = res.marketplace_admin;
      });
      let roles_arr = [...marketplace_admin.roles];
      roles_arr.forEach((val, i, arr) => {
        if (val === role) {
          throw new CustomError(
            "marketplace admin role already added",
            "role аль хэдийн бүртгэгсэн байна"
          );
        }
      });
      roles_arr.push(role);
      await super.update(
        { roles: JSON.stringify(roles_arr) },
        { id },
        "admins"
      );
      return { response: "added role success to marketplace admin" };
    }

    throw new CustomError("only super admin access", "Хандах эрхгүй");
  }

  async removeRole({ id, role, user }: { id: ID; role: string; user: User }) {
    let marketplace_admin: any;
    if (user.admin_type === "super_admin") {
      await this.getMarketPlaceAdmin({ id }).then((res) => {
        marketplace_admin = res.marketplace_admin;
      });
      let roles_arr = [...marketplace_admin.roles];
      roles_arr.forEach((val, i, arr) => {
        if (val !== role) {
          throw new CustomError(
            "remove role request not found",
            `${role} утга олдсонгүй`
          );
        }
      });
      roles_arr = roles_arr.filter((value) => {
        if (value !== role) {
          return value;
        }
      });
      await super.update(
        { roles: JSON.stringify(roles_arr) },
        { id },
        "admins"
      );

      return { response: "removed role success to marketplace admin" };
    } else {
      throw new CustomError("only super admin access", "Хандах эрхгүй");
    }
  }

  async getMarketPlaceAdmin({ id }: { id: ID }) {
    const conditions: { [key: string]: any } = {
      id,
      admin_type: "marketplace_admin"
    };

    const marketplace_admin = await super.findOneByConditions(conditions);
    if (!marketplace_admin) {
      throw new CustomError(
        "not found marketplace admin",
        "market place admin олдсонгүй"
      );
    }
    return { marketplace_admin: omit(marketplace_admin, "hashed_password") };
  }
}
