import { Router } from 'express';
import { body as checkBody } from 'express-validator';

import AgentService from './service';
import { DBConnection } from 'core/types';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new AgentService(db, 'cms_agents');

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
      checkBody("full_name").not().isEmpty(),
      checkBody("image").not().isEmpty(),
      checkBody("phone").not().isEmpty(),
    ],
    service.handleOk(async (req) =>
      await service.create({
        image: req.body.image,
        phone: req.body.phone,
        full_name: req.body.full_name,
        description: req.body.description,
        facebook_url: req.body.facebook_url,
        instagram_url: req.body.instagram_url,
        linkedin_url: req.body.linkedin_url,
      })
    )
  );

  routes.post(
    "/update",
    [
      checkBody("id").not().isEmpty(),
      checkBody("full_name").not().isEmpty(),
      checkBody("image").not().isEmpty(),
      checkBody("phone").not().isEmpty(),
    ],
    service.handleOk(async (req) =>
      await service.update({
        id: req.body.id,
        image: req.body.image,
        phone: req.body.phone,
        full_name: req.body.full_name,
        description: req.body.description,
        facebook_url: req.body.facebook_url,
        instagram_url: req.body.instagram_url,
        linkedin_url: req.body.linkedin_url,
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
