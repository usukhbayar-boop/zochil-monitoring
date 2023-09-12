import { Router } from "express";
import { body as checkBody, query as checkQuery } from "express-validator";

import AdminIssueService from "./service";
import { DBConnection, ID } from "core/types";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new AdminIssueService(db);

  routes.get(
    "/list",
    service.handleOk(
      async (req) =>
        await service.list(
          {
            title: req.query.title,
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
    "/detail",
    checkQuery("id").not().isEmpty(),
    service.handleOk(
      async (req, res) => await service.detail(req.query.id as ID)
    )
  );

  routes.post(
    "/create",
    [
      checkBody("title").not().isEmpty(),
      checkBody("body").not().isEmpty(),
      checkBody("channels").not().isEmpty(),
      checkBody("broadcast_type").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.create({
          body: req.body.body,
          title: req.body.title,
          channels: req.body.channels,
          broadcast_type: req.body.broadcast_type
        })
    )
  );

  routes.post(
    "/update",
    [
      checkBody("id").not().isEmpty(),
      checkBody("title").not().isEmpty(),
      checkBody("body").not().isEmpty(),
      checkBody("channels").not().isEmpty(),
      checkBody("broadcast_type").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.updateBroadcast({
          id: req.body.id,
          body: req.body.body,
          title: req.body.title,
          channels: req.body.channels,
          broadcast_type: req.body.broadcast_type
        })
    )
  );

  routes.post(
    "/remove",
    checkBody("id").not().isEmpty(),
    service.handleOk(async (req, res) => await service.remove(req.body.id))
  );

  routes.post(
    "/send",
    checkBody("id").not().isEmpty(),
    service.handleOk(
      async (req, res) => await service.send(req.body.id, req.body.merchant_ids)
    )
  );

  return routes;
};
