import axios from "axios";
import excel from "exceljs";
import moment from "moment";
import pickBy from "lodash/pickBy";
import logger from "lib/utils/logger";
import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import { replaceWithThumbnail } from "lib/utils";
import { ApiFilter, ApiOptions, ID } from "core/types";

export default class MerchantAdminService extends APIService {
  async list(filter: ApiFilter, options: ApiOptions = {}) {
    const { list: merchants, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    merchants.forEach((merchant) => {
      if (merchant.logo) {
        merchant.logo = replaceWithThumbnail(merchant.logo, "_t250");
      }
    });

    return {
      data: merchants,
      total: totalCount
    };
  }

  async suggestMerchants(name: string) {
    if (name) {
      const { list: merchants } = await super.findForList(
        {
          name: [
            `(lower(name) like :name OR lower(uid) like :name OR lower(phone) like :name)`,
            { name: `%${name.toLowerCase()}%` }
          ]
        },
        { limit: 100 }
      );

      return { merchants };
    }

    return { merchants: [] };
  }

  async detail(id: ID) {
    const merchant = await super.findOne("id", id);
    if (merchant) {
      merchant.users = await this.connector.db_readonly
        .raw(
          `
        select
          uu.id, uu.first_name, uu.last_name, uu.full_name, uu.phone, uu.created_at
        from users uu
        inner join merchants_users su on su.user_id = uu.id
        where
          su.merchant_id=:merchant_id
      `,
          { merchant_id: id }
        )
        .then((res) => (res || {}).rows || []);

      merchant.payment_methods = await super.findAll(
        { merchant_id: id },
        "payment_methods",
        { limit: 100 }
      );

      merchant.options = await super.findAll(
        { merchant_id: id },
        "merchant_options",
        { limit: 100 }
      );

      merchant.domains = await super.findAll({ merchant_id: id }, "domains", {
        limit: 10
      });

      for (const option of merchant.options) {
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

    return { data: merchant };
  }

  async listNameAndIds() {
    return await this.connector
      .db_readonly(this.tableName)
      .select("name", "id");
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
              "hipay_entity_id",
              "hipay_payment_token",
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
    merchant_id
  }: {
    provider: string;
    bank: string;
    account_number: string;
    account_holder: string;
    merchant_id: ID;
  }) {
    const paymentMethod = await super.findOneByConditions(
      {
        merchant_id,
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
          merchant_id
        },
        "payment_methods"
      );
    }
  }

  async removePaymentMethod(merchant_id: ID, provider: string) {
    await super.removeByConditions(
      {
        merchant_id,
        provider
      },
      "payment_methods"
    );
  }

  async updateMerchant(id: ID, params: any, options: any) {
    const merchant = await super.findOne("id", id);

    if (merchant) {
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

      if (params.theme && merchant.theme !== params.theme) {
        //@TODO - move-to-job
        axios
          .post(`${process.env.JOB_SERVER_URL}/domains/change-theme`, {
            merchant_id: id,
            theme: params.theme
          })
          .then(() => {})
          .catch((error) =>
            logger.error({
              message: error.stack || error.message,
              module_name: "admin-users/invite"
            })
          );
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
    const merchants = await super
      .findForList(this._buildFilter(filter), {
        limit: 1000,
        fields: ["id", "name", "email", "phone", "created_at"]
      })
      .then(({ list }) =>
        list.map((row, index) => ({
          ...row,
          index: index + 1,
          created_at: moment(row.created_at).format("YYYY-MM-DD HH:mm")
        }))
      );

    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("Merchants");

    sheet.columns = [
      { header: "#", key: "index", width: 5 },
      { header: "Нэр", key: "name", width: 30 },
      { header: "Утас", key: "phone", width: 20 },
      { header: "И-Мэйл", key: "email", width: 20 },
      { header: "Огноо", key: "created_at", width: 20 }
    ] as any;

    for (const merchant of merchants) {
      sheet.addRow(merchant);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    //@ts-ignore
    return { data: buffer.toString("base64") };
  }

  async linkUser(merchant_id: ID, phone: string) {
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
        merchant_id,
        user_id: user.id
      },
      "merchants_users"
    );

    if (existing) {
      throw new CustomError("Already linked", "Хэрэглэгч админ байна.");
    }

    await super.insert(
      {
        merchant_id,
        user_id: user.id
      },
      "merchants_users"
    );
  }

  async unlinkUser(merchant_id: ID, user_id: ID) {
    const user = await super.findOne("id", user_id, "users");

    if (!user) {
      throw new CustomError("User not found", "Хэрэглэгч олдсонгүй");
    }

    await super.removeByConditions(
      {
        user_id,
        merchant_id
      },
      "shops_users"
    );
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter: ApiFilter = {
      merchant_type: "merchant"
    };

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

    return theFilter;
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      limit: 50,
      fields: ["id", "logo", "name", "phone", "status", "created_at"]
    };
  }
}
