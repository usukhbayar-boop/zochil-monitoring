import { Router } from "express";
import { DBConnection } from "core/types";

import SmsMessagesAdminService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new SmsMessagesAdminService(db, "sms_messages");

  routes.get(
    "/list",
    service.handleOk(
      async (req) =>
        await service.list(
          {
            phone: req.query.phone,
            message: req.query.message,
            merchant_id: req.query.merchant_id
          },
          {
            page: parseInt((req.query.page as string) || "1", 10)
          }
        )
    )
  );


  routes.get(
    "/list-by-merchant",
    service.handleOk(
      async (req) =>
        await service.listByMerchant()
    )
  );

  return routes;
};
