import APIService from "core/base/service";
import MerchantService from "core/merchants/service";
import SequenceService from "core/sequence/service";
import { DBConnection, ID, Order } from "core/types";
import logger from "lib/utils/logger";
import map from "lodash/map";
import pickBy from "lodash/pickBy";
import _ from "lodash";
import axios from "axios";

const { JOB_SERVER_URL } = process.env;
export default class TicketService extends APIService {
  _merchantService: MerchantService;
  private _sequenceService: SequenceService;
  constructor(db: DBConnection) {
    super(db, "tickets");
    this._merchantService = new MerchantService(db, "shops");
    this._sequenceService = new SequenceService(db);
  }
  async doCreateTicket(order: Order, products: any) {
    try {
      const shop = await this._merchantService.getMerchant(order.shop_id);
      if (shop.ticket_enabled === "1" && shop.ticket_template) {
        map(products, async (product: any) => {
          for (let i = 0; i < product.quantity; i++) {
            const code = await this._sequenceService.generateTicketCode();
            const values = pickBy(
              {
                order_id: order.id,
                product_id: product.id,
                customer_email: order.customer_email,
                status: "pending",
                code: `${shop.code}${code}`,
                merchant_id: shop.id,
                account_id: order.account_id
              },
              (v) => v !== undefined
            );
            await this.insert(values, this.tableName, "id");
          }
          await this._runTicketJob(order.id, product.id);
        });
      }
    } catch (error: any) {
      console.error(error);
      logger.error({
        message: error.stack || error.message
      });
    }
  }

  async doRetryTicketMail(order: Order, products: any) {
    try {
      const shop = await this._merchantService.getMerchant(order.shop_id);
      if (shop.ticket_enabled === "1" && shop.ticket_template) {
        map(products, async (product: any) => {
          const tickets = await this.findAll({
            order_id: order.id,
            product_id: product.id
          });
          if (!tickets || tickets.length < 1) {
            for (let i = 0; i < product.quantity; i++) {
              const code = await this._sequenceService.generateTicketCode();
              const values = pickBy(
                {
                  order_id: order.id,
                  product_id: product.id,
                  customer_email: order.customer_email,
                  status: "pending",
                  code: `${shop.code}${code}`,
                  merchant_id: shop.id,
                  account_id: order.account_id
                },
                (v) => v !== undefined
              );
              await this.insert(values, this.tableName, "id");
            }
          }
          await this._runTicketJob(order.id, product.id);
        });
      }
    } catch (error: any) {
      console.error(error);
      logger.error({
        message: error.stack || error.message
      });
    }
  }

  async _runTicketJob(order_id: ID, product_id: ID) {
    try {
      const resp = await axios({
        data: { order_id, product_id },
        method: "post",
        url: `${JOB_SERVER_URL}/ticket-sender/send`,
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("JOB: ", resp.data);
    } catch (err: any) {
      console.log("JOB: ", (err.response || {}).data);
    }
  }
}
