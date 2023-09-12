import { Router } from "express";
import { DBConnection, ID } from "core/types";

import MerchantContractsService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new MerchantContractsService(db, "merchant_contracts");

  routes.get("/list", service.handleOk(
    async (req, res) => {
      await service.list(
        {
          merchant_id: req.query.merchant_id as ID,
          phone: req.query.phone as string,
          contract_no: req.query.contract_no as string,
          start: req.query.start as any,
          end: req.query.end as any,
          status: req.query.status as string,
          full_name: req.query.full_name as string
        },
        {
          page: parseInt((req.query.page as string) || "1"),
          limit: parseInt((req.query.limit as string) || "50")
        }
      )
    }
  ));

  routes.get(
    "/detail/:id",
    service.handleOk(async (req, res) => await service.detail(req.params.id))
  );

  return routes;
}
