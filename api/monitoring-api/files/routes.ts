import { Router } from "express";
import { body as check } from "express-validator";

import FileService from "./service";
import { DBConnection } from 'core/types';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new FileService(db);

  routes.post(
    "/upload-image",
    [check("image").not().isEmpty()],
    service.handleOk(async (req) => await service.uploadImage(req.body.image))
  );

  routes.post(
    "/upload-images",
    [check("images").not().isEmpty()],
    service.handleOk(
      async (req) => await service.uploadImages(req.body.images)
    )
  );

  routes.post(
    "/remove-image",
    [check("url").not().isEmpty()],
    service.handleOk(async (req) => await service.removeImage(req.body.url))
  );

  return routes;
};
