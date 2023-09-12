import pick from "lodash/pick";
import { Router } from "express";
import { body as check } from "express-validator";

import MerchantAdminService from "./service";
import { DBConnection } from "core/types";
import { MONITORING_ROLES } from "core/base/constants";
import { authenticateAdmin, authorize } from "core/auth/middlewares";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new MerchantAdminService(db, "merchants");

  routes.use("*", authenticateAdmin(db));
  routes.get(
    "/list",
    authorize(MONITORING_ROLES.SHOP_VIEW),
    service.handleOk(
      async (req) =>
        await service.list(
          {
            name: req.query.name,
            phone: req.query.phone,
            status: req.query.status,
            end: req.query.end,
            start: req.query.start,
          },
          {
            page: parseInt(req.query.page as string),
            limit: parseInt(req.query.limit as string)
          }
        )
    )
  );

  routes.get(
    "/export-as-xlsx",
    authorize("", true),
    service.handleOk(
      async (req, res) =>
        await service.exportAsXLSX({
          end: req.query.end,
          start: req.query.start,
          status: req.query.status
        })
    )
  );

  routes.get(
    "/list-categories",
    authorize(MONITORING_ROLES.SHOP_VIEW),
    service.handleOk(async () => await service.listCategories())
  );


  routes.get(
    "/detail/:id",
    authorize(MONITORING_ROLES.SHOP_VIEW),
    service.handleOk(async (req, res) => await service.detail(req.params.id))
  );


  routes.post(
    "/add-option",
    authorize(MONITORING_ROLES.SHOP_MANAGE),
    [
      check("id").not().isEmpty(),
      check("key").not().isEmpty(),
      check("value").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.addOption({
          key: req.body.key,
          value: req.body.value,
          merchant_id: req.body.id
        })
    )
  );

  routes.post(
    "/link-user",
    authorize(MONITORING_ROLES.SHOP_MANAGE),
    [check("id").not().isEmpty()],
    [check("phone").not().isEmpty()],
    service.handleOk(async (req, res) => await service.linkUser(req.body.id, req.body.phone))
  );

  routes.post(
    "/unlink-user",
    authorize(MONITORING_ROLES.SHOP_MANAGE),
    [check("merchant_id").not().isEmpty()],
    [check("user_id").not().isEmpty()],
    service.handleOk(async (req, res) => await service.unlinkUser(req.body.merchant_id, req.body.user_id))
  );

  routes.post(
    "/remove-option",
    [check("id").not().isEmpty(), check("key").not().isEmpty()],
    service.handleOk(
      async (req, res) => await service.removeOption(req.body.id, req.body.key)
    )
  );

  routes.post(
    "/add-payment-method",
    authorize(MONITORING_ROLES.SHOP_MANAGE),
    [
      check("provider").not().isEmpty(),
      check("bank").not().isEmpty(),
      check("account_number").not().isEmpty(),
      check("account_holder").not().isEmpty(),
      check("id").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.addPaymentMethod({
          provider: req.body.provider,
          bank: req.body.bank,
          merchant_id: req.body.id,
          account_number: req.body.account_number,
          account_holder: req.body.account_holder
        })
    )
  );

  routes.post(
    "/remove-payment-method",
    authorize(MONITORING_ROLES.SHOP_MANAGE),
    [check("id").not().isEmpty(), check("provider").not().isEmpty()],
    service.handleOk(
      async (req, res) =>
        await service.removePaymentMethod(req.body.id, req.body.provider)
    )
  );

  routes.post(
    "/update",
    authorize(MONITORING_ROLES.SHOP_MANAGE),
    [
      check("id").not().isEmpty(),
      check("uid").not().isEmpty(),
      check("name").not().isEmpty(),
      check("phone").not().isEmpty()
    ],
    service.handleOk(
      async (req, res) =>
        await service.updateMerchant(
          req.body.id,
          {
            logo: req.body.logo,
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
          },
          {
            favicon: req.body.favicon,
            ...pick(req.body, [
              "checkout_form_type",
              "chatbot_product_home_image_url",
              "chatbot_product_all_image_url",
              "chatbot_product_sales_image_url",
              "chatbot_product_featured_image_url",
              "chatbot_post_home_image_url",
              "chatbot_contact_home_image_url",
              "chatbot_contact_call_now_image_url",
              "chatbot_contact_branches_now_image_url",
              "chatbot_help_faq_image_url",
              "chatbot_help_about_image_url",
              "chatbot_help_terms_image_url",
              "main_account_bank",
              "main_account_number",
              "main_account_holder",
              "order_min_limit",
              "order_max_limit",
              "mainBanner1",
              "mainBanner2",
              "mainBanner3",
              "enabled_delivery_companies",
              "order_sms_template_1",
              "order_sms_template_2",
              "pixel_id",
              "facebook_verification_token",
            ]),
            has_chatbot: req.body.has_chatbot === "enabled" ? "1" : null,
            order_sms_enabled:
              req.body.order_sms_enabled === "enabled" ? "1" : null
          }
        )
    )
  );

  return routes;
};
