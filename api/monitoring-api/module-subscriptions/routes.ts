import { Router } from "express";
import { DBConnection, ID } from "core/types";

import ModuleSubscriptionsService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new ModuleSubscriptionsService(db, "module_subscriptions");

  routes.get("/list", service.handleOk(
    async (req, res) => {
      await service.list(
        {
          module_uid: req.query.module_uid as ID,
          merchant_id: req.query.merchant_id as ID,
          bill_status: req.query.bill_status as string,
          status: req.query.status as string,
          phone: req.query.phone as string,
          full_name: req.query.full_name as string
        },
        {
          page: parseInt((req.query.page as string) || "1"),
          limit: parseInt((req.query.limit as string) || "50")
        }
      )
    }
  ));

  routes.get(
    "/detail/:id",
    service.handleOk(async (req, res) => await service.detail(req.params.id))
  );

  return routes;


}
