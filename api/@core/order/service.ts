import moment from "moment";
import omit from "lodash/omit";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import logger from "lib/utils/logger";
import aws from "lib/external-apis/aws";

import APIService from "core/base/service";
import OrderBackgroundJobs from "core/order/jobs";
import CustomError from "lib/errors/custom_error";
import MerchantService from "core/merchants/service";
import InventoryService from "core/inventory/service";
import TransactionService from "core/transaction/service";
import TicketService from "core/tickets/service";

import qrcode from "qrcode";
import { sendSMS } from "lib/external-apis/sms";
import { sendMail } from "lib/mailers/mailgun";
import { replaceWithThumbnail } from "lib/utils";

import {
  DBConnection,
  ID,
  Merchant,
  Order,
  Product,
  ProductVariant,
  User,
  ApiFilter,
  ApiOptions
} from "core/types";
import { concat, round } from "lodash";

export default class BaseOrderService extends APIService {
  private _jobsService: OrderBackgroundJobs;
  private _merchantService: MerchantService;
  private _inventoryService: InventoryService;
  private _transactionService: TransactionService;
  private _ticketService: TicketService;

  constructor(db: DBConnection) {
    super(db, "orders");

    this._jobsService = new OrderBackgroundJobs(db);
    this._inventoryService = new InventoryService(db);
    this._transactionService = new TransactionService(db);
    this._merchantService = new MerchantService(db, "shops");
    this._ticketService = new TicketService(db);
  }

  runBackgroundJobs(shop: Merchant, order: Order) {
    //@TODO - move-to-job
    Promise.all([
      this.doUpdateProductCounts(order.items),
      this._jobsService.doSaveCustomer(order),
      this._jobsService.doSendOrderPushNotification(order),
      this._jobsService.doSendChatbotMessages(order, shop),
      this._jobsService.doSendOrderSMS(order, shop)
      // this._jobsService.doSendMailNotifications(order, shop),
    ]).then(() => {});
  }

  async adjustCoupon(shop_id: ID, coupon_code: string) {
    if (coupon_code) {
      try {
        const campaign = await super.findOneByConditions(
          {
            coupon_code,
            shop_id,
            status: "enabled"
          },
          "marketing_campaigns"
        );
        if (campaign && (campaign.coupon_count || 0) > 0) {
          await super.update(
            {
              coupon_count: campaign.coupon_count - 1,
              coupon_remaining: campaign.coupon_remaining - 1
            },
            { id: campaign.id },
            "marketing_campaigns"
          );
        }
      } catch (error: any) {
        logger.error({
          message: error.stack || error.message,
          module_name: "base_order/adjust_coupon"
        });
      }
    }
  }

  async processCoupon(coupon_code: string, shop_id: ID) {
    let rate = 0;
    if (coupon_code) {
      try {
        const campaign = await super.findOneByConditions(
          {
            coupon_code,
            shop_id,
            status: "enabled"
          },
          "marketing_campaigns"
        );
        if (campaign) {
          if (campaign.expire_at && moment().isAfter(campaign.expire_at)) {
            throw new Error("Coupon expired");
          }

          if ((campaign.coupon_count || 0) > 0) {
            const criteria = campaign.criteria;
            if (criteria && criteria.length) {
              rate = parseInt(criteria[0].sale_percent, 10);
            }
          }
        }
      } catch (error: any) {
        logger.error({
          message: error.stack || error.message,
          module_name: "order_jobs/process_coupon"
        });
        rate = 0;
      }
    }

    return rate;
  }

  async calculateTotalPrice({
    items,
    coupon_rate,
    delivery_price = 0,
    delivery_price_limit
  }: {
    items: string;
    coupon_rate?: number;
    delivery_price?: number;
    delivery_price_limit?: number;
  }) {
    let total_price = 0;
    let has_delivery = false;
    let order_delivery_price = delivery_price;

    await this.iterateOrderItems(
      items,

      //iteratee
      async (
        product: Product,
        quantity: number,
        price: number,
        _: any,
        variant: ProductVariant
      ) => {
        const item = variant || product;
        if (
          item.sale_campaign_id &&
          item.sale_expire_at &&
          moment().isBefore(item.sale_expire_at)
        ) {
          item.sale_price = item.sale_campaign_price;
        }
        if (item.sale_price) {
          item.sale_price = round(item.sale_price);
        }
        if (!!product.has_delivery) {
          has_delivery = true;
        }
        total_price += quantity * parseFloat(item.sale_price || item.price);
      }
    );

    const sub_total_price = total_price;

    if (coupon_rate && coupon_rate < 100) {
      total_price = total_price * ((100 - coupon_rate) / 100);
    }

    if (delivery_price && !!has_delivery) {
      if (
        !delivery_price_limit ||
        (delivery_price_limit && total_price < delivery_price_limit)
      ) {
        total_price += delivery_price;
      } else {
        order_delivery_price = 0;
      }
    }

    return {
      total_price,
      sub_total_price,
      delivery_price: !!has_delivery ? order_delivery_price : 0
    };
  }

  async checkInventory(shop_id: ID, jsonItems: string) {
    await this.iterateOrderItems(
      jsonItems,

      //iteratee
      async (
        product: Product,
        quantity: number,
        price: number,
        options: any,
        variant: ProductVariant
      ) => {
        if (product.status === "disabled") {
          throw new CustomError(
            `Disabled product in order items: ${product.name}, id: ${product.id}`,
            `"${product.name}" нэртэй барааг захиалах боломжгүй.`
          );
        }

        if (product.has_inventory) {
          const inventory = await super.findOneByConditions(
            {
              shop_id,
              product_id: product.id,
              ...(variant && {
                variant_id: variant.id
              })
            },
            "inventory"
          );

          if (!inventory) {
            throw new CustomError(
              `Inventory not found for product : ${product.id}`,
              `"${product.name}" нэртэй барааны үлдэгдэл хүрэлцэхгүй байна.`
            );
          }

          if (inventory.stock < quantity) {
            throw new CustomError(
              `Not enough stock. product: ${product.name}, id: ${product.id}`,
              `"${product.name}" нэртэй барааны үлдэгдэл хүрэлцэхгүй байна.`
            );
          }
        }
      }
    );
  }

  async adjustInventory(shop_id: ID, jsonItems: string, isReverse = false) {
    await this.iterateOrderItems(
      jsonItems,

      //iteratee
      async (
        product: Product,
        quantity: number,
        price: number,
        options: any,
        variant: ProductVariant
      ) => {
        if (product.has_inventory) {
          const result = await this._inventoryService.createPurchaseOrder({
            price,
            shop_id,
            quantity,
            product_id: product.id,
            variant_id: variant && variant.id,
            type: isReverse ? "reverse" : "order",
            //@ts-ignore
            adjustment: (isReverse ? 1 : -1) * quantity
          });

          if (!variant && result && result.new_stock) {
            await super.update(
              { stock: result.new_stock },
              { id: product.id },
              "products"
            );
          }
        }
      }
    );
  }

  async iterateOrderItems(jsonItems: string, iteratee: Function) {
    const items = this.parseJsonItems(jsonItems);
    const productRows = await this.connector.db_readonly("products").whereIn(
      "id",
      items.map((item: any) => item.id)
    );
    const variantRows = await this.connector
      .db_readonly("product_variants")
      .whereIn(
        "id",
        items
          .filter((item: any) => item.variant_id)
          .map((item: any) => item.variant_id)
      );

    const products = productRows.reduce(
      (acc, product) => ({ ...acc, [product.id]: product }),
      {}
    );

    const variants = variantRows.reduce(
      (acc, variant) => ({ ...acc, [variant.id]: variant }),
      {}
    );

    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]) {
        const { id, variant_id, quantity, price, options } = items[i];
        if (id && quantity && price && products[id]) {
          await iteratee(
            products[id],
            quantity,
            price,
            options,
            variant_id && variants[variant_id]
          );
        }
      }
    }

    return;
  }

  parseJsonItems(jsonItems: string) {
    let items = [];
    try {
      items = JSON.parse(jsonItems);
    } catch (err: any) {
      logger.error({
        message: `JSON parse error`,
        module_name: `orders/make-order`
      });
    }

    return items;
  }

  async createPaymentInvoice({
    order_id,
    order_code,
    phone,
    customer_full_name,
    amount,
    shop_id,
    provider,
    account_id,
    redirect_uri,
    token_type = "merchant",
    card_number,
    card_installment,
    card_expiry_date,
    password2,
    user_info,
    onplat_description,
    settlement_status
  }: {
    order_id: ID;
    order_code: string;
    phone: string;
    customer_full_name: string;
    amount: number;
    shop_id: ID;
    provider: string;
    account_id?: ID;
    token_type?: string;
    redirect_uri: string;
    card_number?: string;
    card_installment?: string;
    card_expiry_date?: string;
    password2?: string;
    user_info?: string;
    onplat_description?: string;
    settlement_status: string;
  }) {
    const invoiceResp = await this._transactionService.sendTransaction({
      phone,
      customer_full_name,
      order_id,
      order_code,
      amount,
      shop_id,
      provider,
      token_type,
      redirect_uri,
      account_id,
      settlement_status
    });

    if (invoiceResp && invoiceResp.checkout_url) {
      return invoiceResp.checkout_url;
    }

    return "";
  }
  async retryPaymentInvoice({
    order_id,
    order_code,
    phone,
    amount,
    shop_id,
    provider,
    account_id,
    redirect_uri,
    token_type = "merchant",
    settlement_status
  }: {
    order_id: ID;
    order_code: string;
    phone: string;
    amount: number;
    shop_id: ID;
    provider: string;
    account_id: ID;
    token_type?: string;
    redirect_uri: string;
    settlement_status: string;
  }) {
    let invoice: any = "";
    let retry = true;

    invoice = await super.findOneByConditions(
      { order_code },
      "payment_invoices"
    );
    if (!invoice) {
      retry = false;
    }
    await super.update(
      {
        payment_type: provider
      },
      { id: order_id }
    );
    const invoiceResp = await this._transactionService.sendTransaction({
      phone,
      order_id,
      order_code,
      amount,
      shop_id,
      provider,
      token_type,
      account_id,
      redirect_uri,
      retry,
      id: retry ? invoice.id : "",
      retry_count: retry ? invoice.retry_count : 0,
      settlement_status
    });

    if (invoiceResp && invoiceResp.checkout_url) {
      return invoiceResp.checkout_url;
    }

    return "";
  }

  async checkPaymentStatus({
    shop_id,
    order_id,
    invoice_id,
    currentUser
  }: {
    shop_id: ID;
    order_id: ID;
    invoice_id: ID;
    currentUser: User;
  }) {
    let success = false;
    const invoice = await super.findOneByConditions(
      {
        shop_id,
        order_id,
        id: invoice_id,
        account_id: currentUser.id
      },
      "payment_invoices"
    );

    if (invoice) {
      const order = await super.findOneByConditions({
        shop_id,
        id: order_id
      });

      if (order.status === "pending" && order.payment_type !== "bank") {
        let provider = order.payment_type;

        if (provider) {
          const checkResult = await this._transactionService.checkInvoice({
            provider,
            id: invoice_id,
            account_id: currentUser.id,
            merchant_id: shop_id,
            order_id: order.id,
            settlement_status: order.settlement_status
          });

          if (checkResult && checkResult.success) {
            await super.update(
              {
                status: "verified"
              },
              { id: order_id }
            );
          }
        }
      }
    }

    return { success };
  }

  async saveCustomer({
    shop_id,
    account_id,
    customer_email,
    customer_phone,
    customer_address,
    customer_full_name
  }: {
    shop_id: ID;
    account_id: ID;
    customer_email: string;
    customer_phone: string;
    customer_address: string;
    customer_full_name: string;
  }) {
    const existing = await this.connector
      .db_readonly("customers")
      .where({ shop_id, phone: customer_phone })
      .limit(1);

    if (existing && existing.length === 0) {
      await this.connector.db("customers").insert(
        pickBy(
          {
            shop_id,
            account_id,
            email: customer_email,
            phone: customer_phone,
            address: customer_address,
            full_name: customer_full_name
          },
          (v) => v
        )
      );
    }
  }

  async checkAndChangePaymentStatus(order: Order, check_payment: boolean) {
    const invoice = await super.findOneByConditions(
      { order_id: order.id },
      "payment_invoices"
    );

    if (
      invoice &&
      check_payment &&
      order.account_id &&
      order.status === "pending" &&
      (order.channel === "miniapp" || order.payment_type !== "bank")
    ) {
      const checkResult = await this._transactionService.checkInvoice({
        id: invoice.id,
        provider: order.payment_type,
        order_id: order.id,
        settlement_status: order.settlement_status
      });

      if (checkResult && checkResult.success) {
        try {
          await this.checkInventory(order.shop_id, order.items);
          await this.adjustInventory(order.shop_id, order.items);

          await super.update({ status: "verified" }, { id: order.id });
          order.status = "verified";
          this.doBroadcastWSMessage({
            action_type: "ORDER_VERIFIED",
            payload: {
              order_id: order.id,
              shop_id: order.shop_id
            }
          }).then(() => {});
          //@TODO - move-to-job
          this.doSendVerifiedSMS(order.id, order.shop_id).then(() => {});
          this.doSendTicketMail(order).then(() => {});
          this.doUpdateProductCounts(order.items, "order_verified_count").then(
            () => {}
          );
        } catch (error: any) {
          logger.error({
            message: error.stack || error.message,
            module_name: "order_jobs/check_payments"
          });
        }
      }
    }

    if (invoice) {
      try {
        const _response = JSON.parse(invoice.response);
        invoice.payment_id = _response?.payment_id;
      } catch (err) {}

      order.invoice = omit(invoice, "response");
    }
  }

  prepareOrderItem(order: Order) {
    if (order.status === "pending") {
      this.hideOrderDetail(order);
    }

    order.total_quantity = 0;

    try {
      const orderItems = JSON.parse(order.items);
      order.total_quantity = orderItems.reduce(
        (total: number, item: any) => total + item.quantity,
        0
      );

      orderItems.forEach((item: any) => {
        if (item.images) {
          item.images = replaceWithThumbnail(item.images, "_t250");
        }

        if (Array.isArray(item.options)) {
          item.options.forEach((option: any) => {
            if (option.value && option.value.title) {
              option.value = option.value.title;
            }
          });
        }
      });

      order.items = JSON.stringify(orderItems);
    } catch (error) {
      order.items = "[]";
    }
  }

  async fetchDeliveryInformation(order: Order) {
    const delivery_order = await this.connector
      .db_readonly("delivery_orders")
      .select(
        "id",
        "status",
        "end_at",
        "start_at",
        "package_size",
        "package_quantity",
        "package_price",
        "warehouse_id",
        "delivery_company_id",
        "payment_status",
        "qpay_qrcode",
        "qpay_deeplinks",
        "refno",
        "tracking_number",
        "is_same_day",
        "attributes",
        "created_at",
        "updated_at"
      )
      .whereNot({ payment_status: "error", status: "error" })
      .where({ order_id: order.id })
      .then((rows) => rows.length && rows[0]);

    if (delivery_order) {
      const now = Date();
      if (
        delivery_order.payment_status === "pending" &&
        moment(delivery_order.created_at).add(1, "day").isBefore(now)
      ) {
        return;
      }

      order.delivery = delivery_order;

      if (delivery_order.tracking_number) {
        order.delivery_tracking_number = delivery_order.tracking_number;
      }
    }
  }

  async hookHandler(invoiceno: string) {
    if (invoiceno) {
      const invoice = await super.findOneByConditions(
        { invoiceno },
        "payment_invoices"
      );

      if (invoice) {
        console.log("invoice", invoice.id);
        try {
          const order = await super.findOneByConditions(
            { id: invoice.order_id },
            "orders"
          );

          if (order) {
            console.log("order id", order.id);
            const checkResult = await this._transactionService.checkInvoice({
              id: invoice.id,
              provider: order.payment_type,
              order_id: order.id,
              settlement_status: order.settlement_status
            });

            console.log("res", checkResult);
            if (checkResult && checkResult.success) {
              await this.checkInventory(order.shop_id, order.items);
              await this.adjustInventory(order.shop_id, order.items);
              await this.adjustCoupon(order.shop_id, order.coupon_code);

              await super.update(
                { status: "verified" },
                { id: order.id },
                "orders"
              );
              //@TODO - move-to-job
              this.doBroadcastWSMessage({
                action_type: "ORDER_VERIFIED",
                payload: {
                  order_id: order.id,
                  shop_id: order.shop_id
                }
              }).then(() => {});
              this.doSendVerifiedSMS(order.id, order.shop_id).then(() => {});
              this.doSendTicketMail(order).then(() => {});
              this.doUpdateProductCounts(
                order.items,
                "order_verified_count"
              ).then(() => {});
            }
          }
        } catch (error: any) {
          logger.error({
            message: error.stack || error.message,
            module_name: "order_jobs/hook_handler"
          });
        }
      }
    }
  }

  async doBroadcastWSMessage({
    action_type,
    payload
  }: {
    action_type: string;
    payload: any;
  }) {
    //@TODO implement
  }

  async doUpdateProductCounts(
    jsonItems: string,
    field: string = "order_pending_count"
  ) {
    try {
      const items = JSON.parse(jsonItems);
      for (const item of items.filter((i: any) => i.id)) {
        await super.increment(field, { id: item.id }, "products");
      }
    } catch (error: any) {
      logger.error({
        message: error.stack || error.message,
        module_name: "order_jobs/update_product_count"
      });
    }
  }

  async doSendVerifiedSMS(order_id: ID, shop_id: ID) {
    try {
      const sms = await super.findOneByConditions(
        { order_id, shop_id },
        "sms_messages"
      );

      if (sms && sms.phone && sms.message_verified && sms.status === "sent") {
        await super.update(
          { status: "sending" },
          { id: sms.id },
          "sms_messages"
        );
        await sendSMS(sms.phone, sms.message_verified);
        await super.update(
          { status: "completed" },
          { id: sms.id },
          "sms_messages"
        );
      }
    } catch (error: any) {
      logger.error({
        message: error.stack || error.message,
        module_name: "order_jobs/send_verified_sms"
      });
    }
  }

  async doSendTicketMail(order: Order) {
    let items: any = [];
    await this.iterateOrderItems(
      order.items,

      //iteratee
      async (product: Product, quantity: number) => {
        items.push({ ...product, quantity });
      }
    );
    Promise.all([this._ticketService.doCreateTicket(order, items)]).then(
      () => {}
    );
  }

  async doRetryTicketMail(order: Order) {
    let items: any = [];
    await this.iterateOrderItems(
      order.items,

      //iteratee
      async (product: Product, quantity: number) => {
        items.push({ ...product, quantity });
      }
    );
    Promise.all([this._ticketService.doRetryTicketMail(order, items)]).then(
      () => {}
    );
  }

  async list(filter: ApiFilter = {}, options: ApiOptions = {}) {
    const listCursor = this.connector.db_readonly(this.tableName);
    const countCursor = this.connector.db_readonly(this.tableName);

    [listCursor, countCursor].forEach((cursor) => {
      cursor.where(pick(filter, ["shop_id"]));

      if (filter.account_id) {
        cursor.where({ account_id: filter.account_id });
      }

      if (filter.status) {
        cursor.where({ status: filter.status });
      }

      if (filter.payment_type) {
        cursor.where({ payment_type: filter.payment_type });
      }

      if (filter.query) {
        cursor.whereRaw(
          `
          ( code like :query OR customer_phone like :query OR lower(customer_full_name) like :query )
        `,
          { query: `%${filter.query}%` }
        );
      }
      if (filter.code) {
        cursor.whereRaw("code like :code", { code: `%${filter.code}%` });
      }

      if (filter.phone) {
        cursor.whereRaw("customer_phone like :phone", {
          phone: `%${filter.phone}%`
        });
      }

      if (filter.name) {
        cursor.whereRaw("lower(customer_full_name) like :name", {
          name: `%${filter.name.toLowerCase()}%`
        });
      }

      if (filter.start && filter.end) {
        cursor.where("created_at", ">=", new Date(filter.start));
        cursor.where("created_at", "<=", new Date(filter.end));
      }
    });

    const orders = await super.paginateCursor(listCursor, options);
    const count = await countCursor
      .count()
      .then((result) => result.length && result[0].count);

    for (const order of orders) {
      this.prepareOrderItem(order);
    }

    return { orders, count };
  }

  hideOrderDetail(order: Order) {
    // order.customer_email = '-';
    // order.customer_address = '-';
    // order.customer_first_name = '-';
    // order.customer_last_name = '-';
    // order.description = '-';
    // order.district = '-';
    // order.unit = '-';
    // order.lat = null;
    // order.lng = null;
    // order.customer_phone = maskText(order.customer_phone);
    // order.customer_full_name = maskText(order.customer_full_name);
    // order.customer_phone_additional = maskText(order.customer_phone_additional);
    // order.uid = '-';
  }
}
