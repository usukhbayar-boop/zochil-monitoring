import pickBy from "lodash/pickBy";
import moment from "moment";
import pick from "lodash/pick";
import APIService from "core/base/service";
import { DBConnection } from "core/types";
import { ApiFilter, ApiOptions, ID } from "core/types";


export default class ModuleSubsciptionsService extends APIService {

  async list(filter = {}, options = {}) {
    const { list: subscriptions, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return { data: subscriptions, total: totalCount };
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter = pickBy(
      pick(filter, ["module_uid", "merchant_id", "bill_status", "status"])
    );

    if (filter.module_uid) {
      theFilter.module_uid = [
        `module_subscriptions.module_uid = in(:module_uid)`,
        {
          module_uid: filter.module_uid
        }
      ];
    }

    if (filter.merchant_id) {
      theFilter.merchant_id = [
        `module_subscriptions.merchant_id = :merchant_id`,
        {
          merchant_id: filter.merchant_id
        }
      ];
    }

    if (filter.bill_status) {
      theFilter.bill_status = [
        `module_subscriptions.bill_status = :bill_status`,
        {
          bill_status: filter.bill_status
        }
      ];
    }

    if (filter.status) {
      theFilter.status = [
        `module_subscriptions.status = :status`,
        {
          status: filter.status
        }
      ];
    }

    if (filter.full_name) {
      theFilter.amount = [
        `module_subscriptions.full_name = :full_name`,
        {
          full_name: filter.full_name
        }
      ];
    }

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `merchant_contracts.created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `merchant_contracts.created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `merchant_contracts.created_at < :end`,
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
        "module_uid",
        "merchant_id",
        "bill_status",
        "module_type",
        "billable",
        "expire_at",
        "paused_at",
        "cancelled_at",
        "status",
        "phone",
        "full_name"
      ]
    };
  }

  async detail(id: ID) {
    const subscriptions = await super.findOne("id", id);
    return { data: subscriptions };
  }

}
