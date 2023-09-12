import { Router } from "express";
import { DBConnection } from "core/types";
import { body as checkBody } from "express-validator";

import UserAdminService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new UserAdminService(db, "users");

  routes.get(
    "/list",
    service.handleOk(
      async (req) =>
        await service.list(
          {
            name: req.query.name,
            email: req.query.email,
            phone: req.query.phone,
            shop_id: req.query.shop_id,
          },
          {
            page: parseInt((req.query.page as string) || "1", 10),
            limit: parseInt((req.query.limit as string) || "50", 10),
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(
      async (req) =>
        await service.detail(req.params.id)
    )
  );

  routes.post(
    "/create",
    [
      checkBody("phone").not().isEmpty(),
      checkBody("first_name").not().isEmpty(),
      checkBody("last_name").not().isEmpty(),
      checkBody("password").not().isEmpty(),
    ],
    service.handleOk(async (req, res) => await service.create({
      phone: req.body.phone,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      password: req.body.password,
    }))
  );

  routes.post(
    "/update",
    [
      checkBody("id").not().isEmpty(),
      checkBody("phone").not().isEmpty(),
      checkBody("first_name").not().isEmpty(),
      checkBody("last_name").not().isEmpty(),
    ],
    service.handleOk(async (req, res) => await service.update({
      id: req.body.id,
      phone: req.body.phone,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      password: req.body.password,
    }))
  );

  routes.post(
    "/remove",
    [
      checkBody("id").not().isEmpty(),
    ],
    service.handleOk(async (req, res) => await service.remove(
      req.body.id,
    ))
  );


  return routes;
};
