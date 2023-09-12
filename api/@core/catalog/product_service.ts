import moment from "moment";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import {
  DBConnection,
  ID,
  User,
  ApiFilter,
  ApiOptions,
  Product
} from "core/types";

export default class ProductService extends APIService {
  constructor(db: DBConnection) {
    super(db, "products");
  }

  async fetchProduct(id: ID, shop_id?: ID) {
    const product = await super.findOneByConditions({
      id,
      status: "enabled",
      ...(!!shop_id && { shop_id })
    });

    await this.fetchVariants(product);
    await this.fetchInventory(product);
    await this.processSalePrice(product);

    if (product && Array.isArray(product.all_options)) {
      product.all_options = product.all_options.map((option: any) => ({
        ...option,
        values: option.values.map((v: any) => v.title || v)
      }));
    }

    return { product };
  }

  async searchProducts(
    shop_id: ID,
    filter: ApiFilter = {},
    options: ApiOptions = {}
  ) {
    const listCursor = this.connector.db_readonly(this.tableName),
      countCursor = this.connector.db_readonly(this.tableName);

    const theFilter = {
      shop_id,
      ...pickBy(
        pick(filter, ["status", "brand_id", "featured", "sale_campaign_id"]),
        (value) => value
      )
    };

    for (const cursor of [listCursor, countCursor]) {
      cursor.where(theFilter);

      if (filter.category_id) {
        cursor.where("category_ids", "@>", `${filter.category_id}`);
      }

      if (filter.sales) {
        cursor.whereRaw("sale_price is not null", {});
      }

      if (filter.name) {
        cursor.whereRaw("(lower(name) LIKE ? OR lower(sku) LIKE ?)", [
          `%${filter.name.toLowerCase()}%`,
          `%${filter.name.toLowerCase()}%`
        ]);
      }
    }

    const products = await this.paginateCursor(listCursor, {
      ...options,
      orderFields: [
        { column: "ordering", order: "asc" },
        { column: "created_at", order: "desc" }
      ]
    });

    for (const product of products) {
      this.processSalePrice(product);
    }

    const count = await countCursor
      .count()
      .then((res) => res.length && res[0].count);

    return { products, count };
  }

  async fetchInventory(product: Product) {
    if (product) {
      let inventories = await super.findAll(
        {
          product_id: product.id,
          shop_id: product.shop_id
        },
        "inventory",
        {
          limit: 100
        }
      );

      product.inventories = inventories;
    }
  }

  async fetchVariants(product: Product) {
    if (product) {
      const variants = await super.findAll(
        {
          product_id: product.id,
          shop_id: product.shop_id
        },
        "product_variants",
        {
          limit: 100
        }
      );

      product.variants = (variants || []).map((variant) => ({
        ...variant,
        price: parseInt(variant.price),
        sale_price: variant.sale_price && parseInt(variant.sale_price)
      }));
    }
  }

  async processSalePrice(product: Product) {
    try {
      if (
        product.sale_campaign_id &&
        product.sale_expire_at &&
        moment().isBefore(product.sale_expire_at)
      ) {
        product.sale_price = product.sale_campaign_price;
        product.variants.forEach((variant: any) => {
          variant.sale_price = variant.sale_campaign_price;
        });
      }
    } catch (err: any) {}
  }
}
