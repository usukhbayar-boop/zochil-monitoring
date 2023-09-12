import pickBy from "lodash/pickBy";
import moment from "moment";
import pick from "lodash/pick";
import APIService from "core/base/service";
import { DBConnection } from "core/types";
import { ApiFilter, ApiOptions, ID } from "core/types";


export default class MerchantContractsService extends APIService {
  async list(filter = {}, options = {}) {
    const { list: contracts, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return { data: contracts, total: totalCount };

  }


  _buildFilter(filter: ApiFilter) {
    const theFilter = pickBy(
      pick(filter, ["merchant_id", "account_id", "contractno", "status"])
    );

    if (filter.merchant_id) {
      theFilter.merchant_id = [
        `merchant_contracts.merchant_id = :merchant_id`,
        {
          merchant_id: filter.merchant_id
        }
      ];
    }

    if (filter.phone) {
      theFilter.phone = [
        `merchant_contracts.phone = :phone`,
        {
          phone: filter.phone
        }
      ];
    }

    if (filter.contract_no) {
      theFilter.contractno = [
        `merchant_contracts.contractsno = :contractsno`,
        {
          order_id: filter.order_id
        }
      ];
    }

    if (filter.status) {
      theFilter.status = [
        `merchant_contracts.status = :status`,
        {
          status: filter.status
        }
      ];
    }

    if (filter.full_name) {
      theFilter.full_name = [
        `merchant_contracts.full_name = :full_name`,
        {
          full_name: filter.full_name
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
        "merchant_id",
        "company_name",
        "phone",
        "user_image",
        "created_at",
        "started_at",
        "expire_at",
        "contractno",
        "status",
        "full_name",
        "checkout_status"
      ]
    };
  }


  async detail(id: ID) {
    const contracts = await super.findOne("id", id);
    return { data: contracts };
  }


}
