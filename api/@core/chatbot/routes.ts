import { Router } from "express";

import logger from "lib/utils/logger";
import WebhookService from "./service/webhook";
import { DBConnection } from "core/types";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new WebhookService(db);

  routes.get(
    "/",
    service.handle(async (req, res) => {
      const success = await service.verify({
        mode: req.query["hub.mode"] as string,
        token: req.query["hub.verify_token"] as string
      });

      if (success) {
        res.status(200).send(req.query["hub.challenge"]);
      } else {
        res.sendStatus(403);
      }
    })
  );

  routes.post(
    "/",
    service.handle(async (req, res) => {
      const body = req.body || {};
      if (body.object === "page") {
        try {
          for (const entry of body.entry) {
            await service.process(entry.messaging[0] || {});
          }
        } catch (error: any) {
          logger.error({
            message: error.stack  || error.message,
            module_name: 'order_jobs/send_sms',
          });
        }

        res.status(200).send("EVENT_RECEIVED");
      } else {
        throw {
          responseCode: 404,
          message: "Not found",
          responseStatus: "not_found"
        };
      }
    })
  );

  return routes;
};
