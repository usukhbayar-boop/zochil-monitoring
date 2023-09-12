import { Router } from "express";
import { query as checkQuery } from "express-validator";

import AnalyticsService from "./service";
import { DBConnection, ID } from "core/types";
import { authorize } from "core/auth/middlewares";
import { MONITORING_ROLES } from "core/base/constants";


export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new AnalyticsService(db);

  routes.use("*", authorize("", true));
  routes.get(
    "/summary",
    service.handleOk(async () => await service.summary())
  );

  routes.get(
    "/top-hits",
    service.handleOk(async () => await service.topHits())
  );

  routes.get(
    "/hits-by-day",
    [checkQuery("end").not().isEmpty(), checkQuery("start").not().isEmpty()],
    service.handleOk(
      async (req, res) =>
        await service.hitsByDays({
          end: req.query.end as any,
          start: req.query.start as any,
          merchant_id: req.query.merchant_id as ID
        })
    )
  );

  routes.get(
    "/hits-by-month",
    service.handleOk(
      async (req, res) =>
        await service.hitsByMonth(req.query.merchant_id as string)
    )
  );

  routes.get(
    "/orders-by-day",
    [checkQuery("end").not().isEmpty(), checkQuery("start").not().isEmpty()],
    service.handleOk(
      async (req, res) =>
        await service.ordersByDays({
          end: req.query.end as any,
          start: req.query.start as any,
          merchant_id: req.query.merchant_id as ID
        })
    )
  );

  routes.get(
    "/orders-by-month",
    service.handleOk(
      async (req, res) =>
        await service.ordersByMonth(req.query.merchant_id as ID)
    )
  );

  return routes;
};
