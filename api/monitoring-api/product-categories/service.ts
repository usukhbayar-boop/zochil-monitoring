import moment from "moment";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { nestCategories } from "lib/utils";
import { ApiFilter, ApiOptions, ID } from "core/types";
import { union } from "lodash";

export default class ProductCategoryAdminService extends APIService {
  async list(filter = {}, options = {}) {
    const { list: data, totalCount: total } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );
    return { data, total };
  }

  async detail(id: ID) {
    const category = await super.findOne("id", id);

    return { data: category };
  }

  async update({
    id,
    name,
    sale_channels,
    main_category_codes
  }: {
    id: ID;
    name: string;
    sale_channels: string[];
    main_category_codes: string[];
  }) {
    await super.update(
      pickBy(
        {
          name,
          sale_channels: JSON.stringify(sale_channels || []),
          main_category_codes: JSON.stringify(main_category_codes || [])
        },
        (v) => v !== undefined
      ),
      { id }
    );
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

  _buildFilter(filter: ApiFilter) {
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

    return theFilter;
  }
}
