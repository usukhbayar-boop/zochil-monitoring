import { Router } from "express";
import PostService from "./service";
import { DBConnection } from "core/types";
import { authorize } from "core/auth/middlewares";
import { MONITORING_ROLES } from "core/base/constants";
import { query as checkQuery, body as checkBody } from "express-validator";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new PostService(db, "marketplace_pages");

  routes.get(
    "/list",
    authorize(MONITORING_ROLES.MARKETPLACE_PAGE_MANAGE),
    checkQuery("marketplace_uid").not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.list(
          req.currentUser,
          { marketplace_uid: req.query.marketplace_uid },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.MARKETPLACE_PAGE_VIEW),
    service.handleOk(
      async (req) => await service.detail(req.params.id, req.currentUser)
    )
  );

  routes.post(
    "/update",
    authorize(MONITORING_ROLES.MARKETPLACE_PAGE_MANAGE),
    checkBody(["id"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.update({
          user: req.currentUser,
          name: req.body.name,
          body: req.body.body,
          code: req.body.code,
          image: req.body.image,
          id: req.body.id
        })
    )
  );

  routes.post(
    "/create",
    authorize(MONITORING_ROLES.MARKETPLACE_PAGE_MANAGE),
    checkBody(["name", "code"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.create({
          name: req.body.name,
          body: req.body.body,
          code: req.body.code,
          image: req.body.image,
          marketplace_uid: req.currentUser.marketplace_uid || "none"
        })
    )
  );

  routes.post(
    "/remove",
    authorize(MONITORING_ROLES.MARKETPLACE_PAGE_MANAGE),
    checkBody("id").not().isEmpty(),
    service.handleOk(
      async (req) => await service.remove(req.body.id, req.currentUser)
    )
  );
  return routes;
};
