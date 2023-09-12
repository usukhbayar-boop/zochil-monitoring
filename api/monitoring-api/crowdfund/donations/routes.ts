import { Router } from 'express';
import { body as check } from 'express-validator';

import DonationsAdminService from './service';
import { DBConnection, DBQuery, RedisClientAsync } from "core/types";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new DonationsAdminService(db);

  routes.get(
    '/list',
    service.handleOk(async (req) =>
      await service.list(
        {
          // filters
          code: req.query.code,
          name: req.query.name,
          start: req.query.start,
          end: req.query.end,
          phone: req.query.phone,
          status: req.query.status,
          campaign_id: req.query.campaign_id,
          campaign_type: req.query.campaign_type,
          amount: req.query.amount,
        },
        {
          page: parseInt((req.query.page || "1") as string, 10),
          limit: parseInt((req.query.limit || "50") as string, 10),
        }
      )
    )
  );

  routes.get(
    '/detail/:id',
    service.handleOk(async (req, res) =>
      await service.detail(req.params.id),
    )
  );

  return routes;
};
