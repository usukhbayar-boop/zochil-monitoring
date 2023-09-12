import axios from 'axios';
import moment from 'moment';
import numeral from 'numeral';
import pickBy from 'lodash/pickBy';
import APIService from 'core/base/service';
import MerchantService from "core/merchants/service";
import { DBConnection, Merchant } from "core/types";

import DataService from './data';
import MessageTemplates from '../templates';
import { IMAGE_URLS } from './constants';
const { OPEN_GRAPH_URL, CHATBOT_VERIFY_TOKEN: VERIFY_TOKEN } = process.env;

export default class WebhookService extends APIService {
  _data: DataService;
  _merchantService: MerchantService;

  constructor(db: DBConnection) {
    super(db, "");
    this._data = new DataService(db);
    this._merchantService = new MerchantService(db, "shops");
  }

  async verify({ mode, token }: { mode: string, token: string }) {
    return mode === 'subscribe' && token === VERIFY_TOKEN;
  }

  async process(event: any) {
    const sender_id = event.sender.id;
    const page_id = event.recipient.id;

    const socialPage = await super.findOneByConditions({
      uid: page_id,
    }, "social_pages");

    if (socialPage) {
      const shop = await this._merchantService.getMerchant(
        socialPage.uid, 'social_page_uid'
      );


      if (shop && event.postback) {
        await this.processPostback({
          shop,
          page_id,
          sender_id,
          postback: event.postback,
          access_token: socialPage.chatbot_token,
        });
      }
    }
  }

  async processPostback({
    shop,
    page_id,
    postback,
    sender_id,
    access_token,
    params = {},
  }: {
    shop: Merchant,
    page_id: string,
    postback: any,
    sender_id: string,
    access_token: string,
    params?: { [key: string]: any }
  }) {
    const action = postback.payload.toLowerCase();

    if (action) {
      const data = await this._data.getData(action, shop, params);
      const template = (MessageTemplates as any)[action];
      const options = {
        ...IMAGE_URLS,
        ...pickBy({
          product_all_image_url: shop.chatbot_product_all_image_url,
          product_home_image_url: shop.chatbot_product_home_image_url,
          product_sales_image_url: shop.chatbot_product_sales_image_url,
          product_featured_image_url: shop.chatbot_product_featured_image_url,
          post_home_image_url: shop.chatbot_post_home_image_url,
          contact_home_image_url: shop.chatbot_contact_home_image_url,
          help_faq_image_url: shop.chatbot_help_faq_image_url,
          help_about_image_url: shop.chatbot_help_about_image_url,
          help_terms_image_url: shop.chatbot_help_terms_image_url,
        }, v => v),
        sender_id,
        base_url: this._merchantService.getURL(shop),
      };

      if (typeof template === 'function') {
        const message = template(data, options);

        if (message) {
          console.log("ACTION :", action);
          console.log("SHOP :", shop.name);
          console.log("PAGE_ID :", page_id);
          console.log("MESSAGE :", JSON.stringify(message));
          await this.callSendAPI(sender_id, message, access_token);
        }
      }
    }
  }

  async sendAdminNotification(sender_id: string, order: any, access_token: string) {
    const message = {
      text: `Захиалгын код: ${order.code}, ${moment(order.created_at).format('YYYY-MM-DD HH:mm')}\nТанд "${order.customer_full_name.toUpperCase()}" нэртэй хэрэглэгчээс ${numeral(order.total_price).format('0,0')}₮ дүнтэй захиалга ирсэн байна.\n\n`
    }

    await this.callSendAPI(sender_id, message, access_token);
  }

  async callSendAPI(sender_id: string, message: any, access_token: string) {
    const qs = `access_token=${access_token}`;
    const data = {
      message,
      "recipient": {
        "id": `${sender_id}`
      },
    };

    try {
      const response = await axios({
        data,
        method: 'post',
        url: `${OPEN_GRAPH_URL}/me/messages?${qs}`,
      });

      if (response) {
        return response.data;
      }
    } catch(error: any) {
      throw new Error(`${error.message},${JSON.stringify((error.response || {}).data)}`);
    }
  }
}
