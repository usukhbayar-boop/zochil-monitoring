import { Router } from 'express';
import CampaignAdminService from './service';
import { DBConnection, DBQuery, RedisClientAsync } from "core/types";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new CampaignAdminService(db);

  routes.get(
    '/list',
    service.handleOk(async (req) =>
      await service.list({
        name: req.query.name,
        campaign_type: req.query.campaign_type,
      }, {
        page: parseInt((req.query.page || "1") as string, 10),
        limit: parseInt((req.query.limit || "10") as string, 10),
      }),
    ),
  );

  routes.get(
    '/detail/:id',
    service.handleOk(async (req) =>
      await service.detail(req.params.id),
    ),
  );

  routes.post(
    '/create',
    service.handleOk(async (req) =>
      await service.create({
        title: req.body.title,
        goal: req.body.goal,
        image: req.body.image,
        category_id: req.body.category_id,
        description: req.body.description,
        category_name: req.body.category_name,
        due_date: req.body.due_date,
        summary: req.body.summary,
        mission: req.body.mission,
        risk: req.body.risk,
        finance: req.body.finance,
        gallery: req.body.gallery,
        status: req.body.status,
        address: req.body.address,
        google_map_data: req.body.google_map_data,
        lat_lng: req.body.lat_lng,
        zoom: req.body.zoom,
        campaign_type: req.body.campaign_type,
        plant_types: req.body.plant_types,
      }),
    ),
  );

  routes.post(
    '/update',
    service.handleOk(async (req) =>
      await service.update({
        id: req.body.id,
        title: req.body.title,
        goal: req.body.goal,
        image: req.body.image,
        category_id: req.body.category_id,
        description: req.body.description,
        category_name: req.body.category_name,
        due_date: req.body.due_date,
        summary: req.body.summary,
        mission: req.body.mission,
        risk: req.body.risk,
        finance: req.body.finance,
        gallery: req.body.gallery,
        status: req.body.status,
        address: req.body.address,
        google_map_data: req.body.google_map_data,
        lat_lng: req.body.lat_lng,
        zoom: req.body.zoom,
        plant_types: req.body.plant_types,
        campaign_type: req.body.campaign_type,
      }),
    ),
  );

  routes.post(
    '/remove',
    service.handleOk(async (req) =>
      await service.remove(req.body.id),
    ),
  );

  return routes;
};
