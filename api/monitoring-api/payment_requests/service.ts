import moment from "moment";
import pickBy from "lodash/pickBy";
import pick from "lodash/pick";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, ID } from "core/types";

export default class PaymentRequestAdminService extends APIService {
  async list(filter: ApiFilter, options: ApiOptions) {
    const { list, totalCount } = await super.findForList(
      this._buildFilter(filter),
      options
    );
    return { data: list, total: totalCount };
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter = pickBy(pick(filter, ["status", "shop_id", "provider"]));
    if (filter.provider) {
      theFilter.provider = [
        `payment_requests.provider = :provider`,
        {
          provider: filter.provider
        }
      ];
    }

    if (filter.merchant_id) {
      theFilter.merchant_id = [
        `payment_requests.merchant_id = :merchant_id`,
        {
          merchant_id: filter.merchant_id
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

    if (filter.start_at && filter.end_at) {
      theFilter.created_range = [
        `payment_requests.created_at between :start_at and :end_at`,
        {
          start_at: moment(filter.start_at).toDate(),
          end_at: moment(filter.end_at).toDate()
        }
      ];
    } else if (filter.start_at) {
      theFilter.created_range = [
        `payment_requests.created_at > :start_at`,
        {
          start_at: filter.start_at
        }
      ];
    } else if (filter.end_at) {
      theFilter.created_range = [
        `payment_requests.created_at < :end_at`,
        {
          end_at: moment(filter.end_at).toDate()
        }
      ];
    }
    if (filter.code) {
      theFilter.code = [
        `lower(payment_requests.status) like :code`,
        {
          code: `%${filter.code.toLowerCase()}%`
        }
      ];
    }
    return theFilter;
  }

  async detail(id: ID) {
    const payment_request = await super.findOne("id", id);
    return { data: payment_request };
  }
}
