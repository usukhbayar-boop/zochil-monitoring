import { buildListTemplate } from './utils';

const main_menu = (_: any, options: any) => buildListTemplate([
  {
    image_url: options.product_home_image_url,
    title: options.product_home_title || "Дэлгүүр хэсэх",
    "buttons": [{
      "type": "postback",
      "payload": "PRODUCT_HOME",
      "title": options.product_home_btn_title || "Дэлгүүр хэсэх",
    }],
  },
  {
    title: options.post_home_title || "Мэдээ мэдээлэл",
    image_url: options.post_home_image_url,
    "buttons": [{
      "type": "postback",
      "payload": "POST_HOME",
      "title": options.detail_btn_title || "Мэдээ мэдээлэл",
    }],
  },
  {
    title: options.contact_home_title || "Холбоо барих",
    image_url: options.contact_home_image_url,
    "buttons": [{
      "type": "postback",
      "payload": "CONTACT_HOME",
      "title": options.detail_btn_title || "Холбоо барих",
    }],
  }
]);

export default {
  main_menu,
}
