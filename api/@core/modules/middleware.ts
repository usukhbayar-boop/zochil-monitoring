import logger from "lib/utils/logger";
import { Response, NextFunction } from "express";

import constants from "core/base/constants";
import { ApiRequest, DBConnection, User } from "core/types";
import moment from "moment";

export const authorizeModule =
  (db: DBConnection, module_uid = "web") =>
  async (req: ApiRequest, res: Response, next: NextFunction) => {
    let logMessage = "";
    const merchant_id: any = req.merchant_id;
    const module = await db.db_readonly
      .select("*")
      .from("modules")
      .whereRaw("uid = :module_uid", { module_uid })
      .limit(1)
      .then((res) => {
        return (res || {})[0] || {};
      });

    const module_subscription = await db.db_readonly
      .select("*")
      .from("module_subscriptions")
      .whereRaw("module_uid = :module_uid", { module_uid })
      .whereRaw("merchant_id = :merchant_id", { merchant_id })
      .limit(1)
      .then((res) => {
        return (res || {})[0] || {};
      });

    if (module) {
      if (
        module_subscription &&
        module.status === "enabled" &&
        ((!!module.billable &&
          module_subscription.bill_status === "paid" &&
          moment().isAfter(module_subscription.expire_at)) ||
          (!module.billable && module_subscription.status === "enabled"))
      ) {
        return next();
      } else {
        logMessage = "Module not subscribed";
      }
    } else {
      logMessage = "Module not found";
    }

    logger.error({
      path: req.path,
      message: logMessage,
      module_name: `auth/acl_middleware`
    });

    res.status(403).json({ status: constants.PERMISSION_DENIED });
  };
