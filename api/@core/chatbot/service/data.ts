import APIService from "core/base/service";
import { DBConnection, Merchant } from "core/types";

export default class DataService extends APIService {
  constructor(db: DBConnection) {
    super(db, "");

    this.help_faq = this.help_faq.bind(this);
    this.post_home = this.post_home.bind(this);
    this.help_terms = this.help_terms.bind(this);
    this.order_receipt = this.order_receipt.bind(this);
    this.product_featured = this.product_featured.bind(this);
  }

  async getData(
    action: string,
    shop: Merchant,
    params: { [key: string]: any }
  ) {
    const method = (this as any)[action];
    if (typeof method === "function") {
      return await method({ shop, params });
    }

    return null;
  }

  async contact_home({ shop }: { shop: Merchant }) {
    return {
      phone: (shop.phone || "").split(" ")[0]
    };
  }

  async post_home({ shop }: { shop: Merchant }) {
    return await super.findAll({ shop_id: shop.id }, "posts", { limit: 10 });
  }

  async product_featured({ shop }: { shop: Merchant }) {
    return await super.findAll(
      { shop_id: shop.id, featured: true, status: "enabled" },
      "products",
      { limit: 10 }
    );
  }

  async help_faq({ shop }: { shop: Merchant }) {
    return await super.findAll({ shop_id: shop.id }, "shop_pages_faq", {
      limit: 10
    });
  }

  async help_terms({ shop }: { shop: Merchant }) {
    return {
      payment_rule: shop.payment_rule,
      delivery_rule: shop.delivery_rule,
      terms_of_service: shop.terms_of_service
    };
  }

  async order_receipt({
    params
  }: {
    params: { [key: string]: any };
  }) {
    const order = await super.findOne("id", params.id, "orders");

    try {
      order.elements = JSON.parse(order.items).map((item: any) => {
        let image_url;
        const images = JSON.parse(item.images || "[]");
        if (images.length) {
          image_url = images[0].url;
        }

        return {
          image_url,
          title: item.name,
          price: item.price,
          quantity: item.quantity
        };
      });
    } catch (err: any) {}

    return order;
  }
}
