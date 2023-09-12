import { Router } from "express";
import { body as checkBody } from "express-validator";

import MonitorExpoService from "./service";
import { DBConnection } from "core/types";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new MonitorExpoService(db);

  routes.get(
    "/list",
    service.handleOk(
      async (req) =>
        await service.list(
          req.currentUser,
          { name: req.query.name },
          {
            page: parseInt((req.query.page as string) || "1"),
            limit: parseInt((req.query.limit as string) || "50")
          }
        )
    )
  );

  routes.get(
    "/:id",
    service.handleOk(
      async (req) => await service.detail(req.currentUser, req.params.id)
    )
  );

  routes.post(
    "/create",
    [
      checkBody("name").not().isEmpty(),
      checkBody("image").not().isEmpty(),
      checkBody("start_at").not().isEmpty(),
      checkBody("end_at").not().isEmpty()
    ],
    service.handleOk(async (req) => await service.create(req.body))
  );

  routes.post(
    "/update",
    [
      checkBody("id").not().isEmpty(),
      checkBody("name").not().isEmpty(),
      checkBody("image").not().isEmpty(),
      checkBody("start_at").not().isEmpty(),
      checkBody("end_at").not().isEmpty()
    ],
    service.handleOk(async (req) => await service.update(req.body))
  );
  routes.post(
    "/archive",
    [checkBody("id").not().isEmpty()],
    service.handleOk(async (req) => await service.archiveToggle(req.body))
  );

  return routes;
};
