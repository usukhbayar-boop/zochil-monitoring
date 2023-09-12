import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import type { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";

export default class MonitorExpoService extends APIService {
  constructor(db: DBConnection) {
    super(db, "expo");
  }

  async list(_: User, __: ApiFilter, options: ApiOptions) {
    const { list: data, totalCount: total } = await super.findForList(
      {},
      options
    );

    const looksCounts = await this.connector
      .db("expo_looks")
      .select("expo_id")
      .count("id")
      .whereIn(
        "expo_id",
        data.map((expo: any) => expo.id)
      )
      .groupBy("expo_id");

    const productsCounts = await this.connector
      .db("expo_products")
      .select("expo_id")
      .count("id")
      .whereIn(
        "expo_id",
        data.map((expo: any) => expo.id)
      )
      .groupBy("expo_id");

    for (const expo of data) {
      expo.look_count = parseInt(
        `${looksCounts.find((lk) => lk.expo_id === expo.id)?.count || "0"}`,
        10
      );
      expo.product_count = parseInt(
        `${productsCounts.find((lk) => lk.expo_id === expo.id)?.count || "0"}`,
        10
      );
    }

    return { data, total };
  }

  async detail(_: User, id: ID) {
    const expo = await super.findOne("id", id);

    if (!expo) {
      throw new CustomError("expo not found", "expo not found");
    }

    const { list: products } = await super.findForList(
      {
        expo_id: expo.id,
        product_id: [`products.status = 'enabled'`, {}]
      },
      {
        fields: [
          "products.id",
          "products.name",
          "shops.id as shop_id",
          "shops.name as shop_name",
          "shops.uid as shop_uid",
          "products.id as product_id",
          "shops.logo as shop_logo",
          "products.images",
          "products.category_id",
          "products.short_description",
          "products.price",
          "products.sale_price",
          "products.created_at"
        ],
        joins: [
          ["leftJoin", "shops", "shops.id", "expo_products.merchant_id"],
          ["leftJoin", "products", "products.id", "expo_products.product_id"]
        ],
        sortField: "expo_products.created_at",
        sortDirection: "desc"
      },
      "expo_products"
    );

    const { list: looks } = await super.findForList(
      {
        expo_id: expo.id,
        look_id: [`looks.status = 'verified'`, {}]
      },
      {
        fields: [
          "looks.id",
          "looks.id as look_id",
          "looks.title",
          "shops.name as shop_name",
          "shops.id as shop_id",
          "shops.uid as shop_uid",
          "shops.logo as shop_logo",
          "looks.image",
          "looks.description",
          "looks.age",
          "looks.gender",
          "looks.season",
          "looks.created_at"
        ],
        joins: [
          ["leftJoin", "shops", "shops.id", "expo_looks.merchant_id"],
          ["leftJoin", "looks", "looks.id", "expo_looks.look_id"]
        ],
        sortField: "expo_looks.created_at",
        sortDirection: "desc"
      },
      "expo_looks"
    );

    return { data: { expo, products, looks } };
  }

  async update({
    id,
    name,
    image,
    description,
    short_description,
    start_at,
    end_at
  }: {
    id: ID;
    name: string;
    description: string;
    short_description: string;
    image: string;
    start_at: string;
    end_at: string;
  }) {
    const expo = await super.findOne("id", id);
    if (!expo) {
      throw new Error(expo);
    }

    await super.update(
      {
        id,
        name,
        image,
        description,
        short_description,
        start_at,
        end_at
      },
      { id }
    );
  }

  async archiveToggle({ id }: { id: ID }) {
    const expo = await super.findOne("id", id);
    if (!expo) {
      throw new Error(expo);
    }

    await super.update(
      {
        id,
        is_enabled: !expo.is_enabled
      },
      { id }
    );
  }

  async create({
    name,
    image,
    description,
    short_description,
    start_at,
    end_at
  }: {
    name: string;
    description: string;
    short_description: string;
    image: string;
    start_at: string;
    end_at: string;
  }) {
    const id = await super.insert({
      name,
      image,
      description,
      short_description,
      start_at,
      end_at
    });

    return { id };
  }
}
