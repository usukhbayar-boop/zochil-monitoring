import { Router } from "express";
import { body as checkBody } from "express-validator";

import { DBConnection } from "core/types";
import { authenticateAdmin, authorize } from "core/auth/middlewares";
import ProductAttributesMonitoringService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new ProductAttributesMonitoringService(db);

  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            shop_id: req.body.shop_id,
            name: req.body.name,
            status: req.body.status,
            code: req.body.code,
            id: req.body.id
          },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );

  routes.post(
    "/create",
    service.handleOk(async (req, res) => {
      await service.create({
        shop_id: req.body.shop_id,
        name: req.body.name,
        code: req.body.code,
        category_ids: req.body.category_ids || [],
        status: req.body.status,
        group: req.body.group
      });
    })
  );

  return routes;
};
