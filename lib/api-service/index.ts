import cors from 'cors';
import compression from 'compression';
import express, { Response } from 'express';
import { json as jsonParser, urlencoded } from 'body-parser';

export function startAPIService(buildRouter: Function) {
  if (process.env.DEV_SERVER === "local") {
    return;
  }

  const service = express();

  service.use(cors());
  service.use(jsonParser({ limit: '10mb' }));
  service.use(urlencoded({ extended: false }));
  service.use(compression());

  const port = process.env.PORT;
  const version = process.env.API_VERSION || "v2";
  const service_name = process.env.SERVICE_NAME;

  if (!port) {
    throw new Error('PORT environment variable has not defined.');
  }

  if (!service_name) {
    throw new Error('SERVICE_NAME environment variable has not defined.');
  }

  const prefix = `/${version}${service_name === "job" ? "" : `/${service_name}`}`;
  service.use(prefix, buildRouter());

  //@TODO replace endpoints on the app
  if (prefix === "/v3/marketplace") {
    service.use("/v3/lookbook", buildRouter());
  }

  service.get("/health-check", (_, res) => res.status(200).json({ status: "ok" }));
  service.use("*", (_: any, res: Response) => res.status(404).json({ status: "not_found" }));

  service.listen(port, () =>
    console.log(`> ${service_name.toUpperCase()} service started on http://localhost:${port}${prefix}`)
  );
}
