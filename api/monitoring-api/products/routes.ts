import { Router } from "express";
import { DBConnection } from "core/types";

import ProductAdminService from "./service";
import { MONITORING_ROLES } from "core/base/constants";
import { authorize } from "core/auth/middlewares";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new ProductAdminService(db, "products");

  routes.get(
    "/list",
    authorize(MONITORING_ROLES.PRODUCT_VIEW),
    service.handleOk(
      async (req, res) =>
        await service.list(
          req.currentUser,
          {
            sku: req.query.sku,
            price: req.query.price,
            name: req.query.name,
            status: req.query.status,
            shop_id: req.query.shop_id,
            end_at: req.query.end_at,
            start_at: req.query.start_at,
            channels: req.query.channels,
            category_codes: req.query.category_codes,
          },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.PRODUCT_VIEW),
    service.handleOk(
      async (req, res) => await service.detail(req.currentUser, req.params.id)
    )
  );

  routes.post(
    "/update",
    authorize(MONITORING_ROLES.PRODUCT_MANAGE),
    service.handleOk(async (req) => await service.update({
      user: req.currentUser,
      id: req.body.id,
      name: req.body.name,
      price: req.body.price,
      status: req.body.status,
      sale_channels: req.body.sale_channels,
      main_category_codes: req.body.main_category_codes,
    }))
  );

  routes.get(
    "/product-main-categories",
    authorize(MONITORING_ROLES.PRODUCT_VIEW),
    service.handleOk(async () => await service.main_categories_list())
  );

  routes.post(
    "/assign-main-categories",
    authorize(MONITORING_ROLES.PRODUCT_MANAGE),
    service.handleOk(
      async (req) =>
        await service.assign_main_categories({
          user: req.currentUser,
          id: req.body.id,
          codes: req.body.codes,
          ids: req.body.ids
        })
    )
  );

  routes.post(
    "/unassign-main-categories",
    authorize(MONITORING_ROLES.PRODUCT_MANAGE),
    service.handleOk(
      async (req) =>
        await service.unassign_main_categories({
          user: req.currentUser,
          id: req.body.id,
          codes: req.body.codes,
          ids: req.body.ids
        })
    )
  );

  return routes;
};
