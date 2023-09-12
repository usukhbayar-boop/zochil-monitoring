import { Router } from "express";
import { DBConnection, ID } from "core/types";

import OrderService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new OrderService(db, "orders");

  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            // filters
            code: req.query.code as string,
            start: req.query.start as any,
            end: req.query.end as any,
            phone: req.query.phone as string,
            status: req.query.status as string,
            shop_id: req.query.shop_id as ID,
            total_price: req.query.price as string,
            read: req.query.read as string,
            channel: req.query.channel as string,
            payment_type: req.query.payment_type as string
          },
          {
            // options
            page: parseInt((req.query.page as string) || "1"),
            limit: parseInt((req.query.limit as string) || "50")
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req) => await service.detail(req.params.id))
  );

  return routes;
};
