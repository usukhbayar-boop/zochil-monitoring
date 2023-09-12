import axios from "axios";
import logger from "lib/utils/logger";
import APIService from "core/base/service";
import MerchantService from "core/merchants/service";
import PaymentServices from "lib/payment-services/factory";
import { DBConnection, ID } from "core/types";
import _, { pickBy } from "lodash";
import moment from "moment";

export default class PaymentRequestService extends APIService {
  private _merchantService: MerchantService;
  constructor(db: DBConnection) {
    super(db, "payment_requests");
    this._merchantService = new MerchantService(db, "shops");
  }

  async create({
    provider,
    status,
    action,
    api_method,
    api_url,
    headers,
    body,
    query,
    account_id,
    merchant_id,
    response,
    order_id,
    sensitive_selectors
  }: {
    provider: string;
    status: string;
    action: string;
    api_method: string;
    api_url: string;
    headers: any;
    body: any;
    query: any;
    account_id: number;
    merchant_id: number;
    response: any;
    order_id: number;
    sensitive_selectors?: any;
  }) {
    const values: any = pickBy(
      {
        provider,
        status,
        action,
        api_method,
        api_url,
        headers,
        body:
          typeof body !== "object" || body instanceof Array
            ? { data: body }
            : body,
        query,
        account_id,
        merchant_id,
        response:
          typeof response !== "object" || response instanceof Array
            ? { data: response }
            : response,
        order_id
      },
      (v) => v !== undefined
    );
    if (sensitive_selectors) {
      sensitive_selectors.forEach((selector: string) => {
        const splitted: any[] = selector.split(".");
        let field = splitted[0];
        for (let i = 1; i < splitted.length; i++) {
          field += `["${splitted[i]}"]`;
          if (!!eval(field)) {
            if (i + 1 === splitted.length) {
              _.set(values, field, "********");
            }
          } else {
            break;
          }
        }
      });
    }
    const id = await super.insert(values);
    return { id };
  }
}
