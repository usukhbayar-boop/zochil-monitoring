import { Router } from "express";
import { DBConnection } from "core/types";

import SettlementService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new SettlementService(db);

  routes.get(
    '/list',
    service.handleOk(async (req, res) =>
      await service.list(
        {
          // filters
          end: req.query.end,
          start: req.query.start,
          amount: req.query.amount,
          status: req.query.status,
          channel: req.query.channel,
          merchant_id: req.query.merchant_id,
          payment_type: req.query.payment_type,
        },
        {
          // options
          page: parseInt(req.query.page as string || "1"),
          limit: parseInt(req.query.limit as string || "50"),
        }
      )
    )
  );

  routes.get(
    '/detail/:id',
    service.handleOk(async (req, res) =>
      await service.detail(req.params.id),
    )
  );
  return routes;
};
