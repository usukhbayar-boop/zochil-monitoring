import { Router } from "express";
import { DBConnection } from "core/types";
import { authenticateAdmin, authorize } from "core/auth/middlewares";
import { body as checkBody, checkSchema } from "express-validator";
import ManagerService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new ManagerService(db);

  routes.post(
    "/login",
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
    service.handleOk(async (req) =>
      service.list(
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
    checkBody(["last_name", "first_name", "username", "phone", "password"])
      .not()
      .isEmpty(),
    service.handleOk(
      async (req) =>
        await service.create({
          last_name: req.body.last_name,
          first_name: req.body.first_name,
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
    checkBody(["id", "last_name", "first_name", "username", "phone"])
      .not()
      .isEmpty(),
    service.handleOk(
      async (req) =>
        await service.update({
          id: req.body.id,
          last_name: req.body.last_name,
          first_name: req.body.first_name,
          username: req.body.username,
          phone: req.body.phone,
          regno: req.body.regno,
          password: req.body.password
        })
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req) => await service.detail(req.params.id))
  );

  routes.post(
    "/add/roles",
    authorize("", true),
    [
      checkBody("roles")
        .notEmpty(),
      checkBody("manager_id").not().isEmpty()
    ],
    service.handleOk(
      async (req) =>
        await service.addRoles({
          manager_id: req.body.manager_id,
          roles: req.body.roles as Array<string>,
          user: req.currentUser
        })
    )
  );

  routes.post(
    "/remove/role",
    authorize("", true),
    checkBody(["manager_id", "role"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.removeRole({
          manager_id: req.body.manager_id,
          role: req.body.role,
          user: req.currentUser
        })
    )
  );

  routes.post(
    "/remove",
    authorize("", true),
    checkBody("id").not().isEmpty(),
    service.handleOk(async (req) => await service.remove(req.body.id))
  );

  return routes;
};
