import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import LookService from "core/looks/service";

import { DBConnection, ID, ApiFilter, ApiOptions } from "core/types";
import _ from "lodash";
import { replaceWithThumbnail } from "lib/utils";

export default class AdminLookService extends LookService {
  constructor(db: DBConnection) {
    super(db);
  }

  async list(filter: ApiFilter = {}, options: ApiOptions = {}) {
    const listCursor = this.connector.db_readonly(this.tableName),
      countCursor = this.connector.db_readonly(this.tableName);

    const theFilter = {
      ...pickBy(pick(filter), (value) => value)
    };

    for (const cursor of [listCursor, countCursor]) {
      cursor.where(theFilter);

      cursor.leftJoin("shops", "shops.id", "looks.shop_id");

      cursor.select(
        "looks.*",
        "shops.name as shop_name",
        "shops.logo as shop_logo",
      );
      cursor.leftJoin("look_saves", "look_saves.look_id", "looks.id");
      cursor.leftJoin("look_likes", "look_likes.look_id", "looks.id");

      cursor.groupBy("looks.id", "shops.id");
      cursor.count("look_saves.id as save_count");
      cursor.count("look_likes.id as like_count");

      if (filter.title) {
        cursor.whereRaw("lower(title) like :title", {
          title: `%${filter.title.toLowerCase()}%`
        });
      }
      if (filter.shop_id) {
        cursor.where({ "looks.shop_id": filter.shop_id });
      }
      if (filter.product_id) {
        cursor.whereRaw(`products @> '[{"id": ${filter.product_id}}]'`);
      }

      if (filter.category_id) {
        cursor.where("category_ids", "@>", `${filter.category_id}`);
      }

      if (filter.gender) {
        cursor.where({ gender: filter.gender });
      }
      if (filter.season) {
        cursor.where({ season: filter.season });
      }
      if (filter.status) {
        cursor.where({ status: filter.status });
      }
    }

    const looks = await this.paginateCursor(listCursor, {
      ...options
    });
    for (const look of looks) {
      look.save_count = parseInt(look.save_count) || 0;
      look.image = replaceWithThumbnail(look.image, "_t500");

      await this._fetchProducts(look);
      await this._fetchLookCategories(look);
    }

    const count = await countCursor.count().then((res) => res.length);

    return { data: looks, total: count };
  }

  async verify(look_id: ID) {
    await super.update(
      { status: "verified", status_changed_at: new Date() },
      { id: look_id }
    );
  }

  async deny(look_id: ID) {
    await super.update(
      { status: "denied", status_changed_at: new Date() },
      { id: look_id }
    );
  }

  async categories(filter: ApiFilter = {}, options: ApiOptions = {}) {
    const listCursor = this.connector.db_readonly("look_categories"),
      countCursor = this.connector.db_readonly("look_categories");

    const theFilter = {
      ...pickBy(pick(filter), (value) => value)
    };

    for (const cursor of [listCursor, countCursor]) {
      cursor.where(theFilter);

      if (filter.name) {
        cursor.whereRaw("lower(name) like :name", {
          name: `%${filter.name.toLowerCase()}%`
        });
      }
    }

    const categories = await this.paginateCursor(listCursor, {
      ...options
    });

    const count = await countCursor
      .count()
      .then((res) => res.length && res[0].count);

    return { data: categories, total: count };
  }

  async categoryDetail(id: ID) {
    const category = await super.findOneByConditions({ id }, "look_categories");
    return { data: category };
  }

  async lookDetail(id: ID) {
    const look = await super.findOneByConditions({ id });
    return { data: look };
  }
}
