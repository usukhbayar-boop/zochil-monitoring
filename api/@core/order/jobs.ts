import numeral from "numeral";
import pickBy from "lodash/pickBy";
import logger from "lib/utils/logger";
import APIService from "core/base/service";

import { sendMail } from "lib/mailers/mailgun";
import { sendSMS } from "lib/external-apis/sms";
import { sendMessage } from "lib/external-apis/firebase";
import ChatbotService from "core/chatbot/service/webhook";
import { DBConnection, Order, Merchant } from "core/types";

export default class OrderBackgroundJobs extends APIService {
  private _chatbotService: ChatbotService;
  constructor(db: DBConnection) {
    super(db, "orders");
    this._chatbotService = new ChatbotService(db);
  }

  async doSaveCustomer(order: Order) {
    try {
      const existing = await this.connector
        .db_readonly("customers")
        .where({
          shop_id: order.shop_id,
          phone: order.customer_phone
        })
        .limit(1);

      if (existing && existing.length === 0) {
        await this.connector.db("customers").insert(
          pickBy(
            {
              shop_id: order.shop_id,
              email: order.customer_email,
              phone: order.customer_phone,
              account_id: order.account_id,
              address: order.customer_address,
              full_name: order.customer_full_name
            },
            (v) => v
          )
        );
      }
    } catch (error: any) {
      logger.error({
        message: error.stack || error.message,
        module_name: "order_jobs/save_customer"
      });
    }
  }

  async doSendChatbotMessages(order: Order, shop: Merchant) {
    try {
      if (shop && order.chatbot_user_psid && shop.social_page_uid) {
        const socialPage = await super.findOneByConditions(
          {
            uid: shop.social_page_uid
          },
          "social_pages"
        );

        if (socialPage) {
          this._chatbotService
            .processPostback({
              shop,
              params: { id: order.id },
              //@ts-ignore
              sender_id: parseInt(order.chatbot_user_psid),
              //@ts-ignore
              page_id: parseInt(shop.social_page_uid),
              access_token: socialPage.chatbot_token,
              postback: { payload: "ORDER_RECEIPT" }
            })
            .then(() => {});
        }
      }

      const admins = await this.connector.db_readonly
        .select("users.chatbot_psid as psid")
        .from("users")
        .innerJoin("shops_users", "shops_users.user_id", "users.id")
        .whereNotNull("users.chatbot_psid")
        .where({
          "shops_users.shop_id": order.shop_id
        });

      for (const admin of admins) {
        await this._chatbotService.sendAdminNotification(
          admin.psid,
          order,
          process.env.ADMIN_CHATBOT_TOKEN || ""
        );
      }
    } catch (error: any) {
      logger.error({
        message: error.stack || error.message,
        module_name: "order_jobs/send_chatbot"
      });
    }
  }

  async doSendOrderPushNotification(order: Order) {
    try {
      const unreadCount = await super.count({
        is_read: false,
        shop_id: order.shop_id
      });

      const devices = await this.connector.db_readonly
        .select("devices.*")
        .from("devices")
        .innerJoin("shops_users", "shops_users.user_id", "devices.user_id")
        .whereRaw("devices.is_logged = true")
        .whereRaw("devices.expire_at > current_timestamp")
        .whereRaw("shops_users.shop_id = :shop_id", { shop_id: order.shop_id })
        .whereNotNull("devices.token");

      const title = "Шинэ захиалга хийгдлээ";
      const body = `${order.customer_phone} утасны дугаартай, ${order.customer_full_name} нэртэй хэрэглэгч таны онлайн дэлгүүрт захиалга хийлээ.`;
      for (const device of devices) {
        const notification_id = await super.insert(
          {
            body,
            title,
            type: "order",
            status: "pending",
            udid: device.udid,
            device_id: device.id,
            user_id: device.user_id
          },
          "notifications"
        );

        // await sendMessage(device.fcm_token, {
        await sendMessage(
          device.token,
          {
            notification: {
              body,
              title,
              sound: "default",
              ...(!unreadCount ? {} : { badge: `${unreadCount}` })
            },
            data: {
              type: "order",
              order_id: `${order.id}`,
              notification_id: `${notification_id}`
            }
          },
          {}
        );
      }
    } catch (error: any) {
      logger.error({
        message: error.stack || error.message
      });
    }
  }

  async doSendOrderSMS(order: Order, shop: Merchant) {
    let id;
    try {
      if (shop.order_sms_enabled && order.customer_phone) {
        const shop_id = order.shop_id;
        const bank_accounts = await super
          .findAll({ shop_id }, "bank_accounts", { limit: 2 })
          .then((accounts) =>
            accounts.filter(
              (ba) => ba.bank && ba.account_number && ba.account_holder
            )
          );

        let total_price = parseFloat(order.total_price);

        const messages = [
          shop.order_sms_template_1 ||
            `Tani zahialga burtgegdlee.{{new_line}}Guilgeenii utga: {{code}}{{new_line}}{{bank_accounts}}{{new_line}}Tuluh dun: {{total_price}}MNT.`,
          shop.order_sms_template_2 ||
            `Tani {{code}} dugaartai zahialga amjilttai batalgaajlaa.{{new_line}}Zahialgiin dun: {{total_price}}MNT.`
        ];

        let message = "";
        for (let i = 0; i < messages.length; i++) {
          message = `${messages[i]}`;
          message = message.replace(/\{\{new_line\}\}/g, "\n");
          message = message.replace("{{code}}", order.code);
          message = message.replace(
            "{{total_price}}",
            numeral(total_price).format("0,0")
          );
          message = message.replace(
            "{{bank_accounts}}",
            bank_accounts
              .map(
                (ba) =>
                  `${ba.bank.toUpperCase()} ${ba.account_number} ${
                    ba.account_holder
                  }`
              )
              .join("\n")
          );

          message = message.substr(0, 160);
          messages[i] = `${message}`;
        }

        const phone = order.customer_phone
          .replace(/\s/g, "")
          .replace("+976", "");

        id = await super.insert(
          {
            phone,
            shop_id,
            message_pending: messages[0],
            message_verified: messages[1],
            sms_type: "order",
            order_id: order.id
          },
          "sms_messages"
        );

        const response = await sendSMS(phone, messages[0]);
        await super.update(
          { response: response || "na", status: "sent" },
          { id },
          "sms_messages"
        );
      }
    } catch (error: any) {
      logger.error({
        message: error.stack || error.message,
        module_name: "order_jobs/send_sms"
      });

      if (id) {
        await super.update(
          { response: error.message, status: "error" },
          { id },
          "sms_messages"
        );
      }
    }
  }

  async doSendMailNotifications(order: Order, shop: Merchant) {
    try {
      const orderParams = {
        "v:items": order.items,
        "v:status": order.status,
        "v:total_price": order.total_price,
        "v:payment_type": order.payment_type,
        "v:customer_address": order.customer_address,
        "v:customer_full_name": order.customer_full_name
      };

      const items = JSON.parse(order.items || "[]");

      if (shop.email) {
        await sendMail({
          to: shop.email,
          params: orderParams,
          subject: `Таны онлайн дэлгүүрт шинэ захиалга ирсэн байна.`,
          template: "order-admin"
        });
      }

      if (order.customer_email) {
        await sendMail({
          to: shop.email,
          params: orderParams,
          subject: `Таны захиалгыг хүлээн авлаа.`,
          template: "order-account"
        });
      }
    } catch (error: any) {
      logger.error({
        message: error.stack || error.message
      });
    }
  }
}
