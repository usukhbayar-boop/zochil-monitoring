import { Router } from "express";
import { body as check } from "express-validator";

import SellerAdminService from "./service";
import { DBConnection } from "core/types";
import { MONITORING_ROLES } from "core/base/constants";
import { authenticateAdmin, authorize } from "core/auth/middlewares";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new SellerAdminService(db, "sellers");

  routes.use("*", authenticateAdmin(db));
  routes.get(
    "/list",
    authorize(MONITORING_ROLES.SELLER_VIEW),
    service.handleOk(
      async (req) =>
        await service.list(
          {
            name: req.query.name,
            phone: req.query.phone
          },
          {
            page: parseInt(req.query.page as string),
            limit: parseInt(req.query.limit as string)
          }
        )
    )
  );

  routes.get(
    "/export-as-xlsx",
    authorize("", true),
    service.handleOk(
      async (req, res) =>
        await service.exportAsXLSX({
          end: req.query.end,
          start: req.query.start,
          status: req.query.status
        })
    )
  );

  routes.post(
    "/suggest-sellers",
    authorize(MONITORING_ROLES.SELLER_VIEW),
    service.handleOk(
      async (req, res) => await service.suggestSellers(req.body.name)
    )
  );

  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.SELLER_VIEW),
    service.handleOk(async (req, res) => await service.detail(req.params.id))
  );

  routes.post(
    "/suspend",
    authorize(MONITORING_ROLES.SELLER_MANAGE),
    [check("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.suspend(req.body.id))
  );

  routes.post(
    "/archive",
    authorize(MONITORING_ROLES.SELLER_MANAGE),
    [check("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.archive(req.body.id))
  );

  routes.post(
    "/activate",
    authorize(MONITORING_ROLES.SELLER_MANAGE),
    [check("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.activate(req.body.id))
  );

  routes.post(
    "/link-user",
    authorize(MONITORING_ROLES.SELLER_MANAGE),
    [check("id").not().isEmpty()],
    [check("phone").not().isEmpty()],
    service.handleOk(
      async (req, res) => await service.linkUser(req.body.id, req.body.phone)
    )
  );

  routes.post(
    "/unlink-user",
    authorize(MONITORING_ROLES.SELLER_MANAGE),
    [check("seller_id").not().isEmpty()],
    [check("user_id").not().isEmpty()],
    service.handleOk(
      async (req, res) =>
        await service.unlinkUser(req.body.seller_id, req.body.user_id)
    )
  );

  routes.post(
    "/update",
    authorize(MONITORING_ROLES.SELLER_MANAGE),
    [
      check("id").not().isEmpty(),
      check("uid").not().isEmpty(),
      check("name").not().isEmpty(),
      check("phone").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.updateSeller(req.body.id, {
          profile: req.body.profile,
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          youtube_url: req.body.youtube_url,
          facebook_url: req.body.facebook_url,
          instagram_url: req.body.instagram_url
        })
    )
  );

  routes.post(
    "/verify",
    authorize(MONITORING_ROLES.SELLER_MANAGE),
    [check("id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.verify(req.body.id))
  );

  return routes;
};
