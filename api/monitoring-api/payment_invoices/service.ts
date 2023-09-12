import pickBy from "lodash/pickBy";
import moment from "moment";
import pick from "lodash/pick";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, ID } from "core/types";

export default class PaymentInvoiceAdminService extends APIService {
  async list(filter = {}, options: ApiOptions) {
    const { list: invoices, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return { data: invoices, total: totalCount };
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter = pickBy(
      pick(filter, ["shop_id", "account_id", "invoiceno", "status"])
    );

    if (filter.channels) {
      theFilter.channels = [
        `payment_invoices.provider = in(:provider)`,
        {
          provider: filter.channels
        }
      ];
    }

    if (filter.order_code) {
      theFilter.order_code = [
        `payment_invoices.order_code = :order_code`,
        {
          order_code: filter.order_code
        }
      ];
    }

    if (filter.phone) {
      theFilter.phone = [
        `payment_invoices.phone = :phone`,
        {
          phone: filter.phone
        }
      ];
    }

    if (filter.order_id) {
      theFilter.order_id = [
        `payment_requests.order_id = :order_id`,
        {
          order_id: filter.order_id
        }
      ];
    }

    if (filter.shop_id) {
      theFilter.shop_id = [
        `payment_invoices.shop_id = :shop_id`,
        { shop_id: filter.shop_id }
      ];
    }

    if (filter.account_id) {
      theFilter.account_id = [
        `payment_invoices.account_id = :account_id`,
        {
          account_id: filter.account_id
        }
      ];
    }

    if (filter.status) {
      theFilter.status = [
        `payment_invoices.status = :status`,
        {
          status: filter.status
        }
      ];
    }

    if (filter.amount) {
      theFilter.amount = [
        `payment_invoices.amount = :amount`,
        {
          amount: parseInt(filter.amount)
        }
      ];
    }

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `payment_invoices.created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `payment_invoices.created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `payment_invoices.created_at < :end`,
        { end: moment(filter.end).toDate() }
      ];
    }
    return theFilter;
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      fields: [
        "id",
        "order_code",
        "provider",
        "invoiceno",
        "amount",
        "status",
        "shop_id",
        "account_id",
        "order_id",
        "created_at"
      ]
    };
  }

  async detail(id: ID) {
    const invoice = await super.findOne("id", id);
    return { data: invoice };
  }
}
