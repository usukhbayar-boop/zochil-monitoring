import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import omit from "lodash/omit";
import bcrypt from "bcrypt";
import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import UserService from "core/users/service";
import { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";

export default class ManagerService extends APIService {
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

  async changePassword(id: ID, currentPassord: string, newPassword: string) {
    return await this._userService.changePassword(
      id,
      currentPassord,
      newPassword
    );
  }

  async list(filter: ApiFilter = {}, options: ApiOptions) {
    const theFilter = this._buildFilter(filter);
    const { list: managers, totalCount } = await super.findForList(
      theFilter,
      options
    );

    return { data: managers, total: totalCount };
  }

  async create({
    last_name,
    first_name,
    username,
    phone,
    password,
    regno,
    user
  }: {
    last_name: string;
    first_name: string;
    username: string;
    phone: string;
    password: string;
    regno: string;
    user: User;
  }) {
    if (user.admin_type !== "super_admin" && !user.is_super) {
      throw new CustomError("only super admin access", "Хандах эрхгүй");
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const id = await super.insert({
      last_name,
      first_name,
      username,
      phone,
      hashed_password,
      regno,
      is_super: false,
      is_verified: true
    });

    return { id };
  }

  async update({
    id,
    last_name,
    first_name,
    username,
    phone,
    regno,
    password
  }: {
    id: ID;
    last_name: string;
    first_name: string;
    username: string;
    phone: string;
    password: string;
    regno: string;
  }) {
    const params = pickBy(
      {
        last_name,
        first_name,
        username,
        phone,
        regno
      },
      (v) => v
    );

    if (password) {
      params.hashed_password = await bcrypt.hash(password, 10);
    }
    await super.update(params, { id, admin_type: "manager" });
  }

  _buildFilter(filter: ApiFilter) {
    const thefilter: ApiFilter = {
      ...pick(filter, []),
      admin_type: ["admins.admin_type = 'manager'", {}]
    };

    return thefilter;
  }

  async detail(id: ID) {
    return await this.getManager({ manager_id: id });
  }

  async addRoles({
    manager_id,
    roles,
    user
  }: {
    manager_id: ID;
    roles: Array<string>;
    user: User;
  }) {
    let manager: any;

    if (user.admin_type !== "super_admin" && !user.is_super) {
      throw new CustomError("only super admin access", "Хандах эрхгүй");
    }

    await this.getManager({ manager_id: manager_id }).then((res) => {
      manager = res.manager;
    });

    let roles_arr = [...manager.roles];

    if (!Array.isArray(roles)) {
      throw new CustomError("Role add", "role add failed");
    }

    if (roles_arr.length > 0) {
      roles_arr.forEach((val, i, arr) => {
        roles.forEach((value) => {
          if (value === val) {
            throw new CustomError(
              "Role already created",
              `${value} role аль хэдийн бүртгэгдсэн байна`
            );
          } else {
            for (let i = 0; i < roles.length; i++) {
              roles_arr.push(roles[i]);
            }
          }
        });
      });
    } else {
      for (let i = 0; i < roles.length; i++) {
        roles_arr.push(roles[i]);
      }
    }
    await super.update(
      { roles: JSON.stringify(roles_arr) },
      { id: manager.id },
      "admins"
    );

    return { response: "Added roles to manager" };
  }

  async removeRole({
    manager_id,
    role,
    user
  }: {
    manager_id: ID;
    role: string;
    user: User;
  }) {
    let manager: any;

    if (user.admin_type !== "super_admin" && !user.is_super) {
      throw new CustomError("only super admin access", "Хандах эрхгүй");
    }

    await this.getManager({ manager_id }).then((res) => {
      manager = res.manager;
    });

    let roles_arr = [...manager.roles];

    roles_arr.forEach((val, i, arr) => {
      if (val !== role) {
        throw new CustomError(
          "remove role request not found manager",
          `${role} утга олдсонгүй`
        );
      }
    });

    roles_arr = roles_arr.filter((val) => {
      if (val !== role) {
        return val;
      }
    });

    await super.update(
      { roles: JSON.stringify(roles_arr) },
      {
        id: manager.id
      },
      "admins"
    );
    return { response: "removed role to manager" };
  }

  async getManager({ manager_id }: { manager_id: ID }) {
    const conditions: { [key: string]: any } = {
      id: manager_id,
      admin_type: "manager"
    };

    const manager = await super.findOneByConditions(conditions);
    if (!manager) {
      throw new CustomError("request not found", "manager олдсонгүй");
    }
    return { manager: omit(manager, "hashed_password") };
  }

  async remove(id: ID) {
    await this.removeByConditions({ id, admin_type: "manager" });
  }
}
