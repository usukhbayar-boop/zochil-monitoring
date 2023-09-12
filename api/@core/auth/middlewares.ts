import omit from "lodash/omit";
import jwt from "jsonwebtoken";
import logger from "lib/utils/logger";
import { Response, NextFunction } from "express";

import constants from "core/base/constants";
import { ApiRequest, DBConnection, User } from "core/types";
import moment from "moment";

export const authenticate =
  (db: DBConnection, tableName = "users", pass?: boolean) =>
  async (req: ApiRequest, res: Response, next: NextFunction) => {
    let logMessage = "";

    if (!process.env.AUTH_SECRET) {
      logMessage = "AUTH_SECRET not configured.";
    }

    const tokenKey = req.headers["access-token"] as string;
    const merchant_id = req.headers["merchant-id"] as string;
    const udid = req.headers["device-id"] as string;
    let device;

    if (tokenKey) {
      let accessToken;
      if (tableName === "users" && udid) {
        device = await db.db_readonly
          .select("*")
          .from("devices")
          .whereRaw("is_logged = true")
          .whereRaw("expire_at > current_timestamp")
          .whereRaw("token_key = :token_key", { token_key: tokenKey })
          .whereRaw("udid = :udid", { udid })
          .limit(1)
          .then((res) => {
            return (res || {})[0] || {};
          });
        accessToken = device.jwt_token;
      } else {
        accessToken = await db.kv.getAsync(constants.REDIS_PREFIX + tokenKey);
      }

      if (accessToken) {
        try {
          const authInfo: any = jwt.verify(
            accessToken,
            process.env.AUTH_SECRET as string
          );

          const results = await db
            .db_readonly(tableName)
            .where({ id: authInfo.id })
            .limit(1);

          if (results && results.length) {
            req.merchant_id = !merchant_id ? null : parseInt(merchant_id, 10);
            req.currentUser = omit(
              results[0],
              "hashed_password",
              "facebook_token"
            ) as User;
            if (device && device.id) {
              await db
                .db("devices")
                .where({ id: device.id })
                .update({
                  expire_at: moment().add(14, "day").toDate(),
                  updated_at: new Date()
                });
            }
            return next();
          } else {
            logMessage = "User not found";
          }
        } catch (error: any) {
          logMessage = "Access token verification failed.";
        }
      } else {
        logMessage = "Access token not found.";
      }
    } else {
      logMessage = "Token header not found.";
    }

    let _pass = !!pass;
    if (!_pass && tableName === "accounts") {
      _pass = !!req?.body?.guest;
    }

    if (!_pass) {
      logger.error({
        path: req.path,
        message: logMessage,
        module_name: `auth/${tableName}_middleware`
      });

      res.status(401).json({ status: constants.ACCESS_DENIED });
    } else {
      return next();
    }
  };

// for admins
export const authorize =
  (role: string, haveToSuper = false) =>
  async (req: ApiRequest, res: Response, next: NextFunction) => {
    let logMessage = "";
    const currentUser = req.currentUser;

    if (currentUser.is_super) {
      return next();
    } else if (!haveToSuper) {
      if ((currentUser.roles || []).indexOf(role) > -1) {
        return next();
      } else {
        logMessage = "Authorization error";
      }
    } else {
      logMessage = "Has to be super";
    }

    logger.error({
      path: req.path,
      message: logMessage,
      module_name: `auth/acl_middleware`
    });

    res.status(403).json({ status: constants.PERMISSION_DENIED });
  };

// for admins
export const authenticateAdmin = (db: DBConnection) => {
  return authenticate(db, "admins");
};

// for user accounts for websites
export const authenticateAccount = (db: DBConnection) => {
  return authenticate(db, "accounts");
};

// for user accounts for
export const authenticateAccountCustomer = (db: DBConnection) => {
  return authenticate(db, "customer_accounts");
};

// for user accounts for
export const authenticateDelivery = (db: DBConnection) => {
  return authenticate(db, "delivery_accounts");
};

export const authenticateLookbook = (db: DBConnection, pass?: boolean) => {
  return authenticate(db, "lookbook_accounts", pass);
};
