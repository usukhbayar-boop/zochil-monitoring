import pickBy from "lodash/pickBy";
import moment from "moment";
import logger from "lib/utils/logger";

import { DBConnection, ID } from "core/types";
import APIService from "core/base/service";
import MerchantService from "core/merchants/service";
import TransactionService from "core/transaction/service";
import ModulePlanService from "core/module-plans/service";
import { filter } from "lodash";
import CustomError from "lib/errors/custom_error";

const { QPAY_ZOCHIL_MERCHANT_ID, QPAY_ZOCHIL_TEMPLATE_ID } = process.env;

export default class BillService extends APIService {
  _merchantService: MerchantService;
  private _transactionService: TransactionService;
  private _modulePlanService: ModulePlanService;
  constructor(db: DBConnection) {
    super(db, "bills");
    this._merchantService = new MerchantService(db, "shops");
    this._transactionService = new TransactionService(db);
    this._modulePlanService = new ModulePlanService(db);
  }

  async create({
    user_id,
    merchant_id,
    module_uid,
    quantity
  }: {
    user_id: ID;
    merchant_id: ID;
    module_uid: string;
    quantity: number;
  }) {
    const MODULE_MAP: any = {
      base: "Систем сунгалт",
      sms: "SMS цэнэглэлт"
    };
    const MODULE_PRICE_MAP: any = {
      base: 66000,
      sms: 77
    };
    const amount = MODULE_PRICE_MAP[module_uid] * quantity;
    const shop = await this._merchantService.getMerchant(merchant_id);
    const settings = await super.findOneByConditions(
      { uid: "qpay" },
      "payment_integrations"
    );
    const values = pickBy(
      {
        status: "pending",
        merchant_id,
        module: `${module_uid}_${quantity}`,
        amount,
        provider: "qpay",
        quantity,
        user_id,
        bill_type: "module"
      },
      (v) => v !== undefined
    );
    const id = await this.insert(values, this.tableName, "id");

    if (shop) {
      try {
        const payment_options: any = {};
        settings.options.forEach((option: any) => {
          payment_options[option.key] = option.value;
        });
        let bill_no = `s${merchant_id}-${moment().format("YYYYMMDDHHmmss")}`;

        const {
          invoiceno,
          error_message = "",
          qrcode,
          deeplinks
        } = await this._transactionService._sendRequest({
          provider: "qpay",
          extra: {
            amount,
            shop: {
              name: "Zochil",
              qpay_template_id: QPAY_ZOCHIL_TEMPLATE_ID,
              qpay_merchant_id: QPAY_ZOCHIL_MERCHANT_ID
            },
            order_id: id,
            order_code: "bill",
            zochil_phone: "77778787",
            now: moment().format("YYYY-MM-DD HH:mm"),
            description: `#${MODULE_MAP[module_uid]} ${quantity} ${module_uid === "web" ? "сарын" : ""
              } үйлчилгээний нэхэмжлэх`,
            bill_no
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
            provider: "qpay",
            qrcode,
            invoiceno,
            error_message,
            status: "pending",
            deeplinks: JSON.stringify(deeplinks || "[]")
          },
          { id }
        );

        return { qrcode, deeplinks, id };
      } catch (error: any) {
        logger.error({
          message: error.stack || error.message,
          module_name: "transactions/create_invoice"
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

  async checkInvoice({ id }: { id: ID }) {
    let success = false;
    const bill = await super.findOneByConditions({ id });
    const settings = await super.findOneByConditions(
      { uid: "qpay" },
      "payment_integrations"
    );

    if (bill) {
      if (bill.status === "paid") {
        success = true;
      } else {
        const payment_options: any = {};
        settings.options.forEach((option: any) => {
          payment_options[option.key] = option.value;
        });
        try {
          const { status } = await this._transactionService._sendRequest({
            provider: "qpay",
            extra: {
              invoiceno: bill.invoiceno,
              shop: {
                name: "Zochil",
                qpay_template_id: QPAY_ZOCHIL_TEMPLATE_ID,
                qpay_merchant_id: QPAY_ZOCHIL_MERCHANT_ID
              }
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

    return success;
  }
  async createModuleInvoice({
    user_id,
    merchant_id,
    module_uid,
    quantity
  }: {
    user_id: ID;
    merchant_id: ID;
    module_uid: string;
    quantity: number;
  }) {
    const module = await super.findOneByConditions(
      { uid: module_uid },
      "modules"
    );
    if (!module) {
      throw new CustomError(
        `Module not found: ${module_uid}`,
        `Модул олдсонгүй: ${module_uid}`
      );
    } else if (!module.billable) {
      throw new CustomError(
        `Module is not billable: ${module_uid}`,
        `Модул төлбөргүй: ${module_uid}`
      );
    }
    const modulePrice = filter(module.rules, (rule) => {
      return rule.type === "subscription";
    });
    const amount = (modulePrice[0]?.subscription_price || 0) * quantity;
    const shop = await this._merchantService.getMerchant(merchant_id);
    const settings = await super.findOneByConditions(
      { uid: "qpay" },
      "payment_integrations"
    );
    const values = pickBy(
      {
        status: "pending",
        merchant_id,
        module: module.uid,
        amount,
        provider: "qpay",
        quantity,
        user_id,
        bill_type: "module"
      },
      (v) => v !== undefined
    );
    const id = await this.insert(values, this.tableName, "id");

    if (shop) {
      try {
        const payment_options: any = {};
        settings.options.forEach((option: any) => {
          payment_options[option.key] = option.value;
        });
        let bill_no = `s${merchant_id}-${moment().format("YYYYMMDDHHmmss")}`;

        const {
          invoiceno,
          error_message = "",
          qrcode,
          deeplinks
        } = await this._transactionService._sendRequest({
          provider: "qpay",
          extra: {
            amount,
            shop: {
              name: "Zochil",
              qpay_template_id: QPAY_ZOCHIL_TEMPLATE_ID,
              qpay_merchant_id: QPAY_ZOCHIL_MERCHANT_ID
            },
            order_id: id,
            order_code: "bill",
            zochil_phone: "77778787",
            now: moment().format("YYYY-MM-DD HH:mm"),
            description: `#${module.name} үйлчилгээний нэхэмжлэх`,
            bill_no
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
            provider: "qpay",
            qrcode,
            invoiceno,
            error_message,
            status: "pending",
            deeplinks: JSON.stringify(deeplinks || "[]")
          },
          { id }
        );

        return { qrcode, deeplinks, id };
      } catch (error: any) {
        logger.error({
          message: error.stack || error.message,
          module_name: "transactions/create_invoice"
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

  async createPlanInvoice({
    user_id,
    merchant_id,
    plan_uid,
    quantity
  }: {
    user_id: ID;
    merchant_id: ID;
    plan_uid: string;
    quantity: number;
  }) {
    const { plan } = await this._modulePlanService.detail(plan_uid);
    const planPrice = filter(plan.prices, (item) => {
      return item.quantity === quantity;
    });
    const amount = planPrice[0].price;
    const shop = await this._merchantService.getMerchant(merchant_id);
    const settings = await super.findOneByConditions(
      { uid: "qpay" },
      "payment_integrations"
    );
    const values = pickBy(
      {
        status: "pending",
        merchant_id,
        module: plan.uid,
        amount,
        provider: "qpay",
        quantity,
        user_id,
        bill_type: "plan"
      },
      (v) => v !== undefined
    );
    const id = await this.insert(values, this.tableName, "id");

    if (shop) {
      try {
        const payment_options: any = {};
        settings.options.forEach((option: any) => {
          payment_options[option.key] = option.value;
        });
        let bill_no = `s${merchant_id}-${moment().format("YYYYMMDDHHmmss")}`;

        const {
          invoiceno,
          error_message = "",
          qrcode,
          deeplinks
        } = await this._transactionService._sendRequest({
          provider: "qpay",
          extra: {
            amount,
            shop: {
              name: "Zochil",
              qpay_template_id: QPAY_ZOCHIL_TEMPLATE_ID,
              qpay_merchant_id: QPAY_ZOCHIL_MERCHANT_ID
            },
            order_id: id,
            order_code: "bill",
            zochil_phone: "77778787",
            now: moment().format("YYYY-MM-DD HH:mm"),
            description: `#${plan.name} үйлчилгээний нэхэмжлэх`,
            bill_no
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
            provider: "qpay",
            qrcode,
            invoiceno,
            error_message,
            status: "pending",
            deeplinks: JSON.stringify(deeplinks || "[]")
          },
          { id }
        );

        return { qrcode, deeplinks, id };
      } catch (error: any) {
        logger.error({
          message: error.stack || error.message,
          module_name: "transactions/create_invoice"
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
}
