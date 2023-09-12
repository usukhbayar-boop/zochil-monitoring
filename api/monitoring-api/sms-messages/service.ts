import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions } from "core/types";

export default class SmsMessagesAdminService extends APIService {
  async list(filter: ApiFilter, options: ApiOptions = {}) {
    const theFilter: ApiFilter = pickBy(
      {
        phone: filter.phone,
        mechant_id: filter.merchant_id
      },
      (v) => v
    );

    if (filter.message) {
      theFilter.message = [
        "lower(sms_messages.message) like :message",
        { message: `%${filter.message}%`.toLowerCase() }
      ];
    }

    const { list: messages, totalCount } = await super.findForList(theFilter, {
      fields: [
        "sms_messages.id",
        "sms_messages.phone",
        "sms_messages.shop_id",
        "shops.name"
      ],
      page: options.page,
      joins: [["innerJoin", "shops", "sms_messages.shop_id", "shops.id"]],
      sortField: "sms_messages.created_at"
    });

    return { data: messages, total: totalCount };
  }

  async listByMerchant() {
    const data = await this.connector.db_readonly
      .raw(
        `
        select sm.*, ss.name from (
          select count(id) as total_count, shop_id from sms_messages group by shop_id
        ) sm
        left join shops ss on ss.id = sm.shop_id
        where ss.status <> 'archived'
      `
      )
      .then((res) => (res || {}).rows || []);
    return { data };
  }
}
