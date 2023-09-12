import { Router } from "express";
import { DBConnection, ID } from "core/types";
import PaymentInvoiceAdminService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new PaymentInvoiceAdminService(db, "payment_invoices");

  routes.get(
    "/lists",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            channels: req.query.channels as string,
            shop_id: req.query.shop_id as ID,
            order_id: req.query.order_id as ID,
            account_id: req.query.account_id as ID,
            amount: req.query.amount as ID,
            status: req.query.status as string,
            order_code: req.query.order_code as string,
            phone: req.query.phone as string,
            start: req.query.start as any,
            end: req.query.end as any,
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
    service.handleOk(async (req, res) => await service.detail(req.params.id))
  );

  return routes;
};
