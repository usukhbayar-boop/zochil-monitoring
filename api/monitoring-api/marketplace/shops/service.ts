import pick from "lodash/pick";
import APIService from "core/base/service";
import { ApiFilter, DBConnection, ID, User } from "core/types";

export default class ShopsService extends APIService {
  constructor(db: DBConnection, tableName: string) {
    super(db, tableName);
  }

  async list(user: User, filter = {}, options = {}) {
    const theFilter = this._buildFilter(filter, user);
    const shops = await super.findForList(theFilter, options);

    return { data: shops };
  }

  async detail(id: ID, user: User) {
    const conditions: { [key: string]: any } = { id };

    if (user.admin_type === "marketplace_admin") {
      conditions.sale_channels = [
        "sale_channels @> :sale_channels",
        { sale_channels: `["${user.marketplace_uid}"]` || `["none"]` }
      ];
    }

    const shop = await (await super.findForList(conditions)).list[0];
    return { data: shop };
  }

  _buildFilter(filter: ApiFilter, user: User) {
    const theFilter: ApiFilter = {
      ...pick(filter, ["name", "merchant_type", "uid"]),
      subscribed: [`(is_subscribed = true and status <> '')`, {}],
      sale_channels: [
        "sale_channels @> :sale_channels",
        { sale_channels: `["${filter.sale_channels}"]` }
      ]
    };

    if (user.admin_type === "marketplace_admin") {
      theFilter.sale_channels = [
        "sale_channels @> :sale_channels",
        { sale_channels: `["${user.marketplace_uid}"]` || `["none"]` }
      ];
    }

    return theFilter;
  }
}
