import moment from "moment";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";

export default class OrderAdminService extends APIService {
  constructor(db: DBConnection) {
    super(db, "crowdfund_donations");
  }

  async list(filter: ApiFilter, options: ApiOptions) {
    const { list: orders, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return { data: orders, total: totalCount };
  }

  async detail(id: ID) {
    const order = await super.findOne("id", id);
    return { data: order };
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter = pickBy(pick(filter, ["status", "campaign_id", "amount"]));

    if (filter.campaign_type) {
      theFilter.campaign_type = [
        `campaigns.campaign_type = :campaign_type`,
        { campaign_type: filter.campaign_type }
      ];
    }

    if (filter.code) {
      theFilter.code = [
        `lower(donations.code) like :code`,
        { code: `%${filter.code.toLowerCase()}%` }
      ];
    }

    if (filter.full_name) {
      theFilter.full_name = [
        `lower(donations.full_name) like :full_name`,
        { full_name: `%${filter.full_name.toLowerCase()}%` }
      ];
    }

    if (filter.phone) {
      theFilter.phone = [
        `lower(donations.phone) like :phone`,
        { phone: `%${filter.phone.toLowerCase()}%` }
      ];
    }

    return theFilter;
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      joins: [
        ["leftJoin", "campaigns", `donations.campaign_id`, "campaigns.id"],
        ["leftJoin", "users", `donations.user_id`, "users.id"]
      ],
      fields: [
        "donations.*",
        "users.avatar as user_avatar",
        "campaigns.title as campaign_title",
        "campaigns.image as campaign_image"
      ]
    };
  }

  async ordersByDaysOfMerchant({
    user,
    end,
    start,
    merchant_id
  }: {
    user: User;
    end: Date;
    start: Date;
    merchant_id: ID;
  }) {
    if (moment(start).add("91", "days").isAfter(end)) {
      let filter = "";
      const params: any = {
        end: moment(end).endOf("day").toDate(),
        start: moment(start).startOf("day").toDate()
      };

      if (merchant_id) {
        filter = " and merchant_id=:merchant_id";
        params.merchant_id = merchant_id;
      }

      return await this.connector.db
        .raw(
          `
        select AA.* from (
          select
            sum(case when status = 'pending' then 1 else 0 end) as pending_count,
            sum(case when status = 'pending' then total_price else 0 end) as pending_amount,
            sum(case when status in ('verified', 'delivered') then 1 else 0 end) as verified_count,
            sum(case when status in ('verified', 'delivered') then total_price else 0 end) as verified_amount,
            to_char(created_at, 'MMDD') as day
          from orders
          where
            created_at >= :start and created_at <= :end ${filter}
          group by to_char(created_at, 'MMDD')
        ) AA order by AA.day asc
      `,
          params
        )
        .then((res) => ({ data: (res || {}).rows || [] }));
    }

    return { data: [] };
  }

  async ordersByMonthOfMerchant(user: User, merchant_id: ID) {
    let filter = "";
    const params = {};
    if (merchant_id) {
      filter = " where merchant_id=:merchant_id";
    }

    return await this.connector.db
      .raw(
        `
      select AA.* from (
        select
          sum(case when status = 'pending' then 1 else 0 end) as pending_count,
          sum(case when status = 'pending' then total_price else 0 end) as pending_amount,
          sum(case when status in ('verified', 'delivered') then 1 else 0 end) as verified_count,
          sum(case when status in ('verified', 'delivered') then total_price else 0 end) as verified_amount,
          to_char(created_at, 'YYYYMM') as month
        from orders ${filter}
          group by to_char(created_at, 'YYYYMM')
        }
        ) AA order by AA.month asc
    `,
        params
      )
      .then((res) => ({ data: (res || {}).rows || [] }));
  }
}
