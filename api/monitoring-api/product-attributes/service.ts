import bcrypt from "bcrypt";
import omit from "lodash/omit";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import UserService from "core/users/service";
import CustomError from "lib/errors/custom_error";
import { DBConnection, ID, ApiFilter, ApiOptions } from "core/types";

export default class ProductAttributesMonitoringService extends APIService {
  private _userService: UserService;
  constructor(db: DBConnection) {
    super(db, "product_attributes");
    this._userService = new UserService(db, "admins");
  }

  async list(filter = {}, options = {}) {
    const { list: sale_channel_request, totalCount } = await super.findForList(
      filter,
      options
    );
    return { data: sale_channel_request };
  }

  async create({
    shop_id,
    name,
    code,
    category_ids,
    status,
    group
  }: {
    shop_id: ID;
    name: string;
    code: string;
    category_ids: any[];
    status: string;
    group: string;
  }) {
    await super.insert({
      shop_id: shop_id,
      name: name,
      code: code,
      category_ids: JSON.stringify(category_ids),
      status: status,
      group: group
    });
  }
}
