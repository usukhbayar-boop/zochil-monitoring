import { buildListTemplate } from './utils';

const admin_main_menu = (_: any, options: any) => buildListTemplate([
  {
    image_url: options.admin_chatbot_image_url,
    title: "Админ нэвтрэх",
    "buttons": [{
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `https://admin-v2.zochil.shop?psid=${options.sender_id}&on_chatbot=1`,
      "title": "Нэвтрэх",
    }],
  },
]);

export default {
  admin_main_menu,
}
