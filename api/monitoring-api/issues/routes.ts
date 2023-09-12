import { Router } from "express";
import { body as checkBody, query as checkQuery } from "express-validator";

import AdminIssueService from "./service";
import { DBConnection, ID } from 'core/types';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new AdminIssueService(db);

  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            code: req.query.code as string,
            status: req.query.status as string,
            merchant_id: req.query.merchant_id as ID,
          },
          {
            page: parseInt(req.query.page as string || "1"),
            limit: parseInt(req.query.limit as string || "50"),
          }
        )
    )
  );

  routes.get(
    "/detail",
    checkQuery("id").not().isEmpty(),
    service.handleOk(
      async (req) =>
        await service.detail(req.query.id as ID),
    )
  );

  routes.post(
    "/create",
    [
      checkBody("issue_type").not().isEmpty(),
      checkBody("merchant_id").not().isEmpty(),
    ],
    service.handleOk(
      async (req, res) =>
        await service.create({
          title: req.body.title,
          owner_id: req.body.owner_id,
          issue_type: req.body.issue_type,
          description: req.body.description,
          merchant_id: req.body.merchant_id,
          qpay_account_bank: req.body.qpay_account_bank,
          qpay_account_number: req.body.qpay_account_number,
          qpay_account_holder: req.body.qpay_account_holder,
          monpay_english_name: req.body.monpay_english_name,
          monpay_branch_username: req.body.monpay_branch_username,
        }),
    )
  );

  routes.post(
    "/update",
    [
      checkBody("id").not().isEmpty(),
    ],
    service.handleOk(
      async (req, res) =>
        await service.update({
          id: req.body.id,
          title: req.body.title,
          description: req.body.description,
          qpay_account_bank: req.body.qpay_account_bank,
          qpay_account_number: req.body.qpay_account_number,
          qpay_account_holder: req.body.qpay_account_holder,
          monpay_english_name: req.body.monpay_english_name,
          monpay_branch_username: req.body.monpay_branch_username,
        }),
    )
  );

  routes.post(
    "/change-status",
    [
      checkBody("id").not().isEmpty(),
      checkBody("status").not().isEmpty(),
    ],
    service.handleOk(
      async (req, res) =>
        await service.changeStatus(
          req.body.id,
          req.body.status,
        ),
    )
  );

  routes.post(
    "/remove",
    checkBody("id").not().isEmpty(),
    service.handleOk(
      async (req, res) =>
        await service.remove(req.body.id),
    )
  );

  return routes;
};
