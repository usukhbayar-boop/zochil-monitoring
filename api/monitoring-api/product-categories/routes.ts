import { Router } from "express";
import { DBConnection } from "core/types";

import ProductAdminService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new ProductAdminService(db, "product_categories");

  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            name: req.query.name,
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
    service.handleOk(
      async (req, res) => await service.detail(req.params.id)
    )
  );

  routes.post(
    "/update",
    service.handleOk(async (req) => await service.update({
      id: req.body.id,
      name: req.body.name,
      sale_channels: req.body.sale_channels,
      main_category_codes: req.body.main_category_codes,
    }))
  );

  return routes;
};
