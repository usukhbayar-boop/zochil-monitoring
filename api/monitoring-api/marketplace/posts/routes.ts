import { Router } from "express";
import PostService from "./service";
import { DBConnection } from "core/types";
import { authorize } from "core/auth/middlewares";
import { MONITORING_ROLES } from "core/base/constants";
import { query as checkQuery, body as checkBody } from "express-validator";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new PostService(db, "marketplace_posts");

  routes.get(
    "/list",
    authorize(MONITORING_ROLES.MARKETPLACE_POST_VIEW),
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

  routes.post(
    "/update",
    authorize(MONITORING_ROLES.MARKETPLACE_POST_MANAGE),
    checkBody(['id']).not().isEmpty(),
    service.handleOk(async (req) => await service.update(
      {
        user: req.currentUser,
        title: req.body.title,
        body: req.body.body,
        image: req.body.image,
        summary: req.body.summary,
        video_url: req.body.video_url,
        id: req.body.id
      }
    ))
  );

  routes.post(
    "/remove",
    authorize(MONITORING_ROLES.MARKETPLACE_POST_MANAGE),
    checkBody("id").not().isEmpty(),
    service.handleOk(
      async (req, res) =>
        await service.remove(req.body.id, req.currentUser),
    )
  );

  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.MARKETPLACE_POST_VIEW),
    service.handleOk(async (req) => await service.detail(req.currentUser, req.params.id))
  );

  routes.post(
    "/create",
    authorize(MONITORING_ROLES.MARKETPLACE_POST_MANAGE),
    checkBody([
      "title",
      "body",
    ])
      .not()
      .isEmpty(),
    service.handleOk(async (req) => await service.create({
      body: req.body.body,
      title: req.body.title,
      image: req.body.image,
      summary: req.body.summary,
      video_url: req.body.video_url,
      user_id: req.currentUser.id,
      marketplace_uid: req.currentUser.marketplace_uid || "none",
    }))
  );

  return routes;
};
