import { Router } from "express";
import { body as check } from "express-validator";

import { authenticate } from "core/auth/middlewares";
import { DBConnection, ID } from "core/types";

import InventoryPurchaseService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new InventoryPurchaseService(db);

  routes.use("*", authenticate(db));
  routes.get(
    "/list",
    service.handleOk(
      async (req) =>
        await service.list(req.currentUser, req.query.shop_id as ID)
    )
  );

  routes.post(
    "/create",
    [
      check("shop_id").not().isEmpty(),
      check("product_id").not().isEmpty(),
      check("quantity").not().isEmpty(),
      check("price").not().isEmpty(),
      check("description").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.createPurchase({
          user: req.currentUser,
          shop_id: req.body.shop_id,
          product_id: req.body.product_id,
          quantity: req.body.quantity,
          price: req.body.price,
          description: req.body.description
        })
    )
  );

  routes.post(
    "/remove",
    [check("id").not().isEmpty(), check("shop_id").not().isEmpty()],
    service.handleOk(
      async (req, res) =>
        await service.remove(req.currentUser, req.body.shop_id, req.body.id)
    )
  );

  return routes;
};
