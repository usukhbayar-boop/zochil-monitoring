import { Router } from "express";
import ProductsService from "./service";
import { body as checkBody} from 'express-validator';
import { DBConnection } from "core/types";
import { authorize } from "core/auth/middlewares";
import { MONITORING_ROLES } from "core/base/constants";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new ProductsService(db, "products");

  routes.get(
    "/list",
    authorize(MONITORING_ROLES.MARKETPLACE_PRODUCT_VIEW),
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
            category_codes: req.query.category_codes
          },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );

  routes.post(
      "/remove/product/marketplace",
      authorize(MONITORING_ROLES.MARKETPLACE_PRODUCT_MANAGE),
      checkBody(["product_id"]).not().isEmpty(),
      service.handleOk(
          async (req) => await service.removeProductMarketPlace(req.body.product_id, req.currentUser)
      )
  );

  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.MARKETPLACE_PRODUCT_VIEW),
    service.handleOk(
      async (req) => await service.detail(req.params.id, req.currentUser)
    )
  );

  return routes;
};
