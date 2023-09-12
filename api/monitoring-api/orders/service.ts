import moment from "moment";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, ID } from "core/types";

export default class OrderAdminService extends APIService {
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
    const theFilter = pickBy(
      pick(filter, [
        "status",
        "shop_id",
        "payment_type",
        "channel",
        "total_price"
      ])
    );

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `orders.created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `orders.created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `orders.created_at < :end`,
        { end: moment(filter.end).toDate() }
      ];
    }

    if (filter.read) {
      theFilter.is_read = filter.read === "read";
    }

    if (filter.code) {
      theFilter.code = [
        `lower(orders.code) like :code`,
        { code: `%${filter.code.toLowerCase()}%` }
      ];
    }

    if (filter.phone) {
      theFilter.phone = [
        `lower(orders.customer_phone) like :phone`,
        { phone: `%${filter.phone.toLowerCase()}%` }
      ];
    }

    return theFilter;
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      joins: [["leftJoin", "shops", `orders.shop_id`, "shops.id"]],
      fields: [
        "orders.id",
        "shops.name as shop_name",
        "orders.code",
        "orders.status",
        "orders.channel",
        "orders.shop_id",
        "orders.is_read",
        "orders.payment_type",
        "orders.delivery_type",
        "orders.customer_first_name",
        "orders.customer_last_name",
        "orders.customer_full_name",
        "orders.customer_phone",
        "orders.customer_address",
        "orders.created_at",
        "orders.total_price"
      ]
    };
  }

  async ordersByDaysOfMerchant({
    end,
    start,
    merchant_id
  }: {
    end: string;
    start: string;
    merchant_id: ID;
  }) {
    if (moment(start).add("91", "days").isAfter(end)) {
      let filter = "";
      const params: { [key: string]: any } = {
        end: moment(end).endOf("day").toDate(),
        start: moment(start).startOf("day").toDate()
      };

      if (merchant_id) {
        filter = " and merchant_id=:merchant_id";
        params.merchant_id = merchant_id;
      }

      return await this.connector.db_readonly
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

  async ordersByMonthOfMerchant(user: any, merchant_id: ID) {
    let filter = "";
    const params = {};
    if (merchant_id) {
      filter = " where merchant_id=:merchant_id";
    }

    return await this.connector.db_readonly
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
