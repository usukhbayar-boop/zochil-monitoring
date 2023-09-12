import { Router } from "express";
import { DBConnection } from "core/types";

import MerchantCategoryService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new MerchantCategoryService(db, "merchant_categories");

  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            name: req.query.name
          },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req, res) => await service.detail(req.params.id))
  );
  routes.post(
    "/create",
    service.handleOk(
      async (req) =>
        await service.create({
          name: req.body.name,
          code: req.body.code,
          ordering: req.body.ordering,
          level: req.body.level,
          parent_id: req.body.parent_id
        })
    )
  );
  routes.post(
    "/update",
    service.handleOk(
      async (req) =>
        await service.update({
          id: req.body.id,
          name: req.body.name,
          code: req.body.code,
          ordering: req.body.ordering,
          level: req.body.level,
          parent_id: req.body.parent_id
        })
    )
  );

  return routes;
};
