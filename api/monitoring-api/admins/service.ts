import bcrypt from "bcrypt";
import omit from "lodash/omit";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import UserService from "core/users/service";
import { DBConnection, ID, ApiFilter, ApiOptions } from "core/types";

export default class AdminService extends APIService {
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

  async list(filter: ApiFilter = {}, options: ApiOptions = {}) {
    const { list, totalCount } = await this.findForList(filter, options);

    return {
      total: totalCount,
      data: list.map((row) => omit(row, "hashed_password"))
    };
  }

  async detail(id: ID) {
    const admin = await super.findOneByConditions({ id });
    return { data: omit(admin, "hashed_password") };
  }

  async create({
    last_name,
    first_name,
    username,
    phone,
    password,
    regno
  }: {
    last_name: string;
    first_name: string;
    username: string;
    phone: string;
    password: string;
    regno: string;
  }) {
    const hashed_password = await bcrypt.hash(password, 10);

    await super.insert({
      last_name,
      first_name,
      username,
      phone,
      regno,
      is_super: true,
      hashed_password,
      is_verified: true
    });
  }

  async update({
    id,
    last_name,
    first_name,
    username,
    phone,
    password,
    regno
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

    await super.update(params, { id });
  }

  async remove(id: ID) {
    await this.removeById(id);
  }
}
