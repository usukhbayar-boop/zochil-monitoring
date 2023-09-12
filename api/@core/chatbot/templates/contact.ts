import { buildListTemplate } from './utils';

const contact_home = (data: any, options: any) => buildListTemplate([
  {
    image_url: options.contact_home_image_url,
    title: options.contact_home_title || "Холбогдох",
    "buttons": [{
      "type":"phone_number",
      "title":"Залгах",
      "payload": `+976${data.phone}`
    }],
  },
  {
    image_url: options.help_about_image_url,
    title: options.help_about_title || "Бидний тухай",
    "default_action": {
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/about`,
    },
    "buttons": [{
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/about`,
      "title": options.detail_btn_title || "Дэлгэрэнгүй",
    }],
  },
  {
    image_url: options.help_faq_image_url,
    title: options.help_faq_title || "Түгээмэл асуултууд",
    "buttons": [{
      "type": "postback",
      "payload": "HELP_FAQ",
      "title": options.detail_btn_title || "Дэлгэрэнгүй",
    }],
  },
  {
    image_url: options.help_terms_image_url,
    title: options.help_terms_title || "Нөхцөлүүд",
    "buttons": [{
      "type": "postback",
      "payload": "HELP_TERMS",
      "title": options.detail_btn_title || "Дэлгэрэнгүй",
    }],
  },
]);

export default {
  contact_home,
};
