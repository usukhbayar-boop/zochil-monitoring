import cors from 'cors';
import compression from 'compression';
import express, { Response, Router } from 'express';
import { json as jsonParser, urlencoded } from 'body-parser';

import * as user from "../../api/user-api/server";
import * as order from "../../api/order-api/server";
import * as catalog from "../../api/catalog-api/server";
import * as admin from "../../api/admin-api/server";
import * as analytics from "../../api/analytics-api/server";
import * as storefront from "../../api/storefront-api/server";
import * as monitoring from "../../api/monitoring-api/server";
import * as marketplace from "../../api/marketplace-api/server";

const server = express();

server.use(cors());
server.use(jsonParser({ limit: '10mb' }));
server.use(urlencoded({ extended: false }));
server.use(compression());

const port = process.env.PORT;
const version = process.env.API_VERSION || "v2";

if (!port) {
  throw new Error('PORT environment variable has not defined.');
}

const rootRouter = Router();

rootRouter.use("/user", user.buildRouter());
rootRouter.use("/order", order.buildRouter());
rootRouter.use("/catalog", catalog.buildRouter());
rootRouter.use("/admin", admin.buildRouter());
rootRouter.use("/analytics", analytics.buildRouter());
rootRouter.use("/storefront", storefront.buildRouter());
rootRouter.use("/monitoring", monitoring.buildRouter());
rootRouter.use("/marketplace", marketplace.buildRouter());
rootRouter.use("*", (_: any, res: Response) => res.status(404).json({ status: "not_found" }));

server.use(`/${version}`, rootRouter);;

server.listen(port, () =>
  console.log(`> DEV server started on http://localhost:${port}/${version}`)
);
