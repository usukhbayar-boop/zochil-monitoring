import { buildListTemplate } from './utils';

const product_home = (_: any, options: any) => buildListTemplate([
  {
    image_url: options.product_all_image_url,
    title: options.product_all_title || "Бүх бүтээгдэхүүн",
    "default_action": {
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/products`,
    },
    "buttons": [{
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/products`,
      "title": options.show_more_btn_title || "Үзэх",
    }],
  },
  {
    title: options.product_sales_title || "Хямдралтай бүтээгдэхүүн",
    image_url: options.product_sales_image_url,
    "default_action": {
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/saled-products`,
    },
    "buttons": [{
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/saled-products`,
      "title": options.show_more_btn_title || "Үзэх",
    }],
  },
  {
    title: options.product_featured_title || "Онцлох бүтээгдэхүүн",
    image_url: options.product_featured_image_url,
    "buttons": [{
      "type": "postback",
      "payload": "PRODUCT_FEATURED",
      "title": options.product_home_btn_title || "Үзэх",
    }],
  },
]);

const product_featured = (products: any, options: any) => buildListTemplate(
  products.map((product: any) => ({
    image_url: _getProductThumb(product.images || '[]'),
    title: product.name,
    "default_action": {
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/products/${product.category_id || '-'}/${product.id}`,
    },
    "buttons": [{
      "type": "web_url",
      "messenger_extensions": true,
      "webview_height_ratio": "full",
      "url": `${options.base_url}/products/${product.category_id || '-'}/${product.id}`,
      "title": options.detail_btn_title || "Дэлгэрэнгүй",
    }],
  }))
);


function _getProductThumb(imagesRaw: any) {
  try {
    if (imagesRaw) {
      const images = JSON.parse(imagesRaw);
      if (images.length) {
        return (images[0].url || '')
          .replace('.jpg', '_t500.jpg')
          .replace('.png', '_t500.png')
          .replace('.webp', '_t500.webp')
          .replace('.gif', '_t500.gif');
      }
    }
  } catch (e) {}

  return "/static/images/placeholder.png";
}


export default {
  product_home,
  product_featured,
}
