import { Router } from "express";
import ShopsService from "./service";
import { DBConnection } from "core/types";
import { query as checkQuery } from "express-validator";
import { MONITORING_ROLES, SALE_CHANNELS } from "core/base/constants";
import { authorize } from "core/auth/middlewares";

export default (db: DBConnection) => {
    const routes: any = Router();
    const service  = new ShopsService(db, "shops");
    
    routes.get(
      "/list",
      authorize(MONITORING_ROLES.MARKETPLACE_SHOP_VIEW),
      checkQuery("channel").isIn(SALE_CHANNELS).notEmpty(),
      checkQuery("merchant_type").optional().isIn(["shop", "restaurant"]),
      service.handleOk(
        async (req) =>
          await service.list(
            req.currentUser,
            {
              sale_channels: req.query.channel,
              merchant_type: req.query.merchant_type
            },
            {
              page: parseInt((req.query.page as string) || "1", 10)
            }
          )
      )
    );

    routes.get(
      "/detail/:id",
      authorize(MONITORING_ROLES.MARKETPLACE_SHOP_VIEW),
      service.handleOk(
        async (req) => await service.detail(req.params.id, req.currentUser)
      )
    );

    return routes;
}