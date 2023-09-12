import excel from "exceljs";
import moment from "moment";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import { replaceWithThumbnail } from "lib/utils";
import { resolveAndCheckIP } from "lib/utils/dns";
import { ApiFilter, ApiOptions, ID } from "core/types";

export default class ShopAdminService extends APIService {
  async list(filter: ApiFilter, options: ApiOptions = {}) {
    const { list: shops, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    shops.forEach((shop) => {
      if (shop.logo) {
        shop.logo = replaceWithThumbnail(shop.logo, "_t250");
      }

      if (shop.expire_at) {
        shop.expired = moment().isAfter(shop.expire_at);
      }
    });

    return {
      data: shops,
      total: totalCount
    };
  }

  async suggestShops(name: string) {
    if (name) {
      const { list: shops } = await super.findForList(
        {
          is_subscribed: true,
          name: [
            `(lower(name) like :name OR lower(uid) like :name OR lower(phone) like :name)`,
            { name: `%${name.toLowerCase()}%` }
          ]
        },
        { limit: 100 }
      );

      return { data: shops };
    }

    return { data: [] };
  }

  async detail(id: ID) {
    const shop = await super.findOne("id", id);
    if (shop) {
      if (typeof shop.sale_channels === "string") {
        try {
          shop.sale_channels = JSON.parse(shop.sale_channels);
        } catch (err: any) {}
      }

      shop.users = await this.connector.db_readonly
        .raw(
          `
        select
          uu.id, uu.first_name, uu.last_name, uu.full_name, uu.phone, uu.created_at
        from users uu
        inner join shops_users su on su.user_id = uu.id
        where
          su.shop_id=:shop_id
      `,
          { shop_id: id }
        )
        .then((res) => (res || {}).rows || []);

      shop.payment_methods = await super.findAll(
        { shop_id: id },
        "payment_methods",
        { limit: 100 }
      );

      shop.options = await super.findAll(
        { merchant_id: id },
        "merchant_options",
        { limit: 100 }
      );

      shop.domains = await super.findAll({ merchant_id: id }, "domains", {
        limit: 10
      });

      for (const option of shop.options) {
        if (option.sensitive) {
          option.value = "*******";
        }

        if (option.is_json) {
          try {
            option.value = JSON.parse(option.value);
          } catch (err: any) {}
        }
      }
    }

    return { data: shop };
  }

  async listNameAndIds() {
    return await this.connector
      .db_readonly(this.tableName)
      .select("name", "id");
  }

  async suspend(id: ID) {
    await super.update(
      {
        is_subscribed: false
      },
      { id }
    );
  }

  async activate(id: ID) {
    await super.update(
      {
        is_subscribed: true
      },
      { id }
    );
  }

  async addOption({
    key,
    value,
    merchant_id
  }: {
    key: string;
    value: string;
    merchant_id: ID;
  }) {
    const option = await super.findOneByConditions(
      {
        merchant_id,
        key
      },
      "merchant_options"
    );

    if (!option) {
      await super.insert(
        {
          key,
          value,
          sensitive:
            [
              "storepay_id",
              "chatbot_token",
              "storepay_username",
              "storepay_password",
              "monpay_client_id",
              "golomt_hmac_key",
              "monpay_client_secret",
              "monpay_payment_token",
              "monpay_client_id",
              "monpay_client_secret",
              "monpay_payment_token",
              "card_payment_token",
              "hipay_client_id",
              "hipay_client_secret",
              "socialpay_payment_token"
            ].indexOf(key) > -1,
          is_json: ["enabled_delivery_companies"].indexOf(key) > -1,
          merchant_id
        },
        "merchant_options"
      );
    }
  }

  async removeOption(merchant_id: ID, key: string) {
    await super.removeByConditions(
      {
        merchant_id,
        key
      },
      "merchant_options"
    );
  }

  async addPaymentMethod({
    provider,
    bank,
    account_number,
    account_holder,
    shop_id
  }: {
    provider: string;
    bank: string;
    account_number: string;
    account_holder: string;
    shop_id: ID;
  }) {
    const paymentMethod = await super.findOneByConditions(
      {
        shop_id,
        provider
      },
      "payment_methods"
    );

    if (!paymentMethod) {
      await super.insert(
        {
          provider,
          bank,
          account_number,
          account_holder,
          shop_id
        },
        "payment_methods"
      );
    }
  }

  async removePaymentMethod(shop_id: ID, provider: string) {
    await super.removeByConditions(
      {
        shop_id,
        provider
      },
      "payment_methods"
    );
  }

  async archive(id: ID) {
    const shop = await super.findOneByConditions({ id });

    if (shop && !shop.is_subscribed && shop.status === "enabled") {
      await super.update(
        {
          status: "archived",
          name: `[ ARCHIVED ] ${shop.name}`
        },
        { id }
      );
    }
  }

  async updateShop(id: ID, params: any, options: any) {
    const shop = await super.findOne("id", id);

    if (shop) {
      const values = pickBy(params, (v) => v);
      await super.update(values, { id });

      for (const option in options) {
        if (options[option] !== undefined) {
          await this.removeOption(id, option);
          if (options[option]) {
            await this.addOption({
              merchant_id: id,
              key: option,
              value: options[option]
            });
          }
        }
      }

      if (params.theme && shop.theme !== params.theme) {
        const domain = shop.custom_domain || `${shop.uid}.zochil.shop`;
        const existing = await super.findOneByConditions({ name: domain }, "domains");
        if (!existing) {
          const ip_valid = await resolveAndCheckIP(domain);
          await super.insert({
            ip_valid,
            name: domain,
            theme: params.theme,
            merchant_id: shop.id,
          }, "domains");
        } else {
          await super.update({
            configured: false,
            status: "pending",
          }, {
            id : existing.id
          }, "domains");
        }
      }
    }
  }

  async listCategories() {
    const categories = await super.findAll({}, "merchant_categories", {
      limit: 100,
      orderFields: [
        {
          column: "ordering",
          order: "asc"
        },
        {
          column: "created_at",
          order: "desc"
        }
      ]
    });

    return { categories };
  }

  async exportAsXLSX(filter: ApiFilter) {
    const shops = await super
      .findForList(this._buildFilter(filter), {
        limit: 1000,
        fields: [
          "id",
          "uid",
          "name",
          "email",
          "phone",
          "created_at",
          "custom_domain"
        ]
      })
      .then(({ list }) =>
        list.map((row, index) => ({
          ...row,
          index: index + 1,
          domain: `${row.uid}.zochil.shop`,
          created_at: moment(row.created_at).format("YYYY-MM-DD HH:mm")
        }))
      );

    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("Shops");

    sheet.columns = [
      { header: "#", key: "index", width: 5 },
      { header: "Нэр", key: "name", width: 30 },
      { header: "Утас", key: "phone", width: 20 },
      { header: "И-Мэйл", key: "email", width: 20 },
      { header: "Домайн", key: "domain", width: 30 },
      { header: "Огноо", key: "created_at", width: 20 }
    ] as any;

    for (const shop of shops) {
      sheet.addRow(shop);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    //@ts-ignore
    return { data: buffer.toString("base64") };
  }

  async resetFBDemo() {
    const demoShop = await super.findOneByConditions({ uid: "evemongoliamn" });
    if (demoShop && demoShop.id) {
      await super.removeByConditions({ shop_id: demoShop.id }, "posts");
      await super.removeByConditions({ shop_id: demoShop.id }, "banners");
      await super.removeByConditions({ shop_id: demoShop.id }, "inventory");
      await super.removeByConditions(
        { shop_id: demoShop.id },
        "product_options"
      );
      await super.removeByConditions(
        { shop_id: demoShop.id },
        "product_variants"
      );
      await super.removeByConditions({ shop_id: demoShop.id }, "products");
      await super.removeByConditions(
        { shop_id: demoShop.id },
        "product_categories"
      );
      await super.removeByConditions({ shop_id: demoShop.id }, "shops_users");
      await super.removeByConditions({ id: demoShop.id }, "shops");
    }
  }

  async linkUser(shop_id: ID, phone: string) {
    const user = await super.findOne("phone", phone, "users");

    if (!user) {
      throw new CustomError("User not found", "Хэрэглэгч олдсонгүй");
    }

    if (!user.is_verified || !user.hashed_password) {
      throw new CustomError(
        "User not found",
        "Баталгаажуугүй эсвэл нууц үггүй хэрэглэгч байна"
      );
    }

    const existing = await super.findOneByConditions(
      {
        shop_id,
        user_id: user.id
      },
      "shops_users"
    );

    if (existing) {
      throw new CustomError("Already linked", "Хэрэглэгч админ байна.");
    }

    await super.insert(
      {
        shop_id,
        user_id: user.id
      },
      "shops_users"
    );
  }

  async unlinkUser(shop_id: ID, user_id: ID) {
    const user = await super.findOne("id", user_id, "users");

    if (!user) {
      throw new CustomError("User not found", "Хэрэглэгч олдсонгүй");
    }

    await super.removeByConditions(
      {
        user_id,
        shop_id
      },
      "shops_users"
    );
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter: ApiFilter = {
      merchant_type: "shop"
    };

    if (filter.status) {
      if (filter.status === "active") {
        theFilter.is_subscribed = true;
      } else if (filter.status === "trial") {
        theFilter.status = [
          `is_subscribed=false and expire_at >= :now`,
          { now: new Date() }
        ];
      } else if (filter.status === "inactive") {
        theFilter.status = [
          `is_subscribed=false and expire_at < :now`,
          { now: new Date() }
        ];
      }
    }

    if (filter.name) {
      theFilter.name = [
        `lower(name) like :name OR uid like :name`,
        { name: `%${filter.name.toLowerCase()}%` }
      ];
    }

    if (filter.phone) {
      theFilter.phone = [
        `lower(phone) like :phone`,
        { phone: `%${filter.phone.toLowerCase()}%` }
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

    if (filter.order_range) {
      theFilter.order_range = [
        `order_count between :order_min and :order_max`,
        {
          order_min: parseInt(filter.order_range.split("-")[0], 10),
          order_max: parseInt(filter.order_range.split("-")[1], 10)
        }
      ];
    }

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `created_at between :start and :end`,
        {
          end: moment(filter.end).endOf("day").toDate(),
          start: moment(filter.start).startOf("day").toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `created_at > :start`,
        { start: moment(filter.start).startOf("day").toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `created_at < :end`,
        { end: moment(filter.end).endOf("day").toDate() }
      ];
    }

    if (filter.expire_start && filter.expire_end) {
      theFilter.expire_range = [
        `expire_at between :expire_start and :expire_end`,
        {
          expire_end: moment(filter.expire_end).endOf("day").toDate(),
          expire_start: moment(filter.expire_start).startOf("day").toDate()
        }
      ];
    } else if (filter.expire_start) {
      theFilter.expire_range = [
        `expire_at > :start`,
        { start: moment(filter.expire_start).startOf("day").toDate() }
      ];
    } else if (filter.expire_end) {
      theFilter.expire_range = [
        `expire_at < :end`,
        { end: moment(filter.expire_end).endOf("day").toDate() }
      ];
    }

    if (filter.channels) {
      theFilter.sale_channels = [
        `sale_channels @> '[${filter.channels}]'::jsonb`,
        {}
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
        "uid",
        "logo",
        "name",
        "phone",
        "status",
        "expire_at",
        "created_at",
        "is_subscribed",
        "custom_domain",
        "ranking",
        "category_codes",
        "sale_channels"
      ]
    };
  }
}
