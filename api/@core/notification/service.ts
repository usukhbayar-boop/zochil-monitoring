import moment from "moment";
import pickBy from "lodash/pickBy";
import logger from "lib/utils/logger";
import APIService from "core/base/service";
import MerchantService from "core/merchants/service";
import { sendMessage } from "lib/external-apis/firebase";
import {
  ApiFilter,
  ApiOptions,
  DBConnection,
  ID,
  Order,
  User
} from "core/types";

export default class NotificationServices extends APIService {
  private _merchantService: MerchantService;
  constructor(db: DBConnection) {
    super(db, "notifications");
    this._merchantService = new MerchantService(db, "shops");
  }

  // broadcast push, order push, dynamic notify push

  async orderPushNotificationSend({ order }: { order: Order }) {
    try {
      if (order) {
        const unreadCount = await super.count(
          {
            is_read: false,
            shop_id: order.shop_id
          },
          "orders"
        );

        const devices = await this.connector.db_readonly
          .select("devices.*")
          .from("devices")
          .innerJoin("shop_users", "shop_users.user_id", "devices.user_id")
          .whereRaw("devices.is_logged = true")
          .whereRaw("devices.expire_at > current_timestamp")
          .whereRaw("shops_users.shop_id = :shop_id", {
            shop_id: order.shop_id
          })
          .whereNotNull("devices.token");

        const title = "Шинэ захиалга хийгдлээ";
        const body = `${order.customer_phone} утасны дугаартай, ${order.customer_full_name} нэртэй хэрэглэгч таны онлайн дэлгүүрт захиалга хийлээ.`;

        for (const device of devices) {
          const result = await this.create({
            body: body,
            title: title,
            type: "order",
            status: "pending",
            udid: device.udid,
            device_id: device.id,
            user_id: device.user_id,
            order_id: order.id
          });
          await this.sendPushRequest({
            token: device.token,
            payload: {
              notification: {
                body,
                title,
                sound: "default",
                ...(!unreadCount ? {} : { badge: `${unreadCount}` })
              },
              data: {
                type: "order",
                order_id: `${order.id}`,
                notification_id: `${result.notification_id}`
              }
            },
            options: {}
          });
        }
      }
    } catch (err: any) {
      logger.error({
        message: err.stack || err.message
      });
    }
  }

  async broadcastPushNotificationSend({ id }: { id: ID }) {
    try {
      let notification_id = "";
      const inProgress = await super.findOneByConditions(
        {
          status: "in_progress"
        },
        "broadcasts"
      );

      if (inProgress) {
        throw new Error("Another progress broadcast running");
      }
      const broadcast = await super.findOne("id", id, "broadcasts");

      if (broadcast && broadcast.status === "pending") {
        if (broadcast.channels.indexOf("push") > -1) {
          const devicesQuery = this.connector
            .db_readonly("devices")
            .select([
              "devices.id as device_id",
              "devices.udid",
              "devices.user_id",
              "shops.id as merchant_id",
              "users.phone as user_phone",
              "devices.token as fcm_token"
            ])
            .leftJoin("users", "users.id", "devices.user_id")
            .leftJoin("shops_users as su", "su.user_id", "devices.user_id")
            .leftJoin("shops", "shops.id", "su.shop_id")
            .whereNotNull("devices.fcm_token")
            .where({
              "shops.status": "enabled",
              "devices.is_logged": true,
              "shops.is_subscribed": true
            });
          if (broadcast.broadcast_type === "partial") {
            devicesQuery.whereIn("shops.id", broadcast.merchant_ids || []);
          }

          const devices = await devicesQuery
            .limit(5000)
            .orderBy("devices.created_at", "desc");

          if (devices.length > 0) {
            super.update({ status: "in_progress" }, { id }, "broadcasts");

            for (const device of devices) {
              // push notification send
              // this.jobs.broadcast_notification.add({
              //   ...device,
              //   body: broadcast.body,
              //   title: broadcast.title,
              //   broadcast_id: broadcast.id
              // });
              const existing = await super.findOneByConditions({
                user_id: device.user_id,
                merchant_id: device.merchant_id,
                broadcast_id: broadcast.id
              });

              if (!existing) {
                notification_id = await super.insert(
                  {
                    body: broadcast.body,
                    title: broadcast.title,
                    user_id: device.user_id,
                    merchant_id: device.merchant_id,
                    broadcast_id: broadcast.id,
                    type: "broadcast"
                  },
                  "notifications"
                );

                await this.sendPushRequest({
                  token: device.token,
                  payload: {
                    notification: {
                      body: broadcast.body,
                      title: broadcast.title
                    },
                    data: {
                      type: "broadcast",
                      ...(!!notification_id && { notification_id })
                    }
                  },
                  options: {}
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      logger.error({
        message: err.stack || err.message,
        module_name: "notification/broadcast_push"
      });
    }
  }

  async create({
    title,
    body,
    type,
    payload,
    status,
    udid,
    device_id,
    user_id,
    order_id,
    merchant_id
  }: {
    title: string;
    body: string;
    type: string;
    status: string;
    device_id: ID;
    udid: string;
    user_id: ID;
    order_id?: ID;
    broadcast_id?: ID;
    merchant_id?: ID;
    payload?: any;
  }) {
    const notification_id = await super.insert({
      title,
      body,
      type,
      payload,
      status,
      udid,
      device_id,
      user_id,
      order_id,
      merchant_id
    });

    return { notification_id };
  }

  async list(user: User, shop_id: ID, filter: ApiFilter, options: ApiOptions) {
    await this._merchantService.checkOwnership(user.id, shop_id);
    const { list: notifications, totalCount } = await super.findForList(
      pickBy({ ...filter, user_id: user.id }, (v) => v),
      options
    );

    const unread_count = await this.connector
      .db_readonly("notifications")
      .where({
        user_id: user.id,
        have_read: false
      })
      .where("created_at", ">", moment().subtract(7, "days").toDate())
      .count()
      .then((result: any) => (result && result[0].count) || 0);
    return {
      totalCount,
      notifications,
      unread_count
    };
  }

  async detail(user: User, shop_id: ID, id: ID) {
    await this._merchantService.checkOwnership(user.id, shop_id);

    const notification = await super.findOneByConditions({
      id,
      user_id: user.id
    });
    if (notification && !notification.have_read) {
      super.update({ have_read: true }, { id, user_id: user.id });
    }
    return { notification };
  }

  async sendPushRequest({
    token,
    payload,
    options
  }: {
    token: string;
    payload: any;
    options: any;
  }) {
    await sendMessage(token, payload, options);
  }
}
