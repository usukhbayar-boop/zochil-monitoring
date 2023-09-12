import pick from "lodash/pick";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";
import CustomError from "lib/errors/custom_error";

export default class SaleChannelRequestMonitoringMarketPlaceService extends APIService {
  constructor(db: DBConnection, tableName: string) {
    super(db, tableName);
  }

  async list(user: User, filter: ApiFilter = {}, options: ApiOptions = {}) {
    const thefilter = this._buildFilter(filter, user);
    const { list: requests, totalCount } = await super.findForList(
      thefilter,
      options
    );
    return { data: requests, total: totalCount };
  }

  _buildFilter(filter: ApiFilter, user: User) {
    const theFilter: ApiFilter = {
      ...pick(filter, []),
      sale_channel: [
        "sale_channel_requests.sale_channel = :marketplace_uid",
        { marketplace_uid: `${filter.marketplace_uid}` }
      ]
    };

    if (user.admin_type === "marketplace_admin") {
      theFilter.sale_channel = user.marketplace_uid || "none";
    }

    return theFilter;
  }

  async detail(id: ID, user: User) {
    return { data: await this.getRequest({ request_id: id, user }) };
  }

  async accept({
    request_id,
    merchant_id,
    user
  }: {
    request_id: ID;
    merchant_id: ID;
    user: User;
  }) {
    let request: any;
    let shop: any;

    if (user.admin_type !== "marketplace_admin") {
      throw new CustomError(
        "not a marketplace admin",
        "marketplace admin хандах эрхтэй"
      );
    }
    await this.getRequestAndMerchant({ request_id, merchant_id, user }).then(
      (res) => {
        request = res.request;
        shop = res.shop;
      }
    );

    if (request.status !== "accepted") {
      await super.update(
        { status: "accepted" },
        { id: request.id },
        "sale_channel_requests"
      );
      let sale_channel_arr = [...shop.sale_channels];
      sale_channel_arr.forEach((val, i, arr) => {
        if (val === request.sale_channel) {
          throw new CustomError(
            "Sale channel already created",
            "Sale channel аль хэдийн бүртгэгдсэн байна"
          );
        }
      });
      sale_channel_arr.push(request.sale_channel);
      await super.update(
        { sale_channels: JSON.stringify(sale_channel_arr) },
        { id: merchant_id },
        "shops"
      );

      return { response: "Added marketplace to sale channel" };
    }
    throw new CustomError(
      "Sale channel request already accepted",
      "Sale channel request аль хэдийн зөвшөөрөгдсөн байна"
    );
  }

  async reject({
    merchant_id,
    request_id,
    user
  }: {
    merchant_id: ID;
    request_id: ID;
    user: User;
  }) {
    let request: any;
    let shop: any;
    await this.getRequestAndMerchant({
      merchant_id,
      request_id,
      user
    }).then((response) => {
      request = response.request;
      shop = response.shop;
    });

    if (request.status !== "rejected") {
      await super.update(
        {
          status: "rejected"
        },
        {
          id: request.id
        },
        "sale_channel_requests"
      );
      let sale_channel_array = [...shop.sale_channels];
      sale_channel_array = sale_channel_array.filter((val) => {
        if (val !== request.sale_channel) {
          return val;
        }
      });
      await super.update(
        {
          sale_channels: JSON.stringify(sale_channel_array)
        },
        {
          id: merchant_id
        },
        "shops"
      );
      return { response: "sale channel rejected" };
    }
    throw new CustomError(
      "Sale channel request already rejected",
      "Sale channel request аль хэдийн цуцлагдсан байна"
    );
  }

  async getRequest({ request_id, user }: { request_id: ID; user: User }) {
    const conditions: { [key: string]: any } = { id: request_id };

    if (user.admin_type === "marketplace_admin") {
      conditions.sale_channel = user.marketplace_uid || "none";
    }

    const sale_channel_request = await super.findOneByConditions(conditions);
    if (!sale_channel_request) {
      throw new CustomError(
        "request not found",
        " sale channel request олдсонгүй"
      );
    }

    return { sale_channel_request };
  }

  async getRequestAndMerchant({
    merchant_id,
    request_id,
    user
  }: {
    merchant_id: ID;
    request_id: ID;
    user: User;
  }) {
    const request = await super.findOneByConditions({
      merchant_id,
      id: request_id,
      sale_channel: user.marketplace_uid || "none"
    });

    if (!request) {
      throw new CustomError(
        "Sale channel or shop id or sale channel not found in sale channel requests",
        "Дэлгүүрийн id, sale channel id  болон sale_channel зөрүүтэй байна"
      );
    }

    const shop = await super.findOneByConditions({ id: merchant_id }, "shops");
    if (!shop) {
      throw new CustomError("Shop not found", "Дэлгүүр олдсонгүй");
    }

    return { request, shop };
  }
}
