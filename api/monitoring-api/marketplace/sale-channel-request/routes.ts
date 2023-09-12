import { Router } from "express";
import { DBConnection } from "core/types";
import { authorize } from "core/auth/middlewares";
import { MONITORING_ROLES } from "core/base/constants";
import SaleChannelRequestMonitoringMarketPlaceService from "./service";
import { body as checkBody } from 'express-validator';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new SaleChannelRequestMonitoringMarketPlaceService(
    db,
    "sale_channel_requests"
  );

  routes.get(
    "/list",
    authorize(MONITORING_ROLES.MARKETPLACE_SALE_CHANNEL_REQUEST_VIEW),
    service.handleOk(
      async (req) =>
        await service.list(
          req.currentUser,
          {},
          { page: parseInt((req.query.page as string) || "1", 10) }
        )
    )
  );
  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.MARKETPLACE_SALE_CHANNEL_REQUEST_VIEW),
    service.handleOk(
      async (req) => await service.detail(req.params.id, req.currentUser)
    )
  );

  routes.post(
    "/accept",
    authorize(MONITORING_ROLES.MARKETPLACE_SALE_CHANNEL_REQUEST_MANAGE),
    checkBody(["shop_id", "sale_channel_request_id"]).not().isEmpty(),
    service.handleOk(async (req) => {
      return await service.accept({
        merchant_id: req.body.shop_id,
        request_id: req.body.sale_channel_request_id,
        user: req.currentUser
      });
    })
  );

  routes.post(
    "/reject",
    authorize(MONITORING_ROLES.MARKETPLACE_SALE_CHANNEL_REQUEST_MANAGE),
    checkBody(["shop_id", "sale_channel_request_id"]).not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.reject({
          user: req.currentUser,
          merchant_id: req.body.shop_id,
          request_id: req.body.sale_channel_request_id
        })
    )
  );

  return routes;
};
