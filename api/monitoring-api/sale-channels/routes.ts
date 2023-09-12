import { Router } from "express";

import { DBConnection } from "core/types";
import { body as checkBody } from "express-validator";
import { authenticateAdmin } from "core/auth/middlewares";

import SaleChannelMonitoringService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();

  const service = new SaleChannelMonitoringService(db);
  routes.use(authenticateAdmin(db));

  routes.get(
    "/list",
    service.handleOk(
      async () => await service.list())
  );

  routes.post(
    "/update",
    checkBody(["id", "name"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.update({
          id: req.body.id,
          name: req.body.name,
          channel_type: req.body.channel_type,
          uid: req.body.uid,
          logo: req.body.logo,
          description: req.body.description,
          terms: req.body.terms
        })
    )
  );

  routes.post(
    "/create",
    checkBody(["uid", "name", "channel_type"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.create({
          uid: req.body.uid,
          name: req.body.name,
          channel_type: req.body.channel_type,
          logo: req.body.logo,
          description: req.body.description
        })
    )
  );

  routes.get(
    "/detail/:uid",
    service.handleOk(
      async (req) => await service.detail({ uid: req.params.uid })
    )
  );

  routes.post(
    "/remove",
    checkBody("id").not().isEmpty(),
    service.handleOk(async (req) => await service.remove(req.body.id))
  );

  return routes;
};
