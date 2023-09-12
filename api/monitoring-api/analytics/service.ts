import moment from "moment";
import APIService from "core/base/service";
import { DBConnection, ID } from "core/types";

export default class AnalyticsService extends APIService {
  constructor(db: DBConnection) {
    super(db, "");
  }

  async summary() {
    const shopsCount = await this.connector.db_readonly("shops")
      .count()
      .then((res) => res[0].count);
    const shopsSubscribedCount = await this.connector.db_readonly("shops")
      .where({ is_subscribed: true })
      .count()
      .then((res) => res[0].count);
    const ordersCount = await this.connector.db_readonly("orders")
      .count()
      .then((res) => res[0].count);
    const ordersAmount = await this.connector.db_readonly("orders")
      .sum("total_price")
      .then((res) => res[0].sum);
    const productsCount = await this.connector.db_readonly("products")
      .count()
      .then((res) => res[0].count);
    const customersCount = await this.connector.db_readonly("accounts")
      .count()
      .then((res) => res[0].count);

    return {
      shopsCount,
      ordersCount,
      ordersAmount,
      productsCount,
      customersCount,
      shopsSubscribedCount
    };
  }

  async topHits() {
    const all = await this.getTopHits();
    const week = await this.getTopHits("week");
    const month = await this.getTopHits("month");

    return { all, month, week };
  }

  async getTopHits(range = "all") {
    let filter = "";
    const params: { [key: string]: any } = {};

    if (range !== "all") {
      const days = range === "month" ? 30 : 7;
      filter = "where created_at > :created_at";
      params.created_at = moment().subtract(days, "days").toDate();
    }

    return await this.connector.db_readonly
      .raw(
        `
      select AA.* from (
        select
          count(id) as hits,
          domain
        from analytics_pageviews ${filter}
          group by domain
        ) AA order by AA.hits desc limit 20
    `,
        params
      )
      .then((res) => (res || {}).rows || []);
  }

  async hitsByDays({
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
        const merchant = await super.findOneByConditions(
          { id: merchant_id },
          "shops"
        );
        if (merchant) {
          filter = "domain like :domain and";
          params.domain = `${merchant.uid}%`;
        }
      }

      return await this.connector.db_readonly
        .raw(
          `
        select AA.* from (
          select
            count(id) as total_count,
            to_char(created_at, 'MM/DD') as day
          from analytics_pageviews
          where ${filter} created_at >= :start and created_at <= :end
          group by to_char(created_at, 'MM/DD')
        ) AA order by AA.day asc
      `,
          params
        )
        .then((res) => ({ data: (res || {}).rows || [] }));
    }

    return { data: [] };
  }

  async hitsByMonth(merchant_id: ID) {
    let filter = "";
    const params: { [key: string]: any } = {};
    if (merchant_id) {
      const merchant = await super.findOneByConditions(
        { id: merchant_id },
        "shops"
      );
      if (merchant) {
        filter = "where domain like :domain";
        params.domain = `${merchant.uid}%`;
      }
    }

    return await this.connector.db_readonly
      .raw(
        `
      select AA.* from (
        select
          count(id) as total_count,
          to_char(created_at, 'YYYY/MM') as month
        from analytics_pageviews ${filter}
        group by to_char(created_at, 'YYYY/MM')
      ) AA order by AA.month asc
    `,
        params
      )
      .then((res) => ({ data: (res || {}).rows || [] }));
  }

  async ordersByDays({
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
        filter = "shop_id=:merchant_id and";
        params.merchant_id = merchant_id;
      }

      return await this.connector.db_readonly
        .raw(
          `
        select AA.* from (
          select
            count(id) as total_count,
            sum(total_price) as total_amount,
            to_char(created_at, 'MM/DD') as day
          from orders
          where ${filter} status <> 'cancelled' and created_at >= :start and created_at <= :end
          group by to_char(created_at, 'MM/DD')
        ) AA order by AA.day asc
      `,
          params
        )
        .then((res) => ({ data: (res || {}).rows || [] }));
    }

    return { data: [] };
  }

  async ordersByMonth(merchant_id: ID) {
    let filter = "";
    const params: { [key: string]: any } = {};

    if (merchant_id) {
      filter = "shop_id=:merchant_id and";
      params.merchant_id = merchant_id;
    }

    return await this.connector.db_readonly
      .raw(
        `
      select AA.* from (
        select
          count(id) as total_count,
          sum(total_price) as total_amount,
          to_char(created_at, 'YYYY/MM') as month
        from orders
        where ${filter} status <> 'cancelled'
        group by to_char(created_at, 'YYYY/MM')
      ) AA order by AA.month asc
    `,
        params
      )
      .then((res) => ({ data: (res || {}).rows || [] }));
  }
}
