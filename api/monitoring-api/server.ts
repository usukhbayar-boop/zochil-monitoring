import { Router } from "express";

import redis from "lib/connectors/redis";
import { db, db_readonly } from "lib/connectors/knex";

import files from "./files/routes";
import shops from "./shops/routes";
import users from "./users/routes";
import admins from "./admins/routes";
import marketplace_admins from "./marketplace-admins/routes";
import manager from "./manager/routes";
import orders from "./orders/routes";
import issues from "./issues/routes";
import domains from "./domains/routes";
import products from "./products/routes";
import invoices from "./invoices/routes";
import analytics from "./analytics/routes";
import cms_posts from "./cms/posts/routes";
import cms_agents from "./cms/agents/routes";
import broadcasts from "./broadcasts/routes";
import settlements from "./settlements/routes";
import collections from "./collections/routes";
import sms_messages from "./sms-messages/routes";
import product_categories from "./product-categories/routes";
import product_attributes from "./product-attributes/routes";
import crowdfund_campaigns from "./crowdfund/campaigns/routes";
import crowdfund_donations from "./crowdfund/donations/routes";
import sale_channel_requests from "./sale-channel-request/routes";
import merchants from "./merchants/routes";
import merchant_contracts from "./merchant-contracts/routes";
import module_subscriptions from "./module-subscriptions/routes";
import modules_list from "./module/routes";


import payment_requests from "./payment_requests/routes";
import payment_invoices from "./payment_invoices/routes";

import sellers from "./sellers/routes";
import merchant_categories from "./merchant-categories/routes";

import look from "./look/routes";
import expos from "./expos/routes";

import { startAPIService } from "lib/api-service";
import { authenticateAdmin } from "core/auth/middlewares";

export const buildRouter = () => {
  const router: any = Router();
  const db_connector = { db, db_readonly, kv: redis };

  router.use("/shops", shops(db_connector));
  router.use("/admins", admins(db_connector));
  router.use("/marketplace-admins", marketplace_admins(db_connector));
  router.use("/manager", manager(db_connector));
  router.get("/health-check", (_: any, res: any) =>
    res.status(200).json({ status: "ok" })
  );
  router.use("/merchants", merchants(db_connector));

  router.use("*", authenticateAdmin(db_connector));
  router.use("/files", files(db_connector));
  router.use("/users", users(db_connector));
  router.use("/orders", orders(db_connector));
  router.use("/issues", issues(db_connector));
  router.use("/domains", domains(db_connector));
  router.use("/invoices", invoices(db_connector));
  router.use("/analytics", analytics(db_connector));
  router.use("/cms/posts", cms_posts(db_connector));
  router.use("/cms/agents", cms_agents(db_connector));
  router.use("/broadcasts", broadcasts(db_connector));
  router.use("/settlements", settlements(db_connector));
  router.use("/sms-messages", sms_messages(db_connector));
  router.use("/payment-invoice", payment_invoices(db_connector));
  router.use("/payment-requests", payment_requests(db_connector));
  router.use("/product-categories", product_categories(db_connector));
  router.use("/product-attributes", product_attributes(db_connector));
  router.use("/sale-channel-requests", sale_channel_requests(db_connector));
  router.use("/products", products(db_connector));
  router.use("/collections", collections(db_connector));
  router.use("/merchant-contracts", merchant_contracts(db_connector));
  router.use("/module-subscriptions", module_subscriptions(db_connector));
  router.use("/module", modules_list(db_connector));
  router.use("/sellers", sellers(db_connector));
  router.use("/merchant-categories", merchant_categories(db_connector));
  router.use("/crowdfund/campaigns", crowdfund_campaigns(db_connector));
  router.use("/crowdfund/donations", crowdfund_donations(db_connector));
  router.use("/look", look(db_connector));
  router.use("/expos", expos(db_connector));
  return router;
};

startAPIService(buildRouter);
