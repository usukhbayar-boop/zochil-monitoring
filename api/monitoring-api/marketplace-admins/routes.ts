import { Router } from "express";
import { authenticateAdmin, authorize } from "core/auth/middlewares";
import { DBConnection } from "core/types";
import { body as checkBody } from "express-validator";
import MarketPlaceAdminService from "./service";
import { MONITORING_ROLES } from "core/base/constants";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new MarketPlaceAdminService(db);

  routes.post(
    "/login-with-password",
    checkBody(["username", "password"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.loginWithPassword(req.body.username, req.body.password)
    )
  );

  routes.use("*", authenticateAdmin(db));
  routes.post(
    "/change/password",
    checkBody(["new_password", "current_password"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.changePassword(
          req.currentUser.id,
          req.body.current_password,
          req.body.new_password
        )
    )
  );

  routes.get(
    "/list",
    authorize("", true),
    service.handleOk(
      async (req) =>
        await service.list(
          {},
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );
  routes.post(
    "/create",
    authorize("", true),
    checkBody([
      "last_name",
      "first_name",
      "username",
      "phone",
      "password",
      "marketplace_uid"
    ])
      .not()
      .isEmpty(),
    service.handleOk(
      async (req, res) =>
        await service.create({
          last_name: req.body.last_name,
          first_name: req.body.first_name,
          marketplace_uid: req.body.marketplace_uid,
          phone: req.body.phone,
          username: req.body.username,
          password: req.body.password,
          regno: req.body.regno,
          user: req.currentUser
        })
    )
  );

  routes.post(
    "/update",
    checkBody([
      "id",
      "last_name",
      "first_name",
      "phone",
      "username",
      "marketplace_uid"
    ])
      .not()
      .isEmpty(),
    service.handleOk(
      async (req) =>
        await service.update({
          id: req.body.id,
          last_name: req.body.last_name,
          first_name: req.body.first_name,
          marketplace_uid: req.body.marketplace_uid,
          password: req.body.password,
          regno: req.body.regno,
          phone: req.body.phone,
          username: req.body.username
        })
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req) => await service.detail(req.params.id))
  );

  routes.post(
    "/remove",
    authorize("", true),
    checkBody("id").not().isEmpty(),
    service.handleOk(
      async (req) => await service.remove(req.body.id, req.currentUser)
    )
  );

  routes.post(
    "/add/role",
    authorize("", true),
    [
      checkBody("id").not().isEmpty(),
      checkBody()
        .isIn([
          `${MONITORING_ROLES.MARKETPLACE_BANNER_MANAGE}`,
          `${MONITORING_ROLES.MARKETPLACE_BANNER_VIEW}`,
          `${MONITORING_ROLES.MARKETPLACE_CATEGORY_VIEW}`,
          `${MONITORING_ROLES.MARKETPLACE_CATEGORY_MANAGE}`,
          `${MONITORING_ROLES.MARKETPLACE_PAGE_VIEW}`,
          `${MONITORING_ROLES.MARKETPLACE_PAGE_MANAGE}`,
          `${MONITORING_ROLES.MARKETPLACE_POST_VIEW}`,
          `${MONITORING_ROLES.MARKETPLACE_POST_MANAGE}`,
          `${MONITORING_ROLES.MARKETPLACE_PRODUCT_VIEW}`,
          `${MONITORING_ROLES.MARKETPLACE_PRODUCT_MANAGE}`,
          `${MONITORING_ROLES.MARKETPLACE_SHOP_VIEW}`,
          `${MONITORING_ROLES.MARKETPLACE_SHOP_MANAGE}`,
          `${MONITORING_ROLES.MARKETPLACE_SALE_CHANNEL_REQUEST_VIEW}`,
          `${MONITORING_ROLES.MARKETPLACE_SALE_CHANNEL_REQUEST_MANAGE}`
        ])
        .notEmpty()
    ],
    service.handleOk(
      async (req) =>
        await service.addRole({
          id: req.body.id,
          role: req.body.role,
          user: req.currentUser
        })
    )
  );

  routes.post(
    "/remove/role",
    authorize("", true),
    checkBody(["id", "role"]).not().isEmpty(),
    service.handleOk(async (req) =>
      service.removeRole({
        id: req.body.id,
        role: req.body.role,
        user: req.currentUser
      })
    )
  );

  return routes;
};
