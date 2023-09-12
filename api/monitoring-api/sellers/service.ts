import excel from "exceljs";
import moment from "moment";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import { ApiFilter, ApiOptions, ID } from "core/types";

export default class SellerAdminService extends APIService {
  async list(filter: ApiFilter, options: ApiOptions = {}) {
    const { list: sellers, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return {
      data: sellers,
      total: totalCount
    };
  }

  async suggestSellers(name: string) {
    if (name) {
      const { list: sellers } = await super.findForList(
        {
          is_subscribed: true,
          name: [
            `(lower(name) like :name OR lower(phone) like :name)`,
            { name: `%${name.toLowerCase()}%` }
          ]
        },
        { limit: 100 }
      );

      return { sellers };
    }

    return { sellers: [] };
  }

  async detail(id: ID) {
    const seller = await super.findOne("id", id);
    if (seller) {
      seller.users = await this.connector.db_readonly
        .raw(
          `
        select
          uu.id, uu.first_name, uu.last_name, uu.full_name, uu.phone, uu.created_at
        from users uu
        inner join sellers_users su on su.user_id = uu.id
        where
          su.seller_id=:seller_id
      `,
          { seller_id: id }
        )
        .then((res) => (res || {}).rows || []);
    }

    return { data: seller };
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

  async archive(id: ID) {
    const seller = await super.findOneByConditions({ id });

    if (seller && !seller.is_subscribed && seller.status === "enabled") {
      await super.update(
        {
          status: "archived",
          name: `[ ARCHIVED ] ${seller.name}`
        },
        { id }
      );
    }
  }

  async updateSeller(id: ID, params: any) {
    const seller = await super.findOne("id", id);

    if (seller) {
      const values = pickBy(params, (v) => v);
      await super.update(values, { id });
    }
  }

  async exportAsXLSX(filter: ApiFilter) {
    const sellers = await super
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
    const sheet = workbook.addWorksheet("Sellers");

    sheet.columns = [
      { header: "#", key: "index", width: 5 },
      { header: "Нэр", key: "name", width: 30 },
      { header: "Утас", key: "phone", width: 20 },
      { header: "И-Мэйл", key: "email", width: 20 },
      { header: "Огноо", key: "created_at", width: 20 }
    ] as any;

    for (const seller of sellers) {
      sheet.addRow(seller);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    //@ts-ignore
    return { data: buffer.toString("base64") };
  }

  async linkUser(seller_id: ID, phone: string) {
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
        seller_id,
        user_id: user.id
      },
      "sellers_users"
    );

    if (existing) {
      throw new CustomError("Already linked", "Хэрэглэгч админ байна.");
    }

    await super.insert(
      {
        seller_id,
        user_id: user.id
      },
      "sellers_users"
    );
  }

  async unlinkUser(seller_id: ID, user_id: ID) {
    const user = await super.findOne("id", user_id, "users");

    if (!user) {
      throw new CustomError("User not found", "Хэрэглэгч олдсонгүй");
    }

    await super.removeByConditions(
      {
        user_id,
        seller_id
      },
      "sellers_users"
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
        `lower(name) like :name`,
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
      fields: ["id", "profile", "name", "phone", "status", "created_at"]
    };
  }

  async verify(id: ID) {
    await super.update(
      {
        identity: "verified"
      },
      { id }
    );
  }
}
