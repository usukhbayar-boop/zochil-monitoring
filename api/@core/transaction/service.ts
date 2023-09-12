import qs from "qs";
import _ from "lodash";
import axios from "axios";
import moment from "moment";
import logger from "lib/utils/logger";
import APIService from "core/base/service";
import { DBConnection, ID } from "core/types";
import MerchantService from "core/merchants/service";
import PaymentServices from "lib/payment-services/factory";
import PaymentRequestService from "core/payment-requests/service";

export default class TransactionService extends APIService {
  private _merchantService: MerchantService;
  private _paymentRequestService: PaymentRequestService;
  constructor(db: DBConnection) {
    super(db, "payment_invoices");
    this._merchantService = new MerchantService(db, "shops");
    this._paymentRequestService = new PaymentRequestService(db);
  }

  async sendTransaction({
    provider,
    amount,
    phone,
    customer_full_name,
    shop_id,
    order_id,
    order_code,
    redirect_uri,
    token_type,
    account_id,
    retry,
    id,
    retry_count,
    settlement_status
  }: {
    provider: string;
    amount: number;
    phone: string;
    shop_id: ID;
    order_id: ID;
    order_code: string;
    redirect_uri: string;
    token_type: string;
    account_id?: ID;
    retry?: boolean;
    id?: ID;
    retry_count?: number;
    customer_full_name?: string;
    settlement_status: string;
  }) {
    const settings = await super.findOneByConditions(
      { uid: provider },
      "payment_integrations"
    );
    if (!retry) {
      id = await super.insert(
        {
          provider,
          amount,
          phone,
          shop_id,
          order_id,
          order_code,
          account_id,
          redirect_uri,
          status: "created"
        },
        "payment_invoices"
      );
    }
    const shop = await this._merchantService.getMerchant(shop_id, "id", true);

    if (shop) {
      try {
        const payment_options: any = {};
        settings.options.forEach((option: any) => {
          payment_options[option.key] = option.value;
        });
        let bill_no = `${order_code}_${order_id}`;
        if (retry) {
          bill_no = `${order_code}_${order_id}_${retry_count || 0 + 1}`;
          await super.update(
            {
              retry_count: (retry_count || 0) + 1
            },
            { id },
            "payment_invoices"
          );
        }
        const {
          response,
          invoiceno,
          checkout_url = "",
          error_message = "",
          qrcode,
          deeplinks
        } = await this._sendRequest({
          provider,
          extra: {
            amount,
            redirect_uri,
            shop,
            account_id,
            order_id,
            order_code,
            phone,
            customer_full_name,
            bill_no,
            settlement_status,
            socialDeeplink: "Y",
            zochil_phone: "70007788",
            now: moment().format("YYYY-MM-DD HH:mm"),
            description: `#${order_code} дугаартай захиалгын нэхэмжлэх`,
          },
          auth_params: settings.auth_params || {},
          header_selectors: settings.header_selectors || [],
          body_params: settings.create_params || {},
          api_url: settings.api_url,
          provider_process: !!settings.provider_process,
          success_conditions: settings.create_success_conditions || [],
          payment_options,
          action: "create_invoice"
        });
        await super.update(
          {
            provider,
            qrcode,
            invoiceno,
            checkout_url,
            error_message,
            status: "pending",
            response: JSON.stringify(response),
            deeplinks: JSON.stringify(deeplinks || "[]")
          },
          { id },
          "payment_invoices"
        );

        return { checkout_url, invoiceno };
      } catch (error: any) {
        logger.error({
          message: error.stack || error.message,
          module_name: !retry
            ? "transactions/create_invoice"
            : "transactions/retry-invoice"
        });

        await super.update(
          {
            status: "error",
            response: error.message,
            error_message: error.error_message || ""
          },
          { id }
        );
      }
    }
  }

  async checkInvoice({
    id,
    provider,
    account_id,
    merchant_id,
    order_id,
    settlement_status
  }: {
    id: ID;
    provider: string;
    order_id: ID;
    account_id?: ID;
    merchant_id?: ID;
    settlement_status: string;
  }) {
    let success = false;
    const invoice = await super.findOneByConditions({ id }, "payment_invoices");
    const settings = await super.findOneByConditions(
      { uid: provider },
      "payment_integrations"
    );

    if (invoice) {
      if (invoice.status === "paid") {
        success = true;
      } else {
        const shop = await this._merchantService.getMerchant(
          invoice.shop_id,
          "id",
          true
        );
        if (shop) {
          let access_token = shop[`${provider}_payment_token`] || "";
          let invoiceResponse = {};

          try {
            invoiceResponse = JSON.parse(invoice.response || "{}");
          } catch (err: any) {}

          const payment_options: any = {};
          settings.options.forEach((option: any) => {
            payment_options[option.key] = option.value;
          });
          try {
            const { status } = await this._sendRequest({
              provider,
              extra: {
                invoiceno: invoice.invoiceno,
                shop,
                account_id,
                merchant_id,
                order_id,
                invoice,
                settlement_status
              },
              auth_params: settings.auth_params || {},
              header_selectors: settings.header_selectors || [],
              body_params: settings.check_params || {},
              api_url: settings.api_url,
              provider_process: !!settings.provider_process,
              success_conditions: settings.check_success_conditions || [],
              payment_options,
              action: "check_invoice"
            });
            success = status === "success" ? true : false;
            if (success === true) {
              await super.update(
                {
                  status: "paid",
                  payment_date: new Date()
                },
                { id }
              );
            }
          } catch (error: any) {
            success = false;
          }
        }
      }
    }

    return { success };
  }

  async _authenticate({ url, method, payload, headers }: any) {
    try {
      const { data } = await axios({
        method,
        url,
        data: payload,
        headers
      });
      return data;
    } catch (error: any) {
      throw new Error(
        `${error.message},${JSON.stringify((error.response || {}).data)}`
      );
    }
  }

  async _sendRequest({
    provider,
    extra,
    auth_params,
    header_selectors,
    body_params,
    api_url,
    provider_process,
    success_conditions,
    payment_options,
    action
  }: {
    provider: string;
    extra: any;
    auth_params: any;
    header_selectors: any;
    body_params: any;
    api_url: string;
    provider_process: boolean;
    success_conditions: any;
    payment_options: any;
    action: string;
  }) {
    let error_message = "Нэхэмжлэх үүсэхэд алдаа гарлаа: ";
    // auth
    if (auth_params && auth_params.uri && auth_params.selectors) {
      let auth_required = true;
      if (auth_params.conditions) {
        auth_required = false;
        auth_params.conditions.forEach((cond: any) => {
          const val = eval(cond.selector);
          const res = this.checkCondition(cond, val);
          if (!res) {
            auth_required = true;
          }
        });
      }

      if (auth_required) {
        let auth_payload: any = this.buildParams({
          api_url,
          options: payment_options,
          extra,
          selectors: auth_params.selectors
        });

        let auth_headers: any = {};
        if (auth_params.headers) {
          auth_headers = this.buildParams({
            api_url,
            options: payment_options,
            extra,
            selectors: auth_params.headers
          });
        }
        auth_headers["Content-Type"] =
          auth_headers["Content-Type"] || "application/json";
        if (
          auth_headers["Content-Type"] === "application/x-www-form-urlencoded"
        ) {
          auth_payload = qs.stringify(auth_payload);
        }
        let auth_options = {
          url: `${api_url}${eval("`" + auth_params.uri + "`")}`,
          method: auth_params.method || "post",
          data: auth_payload,
          headers: auth_headers
        } as any;
        let auth_request_log: any = {
          provider,
          action: "authenticate",
          api_method: auth_options.method,
          api_url: auth_options.url,
          headers: auth_options.headers,
          body: auth_options.data,
          account_id: extra.account_id,
          merchant_id: extra.shop.id,
          order_id: extra.order_id
        };

        try {
          const { data, status }: any = await axios({ ...auth_options });
          auth_request_log.response = data;
          auth_request_log.status = status;
          extra.authorization = data;
          const result: any = this.buildParams({
            api_url,
            options: payment_options,
            extra,
            selectors: auth_params.response_selectors
          });
          payment_options = Object.assign(payment_options, result);

          if (auth_params.conditions) {
            const options = Object.entries(payment_options).map(
              ([key, value]) => ({
                key,
                value
              })
            );
            await super.update(
              {
                options: JSON.stringify(options)
              },
              { uid: provider },
              "payment_integrations"
            );
          }
        } catch (error: any) {
          auth_request_log.response = (error.response || {}).data;
          auth_request_log.status = (error.response || {}).status;
        }
        await this._paymentRequestService.create({
          ...auth_request_log,
          sensitive_selectors: auth_params.sensitive_selectors
        });
      } else {
        extra.authorization = {
          access_token: payment_options?.access_token || ""
        };
      }
    }

    // build request header
    let headers: any = [];
    if (header_selectors) {
      headers = this.buildParams({
        api_url,
        options: payment_options,
        extra,
        selectors: header_selectors
      });
    }
    headers["Content-Type"] = "application/json";

    // build request body
    let payload: any = {};
    if (body_params.selectors) {
      payload = this.buildParams({
        api_url,
        options: payment_options,
        extra,
        selectors: body_params.selectors
      });
    }
    if (body_params.conditions) {
      body_params.conditions.forEach((cond: any) => {
        const val = eval(cond.selector);
        const res = this.checkCondition(cond, val);
        if (!res) {
          error_message += cond.message ? eval("`" + cond.message + "`") : "";
          throw {
            error_message,
            message: "Failed request"
          };
        }
      });
    }

    let options = {
      method: body_params.method,
      data: payload,
      url: `${api_url}${eval("`" + body_params.uri + "`")}`,
      headers
    } as any;

    // pre processing
    if (provider_process) {
      options = await PaymentServices.preProcess(provider, options);
    }
    if (body_params.method === "post") {
      options.data = JSON.stringify(options.data);
    }

    const request_log: any = {
      provider,
      action: action,
      api_method: options.method,
      api_url: options.url,
      headers: options.headers,
      body: payload,
      query: options.query,
      account_id: extra.account_id,
      merchant_id: extra.shop.id,
      order_id: extra.order_id
    };

    try {
      const { data, status }: any = await axios({ ...options });
      extra.response = data;
      // build response
      if (success_conditions) {
        success_conditions.forEach((cond: any) => {
          const val = eval(cond.selector);
          const res = this.checkCondition(cond, val);
          if (!res) {
            error_message += cond.message ? eval("`" + cond.message + "`") : "";
            throw {
              error_message,
              message: "Failed request",
              response: { data, status }
            };
          }
        });
      }
      await this._paymentRequestService.create({
        response: data,
        status,
        ...request_log,
        sensitive_selectors: body_params.sensitive_selectors
      });
      const result: any = this.buildParams({
        api_url,
        options: payment_options,
        extra,
        selectors: body_params.response_selectors
      });
      return { ...result };
    } catch (error: any) {
      extra.response = (error.response || {}).data;
      await this._paymentRequestService.create({
        response: (error.response || {}).data,
        status: (error.response || {}).status,
        ...request_log,
        sensitive_selectors: body_params.sensitive_selectors
      });
      throw {
        error_message,
        message: "Failed request.",
        response: { data: (error.response || {}).data }
      };
    }
  }

  checkCondition(cond: any, val: string) {
    return (
      (cond.condition === "not_null" && val !== undefined) ||
      (cond.condition === "equal" && val === cond.value) ||
      (cond.condition === "not_equal" && val !== cond.value)
    );
  }

  buildParams({
    api_url,
    options,
    extra,
    selectors
  }: {
    api_url: string;
    options: any;
    extra: any;
    selectors: any;
  }) {
    const data: any = {};
    selectors.forEach((item: any) => {
      const splitted: any[] = item.field.split(".");
      let field = "";
      let from = item.from;
      let selector = item.selector;
      splitted.forEach((s, i) => {
        field += s;
        if (i + 1 < splitted.length) {
          const val = _.get(data, field);
          if (!val) {
            _.set(data, field, {});
          }
          field += ".";
        } else {
          if (item.conditions) {
            item.conditions.forEach((cond: any) => {
              const val = eval(cond.selector);
              const res = this.checkCondition(cond, val);
              if (res) {
                from = cond.data.from;
                selector = cond.data.selector;
              }
            });
          }
          if (from === "options") {
            _.set(data, field, options[selector]);
          } else if (from === "template") {
            _.set(data, field, eval("`" + selector + "`"));
          } else {
            _.set(data, field, eval(selector));
          }
        }
      });
    });
    return data;
  }
}
