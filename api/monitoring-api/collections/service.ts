import APIService from "core/base/service";
import MerchantService from "core/merchants/service";
import TransactionService from "core/transaction/service";
import { DBConnection, ID, ApiFilter, ApiOptions } from "core/types";
import CustomError from "lib/errors/custom_error";

export default class ContractService extends APIService {
  _transactionService: TransactionService;
  _merchantService: MerchantService;

  constructor(db: DBConnection) {
    super(db, "collections");
    this._transactionService = new TransactionService(db);
    this._merchantService = new MerchantService(db, "shops");
  }

  async create({
    name,
    shop_id,
    sale_channels,
    description,
    image,
    image_horizontal,
    image_vertical,
    criteria,
    show_on_home,
    scope,
    expire_at,
    theme
  }: {
    name: string;
    shop_id?: ID;
    sale_channels: any[];
    description: string;
    image: string;
    image_horizontal: string;
    image_vertical: string;
    criteria: any[];
    show_on_home: boolean;
    scope: string;
    expire_at: Date;
    theme: string;
  }) {
    const trx = await this.connector.db.transaction();

    try {
      const id = await trx(this.tableName)
        .insert({
          name,
          collection_type: shop_id ? "shop" : "marketplace",
          shop_id,
          sale_channels: JSON.stringify(sale_channels || []),
          description,
          image,
          image_horizontal,
          image_vertical,
          criteria: JSON.stringify(criteria),
          show_on_home,
          scope,
          expire_at,
          theme
        })
        .returning("id")
        .then((result) => result[0]);

      const result = await this.processCriteria(trx, {
        id,
        shop_id,
        criteria
      });

      if (result > 0) {
        await trx.commit();
      } else {
        await trx.rollback();
      }
    } catch (error: any) {
      await trx.rollback();
      throw error;
    }
  }

  async update({
    id,
    name,
    shop_id,
    sale_channels,
    description,
    image,
    image_horizontal,
    image_vertical,
    criteria,
    show_on_home,
    scope,
    expire_at,
    theme
  }: {
    id: ID;
    name: string;
    shop_id?: ID;
    sale_channels: any[];
    description: string;
    image: string;
    image_horizontal: string;
    image_vertical: string;
    criteria: any[];
    show_on_home: boolean;
    scope: string;
    expire_at: Date;
    theme: string;
  }) {
    const collection = await super.findOne("id", id);
    if (!collection) {
      throw new CustomError("Not found collection", "Not found collection");
    }

    const trx = await this.connector.db.transaction();

    try {
      await trx(this.tableName)
        .update({
          name,
          collection_type: shop_id ? "shop" : "marketplace",
          shop_id,
          sale_channels: JSON.stringify(sale_channels || []),
          description,
          image,
          image_horizontal,
          image_vertical,
          criteria: JSON.stringify(criteria),
          show_on_home,
          scope,
          expire_at,
          theme
        })
        .where({ id, shop_id });
      if (collection.status === "enabled") {
        const result = await this.processCriteria(trx, {
          id,
          shop_id,
          criteria
        });

        if (result > 0) {
          await trx.commit();
        } else {
          await trx.rollback();
        }
      } else {
        await trx.commit();
      }
    } catch (error: any) {
      await trx.rollback();
      throw error;
    }
  }

  async remove(id: ID) {
    const collection = await super.findOne("id", id);
    if (!collection) {
      throw new CustomError("Not found collection", "Not found collection");
    }

    const trx = await this.connector.db.transaction();

    try {
      await this._unsetProductsCollections(trx, {
        id
      });
      await super.removeByConditions({ id });
      await trx.commit();
    } catch (error: any) {
      await trx.rollback();
      throw error;
    }
  }

  async enable(id: ID) {
    const collection = await super.findOneByConditions({ id });
    if (!collection) {
      throw new CustomError("Not found collection", "Not found collection");
    }
    if (collection) {
      const trx = await this.connector.db.transaction();
      try {
        const result = await this.processCriteria(trx, {
          id,
          criteria: collection.criteria
        });

        await trx(this.tableName).where({ id }).update({ status: "enabled" });

        if (result > 0) {
          await trx.commit();
        } else {
          await trx.rollback();
        }
      } catch (err: any) {
        await trx.rollback();
        throw err;
      }
    }
  }

  async disable(id: ID) {
    const collection = await super.findOne("id", id);
    if (!collection) {
      throw new CustomError("Not found collection", "Not found collection");
    }

    const trx = await this.connector.db.transaction();

    try {
      await this._unsetProductsCollections(trx, {
        id
      });
      await super.update({ status: "disabled" }, { id });
      await trx.commit();
    } catch (error: any) {
      await trx.rollback();
      throw error;
    }
  }

  async status({ id }: { id: ID }) {
    const collection = await super.findOne("id", id);

    if (!collection) {
      throw new CustomError("Not found collection", "Not found collection");
    }

    return {
      collection: collection
    };
  }

  async list(filter: ApiFilter, options: ApiOptions = {}) {
    const { list: collections, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return {
      data: collections,
      total: totalCount
    };
  }

  async findById(id: ID) {
    const collection = await super.findOneByConditions({
      id
    });

    if (!collection) {
      throw new CustomError("Not found collection", "Not found collection");
    }

    const { products, totalCount } = await this.productList(id, { limit: 8 });

    return { collection, products, totalCount };
  }

  async productList(id: ID, options: ApiOptions = {}) {
    if (!options.limit) {
      options.limit = 20;
    }
    if (!options.page) {
      options.page = 1;
    }
    const collection = await super.findOneByConditions({
      id
    });
    if (!collection) {
      throw new CustomError("Not found collection", "Not found collection");
    }
    let ids = collection.criteria
      .filter((c: any) => c.product_id)
      .map((c: any) => c.product_id);
    let compareField = "id";
    if (collection.scope == "category") {
      ids = collection.criteria
        .filter((c: any) => c.category_id)
        .map((c: any) => c.category_id);
      compareField = "category_id";
    }

    const total: any = await this.connector
      .db_readonly("products")
      .count()
      .whereIn(compareField, ids);

    const products = await this.connector
      .db_readonly("products")
      .select(["id", "name", "images", "sale_price", "price"])
      .whereIn(compareField, ids)
      .limit(options.limit)
      .offset(options.limit * (options.page - 1));
    return {
      products,
      totalCount: total[0].count
    };
  }

  async processCriteria(
    trx: any,
    {
      id,
      shop_id,
      criteria
    }: {
      id: ID;
      shop_id?: ID;
      criteria: any[];
    }
  ) {
    let createdCount = 0;
    await this._unsetProductsCollections(trx, {
      id,
      shop_id
    });

    if (criteria && criteria.length === 1 && criteria[0].all === true) {
      await this._updateProductsCollections(trx, {
        id,
        shop_id
      });

      return 1;
    }

    if (Array.isArray(criteria)) {
      for (const { product_id } of criteria.filter(
        (c) => !c.category_id && c.product_id
      )) {
        await this._updateProductsCollections(trx, {
          id,
          shop_id,
          product_id
        });

        createdCount += 1;
      }

      for (const { category_id } of criteria.filter(
        (c) => c.category_id && !c.product_id
      )) {
        await this._updateProductsCollections(trx, {
          id,
          shop_id,
          category_id
        });

        createdCount += 1;
      }
    }

    return createdCount;
  }

  async _updateProductsCollections(
    trx: any,
    {
      id,
      shop_id,
      category_id,
      product_id
    }: {
      id: ID;
      shop_id?: ID;
      category_id?: ID;
      product_id?: ID;
    }
  ) {
    const params = {
      id,
      shop_id,
      product_id,
      category_id: `${category_id}`
    };
    await trx.raw(
      `
      update products
        set
          collection_ids = (
            CASE
                WHEN collection_ids IS NULL THEN '["${id}"]'::JSONB
                WHEN not collection_ids::jsonb @> '["${id}"]' THEN collection_ids || '["${id}"]'::JSONB
                ELSE collection_ids
            END)
      where
        status = 'enabled'
        ${!shop_id ? "" : `\nand shop_id = :shop_id`}
        ${!product_id ? "" : `\nand id = :product_id`}
        ${!category_id ? "" : `\nand category_ids @> :category_id`} \
    `,
      params
    );
  }

  async _unsetProductsCollections(
    trx: any,
    {
      id,
      shop_id
    }: {
      id: ID;
      shop_id?: ID;
    }
  ) {
    const params = {
      id,
      shop_id
    };
    await trx.raw(
      `
      update products
        set
          collection_ids = collection_ids - '${id}'
      where
        collection_ids::jsonb @> '["${id}"]'
        ${!shop_id ? "" : `\nand shop_id = :shop_id`}
    `,
      params
    );
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter: ApiFilter = {};

    if (filter.status) {
      theFilter.status = filter.status;
    }

    if (filter.name) {
      theFilter.name = [
        `lower(name) like :name OR uid like :name`,
        { name: `%${filter.name.toLowerCase()}%` }
      ];
    }

    if (filter.channels) {
      theFilter.sale_channels = [
        `sale_channels @> '[${filter.channels}]'::jsonb`,
        {}
      ];
    }

    if (filter.product_range) {
      theFilter.product_range = [
        `product_count between :product_min and :product_max`,
        {
          product_min: parseInt(filter.product_range.split("-")[0], 10),
          product_max: parseInt(filter.product_range.split("-")[1], 10)
        }
      ];
    }

    if (filter.category_codes) {
      theFilter.category_codes = [
        `category_codes @> '[${filter.category_codes}]'::jsonb`,
        {}
      ];
    }

    return theFilter;
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      limit: 50,
      fields: [
        "id",
        "name",
        "status",
        "collection_type",
        "shop_id",
        "sale_channels",
        "description",
        "image",
        "criteria",
        "scope",
        "show_on_home",
        "created_at",
        "theme",
        "image_horizontal",
        "image_vertical"
      ]
    };
  }
}
