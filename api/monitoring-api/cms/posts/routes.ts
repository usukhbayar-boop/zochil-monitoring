import { Router } from 'express';
import { body as checkBody } from 'express-validator';

import CMSPostService from './service';
import { DBConnection } from 'core/types';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new CMSPostService(db, 'cms_posts');

  routes.get(
    "/list",
    service.handleOk(async (req) =>
      await service.list({}, {
        page: parseInt(req.query.page as string || "1", 10)
      })
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req) =>
      await service.detail(req.params.id)
    )
  );

  routes.post(
    "/create",
    [
      checkBody("image").not().isEmpty(),
      checkBody("title").not().isEmpty(),
      checkBody("body").not().isEmpty(),
    ],
    service.handleOk(async (req) =>
      await service.create({
        title: req.body.title,
        image: req.body.image,
        body: req.body.body,
        summary: req.body.summary,
      })
    )
  );

  routes.post(
    "/update",
    [
      checkBody("id").not().isEmpty(),
      checkBody("image").not().isEmpty(),
      checkBody("title").not().isEmpty(),
      checkBody("body").not().isEmpty(),
    ],
    service.handleOk(async (req) =>
      await service.update({
        id: req.body.id,
        title: req.body.title,
        image: req.body.image,
        body: req.body.body,
        summary: req.body.summary,
      })
    )
  );

  routes.post(
    "/remove",
    [
      checkBody("id").not().isEmpty(),
    ],
    service.handleOk(async (req) =>
      await service.remove(req.body.id)
    )
  );

  return routes;
};
