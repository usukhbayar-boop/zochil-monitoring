import { Router } from "express";
import { body as checkBody } from "express-validator";

import LookService from "./service";
import { DBConnection, ID } from "core/types";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new LookService(db);

  routes.get(
    "/list",
    service.handleOk(
      async (req) =>
        await service.list(
          {
            shop_id: req.query.shop_id,
            title: req.query.title,
            product_id: req.query.product_id,
            category_id: req.query.category_id,
            gender: req.query.gender,
            season: req.query.season,
            status: req.query.status
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
    service.handleOk(
      async (req, res) => await service.lookDetail(req.params.id)
    )
  );

  routes.post(
    "/verify",
    [checkBody("id").not().isEmpty()],
    service.handleOk(async (req) => await service.verify(req.body.id))
  );

  routes.post(
    "/deny",
    [checkBody("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.deny(req.body.id))
  );

  routes.get(
    "/categories",
    service.handleOk(
      async (req) =>
        await service.categories(
          {
            name: req.query.name
          },
          {
            page: parseInt((req.query.page as string) || "1"),
            limit: parseInt((req.query.limit as string) || "50")
          }
        )
    )
  );

  routes.get(
    "/categories/:id",
    service.handleOk(
      async (req, res) => await service.categoryDetail(req.params.id)
    )
  );

  return routes;
};
