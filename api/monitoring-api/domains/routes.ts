import { Router } from "express";
import { body as checkBody } from "express-validator";

import DomainService from "./service";
import { DBConnection } from 'core/types';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new DomainService(db);

  routes.get(
    "/list",
    service.handleOk(
      async () =>
        await service.list()
    )
  );

  routes.post(
    "/link-domain",
    [
      checkBody("domain").not().isEmpty(),
      checkBody("theme").not().isEmpty(),
      checkBody("merchant_id").not().isEmpty(),
    ],
    service.handleOk(
      async (req) =>
        await service.linkDomain(
          req.body.merchant_id,
          req.body.domain,
          req.body.theme,
        )
    )
  );

  routes.post(
    "/check-domain",
    [
      checkBody("domain").not().isEmpty(),
      checkBody("merchant_id").not().isEmpty(),
    ],
    service.handleOk(
      async (req) =>
        await service.checkDomain(
          req.body.merchant_id,
          req.body.domain,
        )
    )
  );

  routes.post(
    "/remove",
    [
      checkBody("id").not().isEmpty(),
    ],
    service.handleOk(
      async (req) =>
        await service.removeDomain(
          req.body.id,
        )
    )
  );

  return routes;
};
