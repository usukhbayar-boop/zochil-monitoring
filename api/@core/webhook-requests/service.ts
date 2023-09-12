import APIService from "core/base/service";
import { DBConnection } from "core/types";
import _, { pickBy } from "lodash";

export default class WebhookRequestService extends APIService {
  constructor(db: DBConnection) {
    super(db, "webhook_requests");
  }

  async create({
    provider,
    url,
    method,
    headers,
    params,
    invoiceno
  }: {
    provider: string;
    url: string;
    method: string;
    headers: any;
    params: any;
    invoiceno?: string;
  }) {
    const values: any = pickBy(
      {
        provider,
        url,
        method,
        headers,
        params,
        invoiceno
      },
      (v) => v !== undefined
    );
    const id = await super.insert(values);
    return { id };
  }
}
