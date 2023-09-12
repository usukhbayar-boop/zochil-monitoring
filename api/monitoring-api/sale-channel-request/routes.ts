import { Router } from "express";
import { body as checkBody } from "express-validator";

import { DBConnection } from "core/types";
import { authenticateAdmin } from "core/auth/middlewares";

import SaleChannelRequestMonitoringService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();

  const service = new SaleChannelRequestMonitoringService(db);
  routes.use(authenticateAdmin(db));

  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            shop_id: req.body.shop_id,
            sale_channel: req.body.sale_channel,
            name: req.body.name,
            uid: req.body.uid,
            status: req.body.status,
            phone_number: req.body.phone_number,
            email: req.body.email
          },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );

  routes.get(
    "/detail-shop/:shop_id",
    service.handleOk(
      async (req, res) =>
        await service.detailShop({ shop_id: req.params.shop_id })
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req, res) => {
      return await service.detail({ id: req.params.id });
    })
  );

  routes.post(
    "/accept",
    service.handleOk(async (req, res) => {
      return await service.accept({
        merchant_id: req.body.shop_id,
        request_id: req.body.sale_channel_request_id
      });
    })
  );

  routes.post(
    "/reject",
    service.handleOk(async (req, res) => {
      return await service. reject({
        merchant_id: req.body.shop_id,
        request_id: req.body.sale_channel_request_id
      });
    })
  );

  routes.post(
    "/update",
    service.handleOk(async (req, res) => {
      return await service.updateSaleChannelRequest({
        shop_id: req.body.shop_id,
        status: req.body.status,
        sale_channel: req.body.sale_channel,
        sale_channel_request_id: req.body.sale_channel_request_id
      });
    })
  );

  routes.post(
    "/update-sale-channel",
    service.handleOk(async (req, res) => {
      return await service.updateSaleChannelRequestByName({
        shop_id: req.body.shop_id,
        status: req.body.status,
        sale_channel: req.body.sale_channel
      });
    })
  );

  return routes;
};
