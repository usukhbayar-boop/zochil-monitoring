import { Router } from 'express';
import { body as checkBody } from 'express-validator';

import AdminService from './service';
import { DBConnection } from 'core/types';
import { authenticateAdmin, authorize } from 'core/auth/middlewares';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new AdminService(db);

  routes.post(
    '/login-with-password',
    [
      checkBody("username").not().isEmpty(),
      checkBody("password").not().isEmpty(),
    ],
    service.handleOk(async (req, res) =>
      await service.loginWithPassword(
        req.body.username,
        req.body.password,
      )
    )
  );

  routes.use('*', authenticateAdmin(db));

  routes.post(
    '/change-password',
    [
      checkBody("new_password").not().isEmpty(),
      checkBody("current_password").not().isEmpty(),
    ],
    service.handleOk(async (req, res) =>
      await service.changePassword(
        req.currentUser.id,
        req.body.current_password,
        req.body.new_password,
      )
    )
  );

  routes.get(
    '/list',
    authorize("", true),
    service.handleOk(async (req, res) =>
      await service.list({}, {
        page: parseInt(req.query.page as string || "1"),
      }),
    ),
  );

  routes.get(
    '/detail/:id',
    service.handleOk(async (req, res) =>
      await service.detail(req.params.id),
    ),
  );

  routes.post(
    '/create',
    authorize("", true),
    [
      checkBody("last_name").not().isEmpty(),
      checkBody("first_name").not().isEmpty(),
      checkBody("username").not().isEmpty(),
      checkBody("phone").not().isEmpty(),
      checkBody("password").not().isEmpty(),
    ],
    service.handleOk(async (req, res) =>
      await service.create({
        phone: req.body.phone,
        regno: req.body.regno,
        username: req.body.username,
        password: req.body.password,
        last_name: req.body.last_name,
        first_name: req.body.first_name,
      })
    )
  );

  routes.post(
    '/update',
    [
      checkBody("id").not().isEmpty(),
      checkBody("last_name").not().isEmpty(),
      checkBody("first_name").not().isEmpty(),
      checkBody("username").not().isEmpty(),
      checkBody("phone").not().isEmpty(),
    ],
    service.handleOk(async (req, res) =>
      await service.update({
        id: req.body.id,
        phone: req.body.phone,
        regno: req.body.regno,
        username: req.body.username,
        password: req.body.password,
        last_name: req.body.last_name,
        first_name: req.body.first_name,
      })
    )
  );

  routes.post(
    '/remove',
    authorize("", true),
    checkBody("id").not().isEmpty(),
    service.handleOk(async (req) =>
      await service.remove(req.body.id)
    )
  );

  return routes;
};
