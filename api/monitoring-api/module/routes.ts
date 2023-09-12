import { Router } from "express";
import { DBConnection, ID } from "core/types";

import ModulesListService from "./service";

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new ModulesListService(db, "modules");

  routes.get(
    "/list",
    service.handleOk(
      async (req, res) =>
        await service.list(
          {
            uid: req.query.uid as ID,
            name: req.query.name as string,
            module_type: req.query.module_type as string,
            status: req.query.status as string,
            require_contract: req.query.require_contract as string,
            website: req.query.website as string,
            billable: req.query.billable as string,
            require_approval: req.query.require_approval as string
          },
          {
            // options
            page: parseInt((req.query.page as string) || "1"),
            limit: parseInt((req.query.limit as string) || "50")
          }
        )
    )
  );

  routes.get(
    "/detail/:id",
    service.handleOk(async (req) => await service.detail(req.params.id))
  );

  routes.post(
    "/update",
    service.handleOk(async (req) => await service.update({
      id: req.body.id,
      name: req.body.name,
      description: req.body.description,
      short_description: req.body.short_description,
      module_type: req.body.module_type,
      status: req.body.status,
      terms: req.body.terms,
      image: req.body.image,
      rules: req.body.rules,
      require_contact: req.body.require_contact,
      website: req.body.website,
      billable: req.body.billable,
      images: req.body.images,
      require_approval: req.body.require_approval
    }))
  );

  return routes;
};
