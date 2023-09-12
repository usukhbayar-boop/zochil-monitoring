import { DBConnection } from "core/types";
import { Router } from "express";
import { authorize } from "core/auth/middlewares";
import { MONITORING_ROLES } from "core/base/constants";
import { query as checkQuery, body as checkBody } from "express-validator";
import MarketPlaceBannerService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new MarketPlaceBannerService(db);

  routes.get(
    "/list",
    authorize(MONITORING_ROLES.MARKETPLACE_BANNER_VIEW),
    checkQuery("marketplace_uid").not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.list(req.currentUser, {
          marketplace_uid: req.query.marketplace_uid
        })
    )
  );

  routes.post(
    "/create",
    authorize(MONITORING_ROLES.MARKETPLACE_BANNER_MANAGE),
    checkBody(["position", "type"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.create({
          marketplace_uid: req.currentUser.marketplace_uid || "none",
          status: "enabled",
          banner_type: req.body.type,
          position: req.body.position,
          image: req.body.image,
          video_url: req.body.video_url
        })
    )
  );

  routes.post(
    "/update",
    authorize(MONITORING_ROLES.MARKETPLACE_BANNER_MANAGE),
    checkBody(["id"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.update({
          user: req.currentUser,
          status: req.body.status,
          position: req.body.position,
          video_url: req.body.video_url,
          image: req.body.image,
          banner_type: req.body.type,
          id: req.body.id
        })
    )
  );

  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.MARKETPLACE_BANNER_VIEW),
    service.handleOk(
      async (req) => await service.detail(req.currentUser, req.params.id)
    )
  );

  routes.post(
    "/remove",
    authorize(MONITORING_ROLES.MARKETPLACE_BANNER_MANAGE),
    checkBody(["id"]).not().isEmpty(),
    service.handleOk(
      async (req) => await service.remove(req.body.id, req.currentUser)
    )
  );

  return routes;
};
