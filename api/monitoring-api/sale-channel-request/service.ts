import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import { DBConnection, ID, ApiFilter, ApiOptions } from "core/types";

export default class SaleChannelRequestMonitoringService extends APIService {
  constructor(db: DBConnection) {
    super(db, "sale_channel_requests");
  }

  async list(filter: ApiFilter = {}, options: ApiOptions = {}) {
    const { list: requests, totalCount } = await super.findForList(
      filter,
      options
    );
    return { data: requests, total: totalCount };
  }

  async detailShop({ shop_id }: { shop_id: ID }) {
    const sale_channel_request = await super.findAll({ shop_id: shop_id });
    if (!sale_channel_request) {
      throw new Error("Sale channel request not found");
    }
    return { data: sale_channel_request };
  }

  async detail({ id }: { id: ID }) {
    const sale_channel_request = await super.findOne("id", id);

    if (!sale_channel_request) {
      return { sale_channel_request: null };
    }
    return { data: sale_channel_request };
  }

  async updateSaleChannelRequestByName({
    shop_id,
    status,
    sale_channel
  }: {
    shop_id: ID;
    status: string;
    sale_channel: ID;
  }) {
    const sale_channel_requests = await super.findAll({
      shop_id: shop_id,
      sale_channel: sale_channel
    });
    // console.log(sale_channel_requests);

    const shop = await super.findOneByConditions({ id: shop_id }, "shops");

    if (!sale_channel_requests) {
      throw new CustomError(
        "Sale channel or shop id not found in sale channel requests",
        "Дэлгүүрийн id болон sale channel id зөрүүтэй байна"
      );
    }

    if (!shop) {
      throw new CustomError("Shop not found", "Дэлгүүр олдсонгүй");
    }

    sale_channel_requests.forEach(async (val, ind, arr) => {
      await super.update({ status: status }, { id: val.id });
    });

    if (status === "accepted") {
      let sale_channel_arr = [...shop.sale_channels];

      sale_channel_arr.forEach((val, ind, arr) => {
        if (val === sale_channel) {
          throw new CustomError(
            "Sale channel already created",
            "Sale channel аль хэдийн бүртгэгдсэн байна"
          );
        }
      });

      sale_channel_arr.push(sale_channel);

      await super.update(
        { sale_channels: JSON.stringify(sale_channel_arr) },
        { id: shop_id },
        "shops"
      );

      return { response: "Added marketplace to sale channel" };
    } else if (status === "rejected") {
      let sale_channel_arr = [...shop.sale_channels];

      sale_channel_arr = sale_channel_arr.filter((val) => {
        if (val !== sale_channel) {
          return val;
        }
      });

      await super.update(
        { sale_channels: JSON.stringify(sale_channel_arr) },
        { id: shop_id },
        "shops"
      );
      return { response: "Sale channel rejected" };
    }

    return { response: "Status has changed" };
  }

  async updateSaleChannelRequest({
    shop_id,
    status,
    sale_channel,
    sale_channel_request_id
  }: {
    shop_id: ID;
    status: string;
    sale_channel: string;
    sale_channel_request_id: ID;
  }) {
    const sale_channel_request = await super.findOneByConditions({
      merchant_id: shop_id,
      id: sale_channel_request_id
    });

    if (sale_channel !== sale_channel_request.sale_channel) {
      throw new CustomError(
        "Sale channel did not match request",
        "Sale channel хүсэлт зөвшөөрөх sale channel-тэй таарахгүй байна"
      );
    }

    const shop = await super.findOneByConditions({ id: shop_id }, "shops");

    if (!sale_channel_request) {
      throw new CustomError(
        "Sale channel or shop id not found in sale channel requests",
        "Дэлгүүрийн id болон sale channel id зөрүүтэй байна"
      );
    }

    if (!shop) {
      throw new CustomError("Shop not found", "Дэлгүүр олдсонгүй");
    }

    await super.update({ status: status }, { id: sale_channel_request.id });

    if (status === "accepted") {
      let sale_channel_arr = [...shop.sale_channels];

      sale_channel_arr.forEach((val, ind, arr) => {
        if (val === sale_channel) {
          throw new CustomError(
            "Sale channel already created",
            "Sale channel аль хэдийн бүртгэгдсэн байна"
          );
        }
      });

      sale_channel_arr.push(sale_channel);

      await super.update(
        { sale_channels: JSON.stringify(sale_channel_arr) },
        { id: shop_id },
        "shops"
      );

      return { response: "Added marketplace to sale channel" };
    } else if (status === "rejected") {
      let sale_channel_arr = [...shop.sale_channels];

      sale_channel_arr = sale_channel_arr.filter((val) => {
        if (val !== sale_channel) {
          return val;
        }
      });

      await super.update(
        { sale_channels: JSON.stringify(sale_channel_arr) },
        { id: shop_id },
        "shops"
      );
      return { response: "Sale channel rejected" };
    }

    return { response: "Status has changed" };
  }

  async getRequestAndMerchant({
    merchant_id,
    request_id
  }: {
    merchant_id: ID;
    request_id: ID;
  }) {
    const request = await super.findOneByConditions(
      { merchant_id, id: request_id },
      "sale_channel_requests"
    );

    if (!request) {
      throw new CustomError(
        "Sale channel or shop id not found in sale channel requests",
        "Дэлгүүрийн id болон sale channel id зөрүүтэй байна"
      );
    }

    const shop = await super.findOneByConditions({ id: merchant_id }, "shops");

    if (!shop) {
      throw new CustomError("Shop not found", "Дэлгүүр олдсонгүй");
    }
    return { request, shop };
  }

  async accept({
    merchant_id,
    request_id
  }: {
    merchant_id: ID;
    request_id: ID;
  }) {
    let request: any;
    let shop: any;
    await this.getRequestAndMerchant({ merchant_id, request_id }).then(
      (res) => {
        request = res.request;
        shop = res.shop;
      }
    );

    if (request.status === "accepted") {
      throw new CustomError(
        "Sale channel request already accepted",
        "Sale channel request аль хэдийн зөвшөөрөгдсөн байна"
      );
    }
    await super.update(
      { status: "accepted" },
      { id: request.id },
      "sale_channel_requests"
    );
    let sale_channel_arr = [...shop.sale_channels];

    sale_channel_arr.forEach((val, ind, arr) => {
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

  async reject({
    merchant_id,
    request_id
  }: {
    merchant_id: ID;
    request_id: ID;
  }) {
    let request: any;
    let shop: any;
    await this.getRequestAndMerchant({ merchant_id, request_id }).then(
      (res) => {
        request = res.request;
        shop = res.shop;
      }
    );

    if (request.status === "rejected") {
      throw new CustomError(
        "Sale channel request already rejected",
        "Sale channel request аль хэдийн цуцлагдсан байна"
      );
    }
    await super.update(
      { status: "rejected" },
      { id: request.id },
      "sale_channel_requests"
    );

    let sale_channel_arr = [...shop.sale_channels];

    sale_channel_arr = sale_channel_arr.filter((val) => {
      if (val !== request.sale_channel) {
        return val;
      }
    });

    await super.update(
      { sale_channels: JSON.stringify(sale_channel_arr) },
      { id: merchant_id },
      "shops"
    );
    return { response: "Sale channel rejected" };
  }
}
