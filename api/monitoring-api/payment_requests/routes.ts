import { Router } from "express";
import { DBConnection, ID } from "core/types";
import PaymentRequestAdminService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new PaymentRequestAdminService(db, "payment_requests");
  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            provider: req.query.provider as string,
            order_id: req.query.order_id as ID,
            merchant_id: req.query.merchant_id as ID,
            start_at: req.query.start_at as any,
            end_at: req.query.end_at as any,
            code: req.query.code as string
          },
          {
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
