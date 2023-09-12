import { buildListTemplate } from './utils';

const post_home = (posts: any, options: any) => buildListTemplate(
  posts.map((post: any) => ({
    image_url: post.image,
    title: post.title,
    "default_action": {
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/posts/${post.id}`,
    },
    "buttons": [{
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/posts/${post.id}`,
      "title": options.detail_btn_title || "Дэлгэрэнгүй",
    }],
  }))
);

export default {
  post_home,
};
