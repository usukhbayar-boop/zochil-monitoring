import { Router } from "express";
import { body as checkBody, query as checkQuery } from "express-validator";

import { authenticateAdmin } from "core/auth/middlewares";
import { DBConnection } from "core/types";

import CollectionService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new CollectionService(db);

  routes.use("*", authenticateAdmin(db));

  routes.post(
    "/create",
    [
      checkBody("name").not().isEmpty(),
      checkBody("scope").not().isEmpty(),
      checkBody("criteria").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.create({
          name: req.body.name,
          shop_id: req.body.shop_id,
          sale_channels: req.body.sale_channels,
          description: req.body.description,
          image: req.body.image,
          image_horizontal: req.body.image_horizontal,
          image_vertical: req.body.image_vertical,
          criteria: req.body.criteria,
          show_on_home: req.body.show_on_home,
          scope: req.body.scope,
          expire_at: req.body.expire_at,
          theme: req.body.theme
        })
    )
  );

  routes.post(
    "/update",
    [
      checkBody("id").not().isEmpty(),
      checkBody("scope").not().isEmpty(),
      checkBody("name").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.update({
          id: req.body.id,
          name: req.body.name,
          shop_id: req.body.shop_id,
          sale_channels: req.body.sale_channels,
          description: req.body.description,
          image: req.body.image,
          image_horizontal: req.body.image_horizontal,
          image_vertical: req.body.image_vertical,
          criteria: req.body.criteria,
          show_on_home: req.body.show_on_home,
          scope: req.body.scope,
          expire_at: req.body.expire_at,
          theme: req.body.theme
        })
    )
  );

  routes.post(
    "/remove",
    [checkBody("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.remove(req.body.id))
  );

  routes.post(
    "/enable",
    [checkBody("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.enable(req.body.id))
  );

  routes.post(
    "/disable",
    [checkBody("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.disable(req.body.id))
  );

  routes.get(
    "/status/:id",
    service.handleOk(
      async (req) =>
        await service.status({
          id: req.params.id as string
        })
    )
  );

  routes.get(
    "/list",
    [checkQuery("shop_id").not().isEmpty()],
    service.handleOk(
      async (req) =>
        await service.list(
          {
            user: req.currentUser,
            shop_id: req.query.shop_id
          },
          {
            limit: parseInt((req.query.limit as string) || "20"),
            sortField: (req.query.sortField as string) || "created_at",
            sortDirection: (req.query.sortDirection as any) || "desc",
            page: parseInt(req.query.page as string) || 1
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req, res) => await service.findById(req.params.id))
  );

  routes.get(
    "/product-list/:id",
    service.handleOk(
      async (req, res) => await service.productList(req.params.id, req.query)
    )
  );
  return routes;
};
