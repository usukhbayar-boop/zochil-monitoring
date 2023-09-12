import pick from "lodash/pick";
import moment from "moment";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, ID, User } from "core/types";

export default class CategoryService extends APIService {
  async detail(id: ID, user: User) {
    const conditions: { [key: string]: any } = { id };
    if (user.admin_type === "marketplace_admin") {
      conditions.sale_channels = [
        `product_categories.sale_channels @> '["${
          user.marketplace_uid || "none"
        }"]'`,
        {}
      ];
    }

    const product_category = await (
      await super.findForList(conditions)
    ).list[0];
    return { data: product_category };
  }

  async list(user: User, filter = {}, options = {}) {
    const { list: data, totalCount: total } = await super.findForList(
      this._buildFilter(filter, user),
      this._buildOptions(options)
    );
    return { data, total };
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      joins: [["leftJoin", "shops", `product_categories.shop_id`, "shops.id"]],
      fields: [
        "product_categories.id",
        "product_categories.name",
        "product_categories.main_category_codes",
        "product_categories.shop_id",
        "product_categories.sale_channels",
        "product_categories.ordering",
        "product_categories.created_at",
        "shops.name as shop_name"
      ]
    };
  }

  _buildFilter(filter: ApiFilter, user: User) {
    const theFilter = pickBy(pick(filter, ["shop_id", "price"]));

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `product_categories.created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `product_categories.created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `product_categories.created_at < :end`,
        { end: moment(filter.end).toDate() }
      ];
    }

    if (filter.channels) {
      theFilter.sale_channels = [
        `product_categories.sale_channels @> '[${filter.channels}]'::jsonb`,
        {}
      ];
    }

    if (filter.category_codes) {
      theFilter.category_codes = [
        `product_categories.main_category_codes @> '[${filter.category_codes}]'::jsonb`,
        {}
      ];
    }

    if (filter.name) {
      theFilter.name = [
        `lower(product_categories.name) like :name`,
        { name: `%${filter.name.toLowerCase()}%` }
      ];
    }

    if (user.admin_type === "marketplace_admin") {
      theFilter.sale_channels = [
        `product_categories.sale_channels @> '["${
          user.marketplace_uid || "none"
        }"]'::jsonb`,
        {}
      ];
    }

    return theFilter;
  }
}
