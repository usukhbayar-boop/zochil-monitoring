import { Router } from "express";
import { DBConnection } from "core/types";

import CategoryService from "./service";
import { authorize } from "core/auth/middlewares";
import { MONITORING_ROLES } from "core/base/constants";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new CategoryService(db, "product_categories");

  routes.get(
    "/list",
    authorize(MONITORING_ROLES.MARKETPLACE_CATEGORY_VIEW),
    service.handleOk(
      async (req) =>
        await service.list(
          req.currentUser,
          {
            name: req.query.name,
            shop_id: req.query.shop_id,
            end_at: req.query.end_at,
            start_at: req.query.start_at,
            channels: req.query.channels,
            category_codes: req.query.category_codes
          },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.PRODUCT_CATEGORY_VIEW),
    service.handleOk(
      async (req) => await service.detail(req.params.id, req.currentUser)
    )
  );

  return routes;
};
