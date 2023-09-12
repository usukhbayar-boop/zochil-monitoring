import moment from "moment";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { DBConnection, ID, ApiFilter, ApiOptions } from "core/types";

export default class SettlementService extends APIService {
  constructor(db: DBConnection) {
    super(db, "settlements");
  }

  async list(filter: ApiFilter, options: ApiOptions) {
    const { list: settlements, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return { data: settlements, total: totalCount };
  }

  async detail(id: ID) {
    const settlement = await super.findOne("id", id);
    return { data: settlement };
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter = pickBy(pick(filter, ["status", "merchant_id"]));

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `settlements.created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `settlements.created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `settlements.created_at < :end`,
        { end: moment(filter.end).toDate() }
      ];
    }

    return theFilter;
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      joins: [["leftJoin", "shops", `settlements.merchant_id`, "shops.id"]],
      fields: [
        "settlements.id",
        "settlements.status",
        "settlements.response",
        "settlements.retried_at",
        "settlements.created_at",
        "settlements.order_count",
        "settlements.merchant_id",
        "settlements.hold_amount",
        "settlements.total_amount",
        "settlements.transferred_at",
        "settlements.transfer_amount",
        "shops.name as merchant_name"
      ]
    };
  }
}
