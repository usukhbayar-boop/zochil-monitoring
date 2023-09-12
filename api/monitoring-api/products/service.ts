import moment from "moment";
import pick from "lodash/pick";
import union from "lodash/union";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { nestCategories } from "lib/utils";
import { ApiFilter, ApiOptions, ID, User } from "core/types";

export default class ProductAdminService extends APIService {
  async assign_main_categories({
    user: User,
    id,
    codes,
    ids
  }: {
    user: User;
    id: ID;
    codes: string[];
    ids: ID[];
  }) {
    const product = await super.findOne("id", id);
    let _ids = union(product.main_category_ids, ids);
    let _codes = union(product.main_category_codes, codes);
    union(product.main_category_ids, ids);

    await super.update(
      pickBy(
        {
          main_category_ids: JSON.stringify(_ids),
          main_category_codes: JSON.stringify(_codes)
        },
        (v) => v !== undefined
      ),
      { id }
    );
  }

  async unassign_main_categories({
    user: User,
    id,
    codes,
    ids
  }: {
    user: User;
    id: ID;
    codes: string[];
    ids: ID[];
  }) {
    const product = await super.findOne("id", id);
    let _codes = product.main_category_codes;
    let _ids = product.main_category_ids;
    if (codes && codes.length > 0) {
      _codes = _codes.filter((item: any) => !codes.includes(item));
    }
    if (ids && ids.length > 0) {
      _ids = _ids.filter((item: any) => !ids.includes(item));
    }
    await super.update(
      pickBy(
        {
          main_category_codes: JSON.stringify(_codes),
          main_category_ids: JSON.stringify(_ids)
        },
        (v) => v !== undefined
      ),
      { id }
    );
  }

  async main_categories_list() {
    const { list } = await super.findForList(
      {},
      {
        limit: 3000,
        exceed_limit: true,
        fields: [
          "product_main_categories.id",
          "product_main_categories.name",
          "product_main_categories.level",
          "product_main_categories.parent_id",
          "product_main_categories.code",
          "product_main_categories.ordering"
        ],
        orderFields: [{ column: "ordering", order: "asc" }]
      },
      "product_main_categories"
    );

    return { data: nestCategories(list) };
  }

  async list(user: User, filter = {}, options = {}) {
    const { list: products, totalCount } = await super.findForList(
      this._buildFilter(filter, user),
      this._buildOptions(options)
    );

    return {
      total: totalCount,
      data: products
    };
  }

  async detail(user: User, id: ID) {
    const theFilter: any = { id };
    if (user.admin_type === "marketplace_admin") {
      theFilter.marketplace_uid = user.marketplace_uid || "none";
    }

    const product = await super.findOneByConditions(theFilter);

    return { data: product };
  }

  async update({
    id,
    name,
    price,
    status,
    sale_channels,
    main_category_codes
  }: {
    user: User;
    id: ID;
    name: string;
    price: string;
    status: string;
    sale_channels: string[];
    main_category_codes: string[];
  }) {
    await super.update(
      pickBy(
        {
          name,
          price,
          status,
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
      theFilter.marketplace_uid = user.marketplace_uid || "none";
    }

    return theFilter;
  }
}
