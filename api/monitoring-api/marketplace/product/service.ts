import pick from "lodash/pick";
import moment from "moment";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";

export default class ProductsService extends APIService {
  constructor(db: DBConnection, tableName: string) {
    super(db, tableName);
  }

  async removeProductMarketPlace(id: ID, user: User) {
    const conditions: { [key: string]: any } = { id };
    if (user.admin_type === "marketplace_admin") {
      conditions.sale_channels = [
        `products.sale_channels @> '["${user.marketplace_uid || "none"}"]'`,
        {}
      ];
    }
    const product = await (await super.findForList(conditions)).list[0];

    if (!product) {
      throw new CustomError("Product not found!", "Бараа олдсонгүй");
    }

    let sale_channels_arr = [...product.sale_channels];

    sale_channels_arr = sale_channels_arr.filter((val) => {
      if (val !== user.marketplace_uid) {
        return val;
      }
    });

    await super.update(
      { sale_channels: JSON.stringify(sale_channels_arr) },
      {
        id: product.id
      }
    );

    return { response: "remove product success from marketplace" };
  }
  async list(user: User, filter = {}, options = {}): Promise<Object> {
    const { list: products, totalCount } = await super.findForList(
      this._buildFilter(filter, user),
      this._buildOptions(options)
    );

    return {
      data: products,
      total: totalCount
    };
  }

  async detail(id: ID, user: User) {
    const conditions: { [key: string]: any } = { id };
    if (user.admin_type === "marketplace_admin") {
      conditions.sale_channels = [
        `products.sale_channels @> '["${user.marketplace_uid || "none"}"]'`,
        {}
      ];
    }
    const product = await (await super.findForList(conditions)).list[0];
    return { data: product };
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      joins: [["leftJoin", "shops", `products.shop_id`, "shops.id"]],
      fields: [
        "products.id",
        "products.name",
        "products.main_category_codes",
        "products.sku",
        "products.price",
        "products.images",
        "products.featured",
        "products.has_inventory",
        "products.brand_id",
        "products.status",
        "products.shop_id",
        "products.sale_price",
        "products.sale_channels",
        "products.ordering",
        "products.sale_expire_at",
        "products.sale_campaign_id",
        "products.sale_start_at",
        "products.created_at",
        "shops.name as shop_name"
      ]
    };
  }

  _buildFilter(filter: ApiFilter, user: User) {
    const theFilter = pickBy(pick(filter, ["status", "shop_id", "price"]));

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `products.created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `products.created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `products.created_at < :end`,
        { end: moment(filter.end).toDate() }
      ];
    }

    if (filter.channels) {
      theFilter.sale_channels = [
        `products.sale_channels @> '[${filter.channels}]'::jsonb`,
        {}
      ];
    }

    if (filter.category_codes) {
      theFilter.category_codes = [
        `products.main_category_codes @> '[${filter.category_codes}]'::jsonb`,
        {}
      ];
    }

    if (filter.name) {
      theFilter.name = [
        `lower(products.name) like :name`,
        { name: `%${filter.name.toLowerCase()}%` }
      ];
    }

    if (filter.sku) {
      theFilter.sku = [
        `lower(products.sku) like :sku`,
        { sku: `%${filter.sku.toLowerCase()}%` }
      ];
    }

    if (user.admin_type === "marketplace_admin") {
      theFilter.sale_channels = [
        `products.sale_channels @> '["${
          user.marketplace_uid || "none"
        }"]'::jsonb`,
        {}
      ];
    }

    return theFilter;
  }
}
