import constants from "core/base/constants";
import APIService from "core/base/service";

import { Merchant, IMerchantService, ID } from "core/types";
import { RESERVED_UIDS } from "core/base/constants";

export default class MerchantService
  extends APIService
  implements IMerchantService
{
  async checkOwnership(
    user_id: number | string,
    shop_id: number | string,
    message = "User is not owner of the shop.",
    status = constants.PERMISSION_DENIED
  ): Promise<any> {
    const owners = await super.findAll(
      {
        user_id,
        shop_id,
        user_type: "admin"
      },
      "shops_users"
    );

    if (owners.length === 0) {
      throw {
        message,
        responseCode: 500,
        responseStatus: status
      };
    }
  }

  async getMerchant(
    id: number | string,
    field = "id",
    all_options = false
  ): Promise<Merchant> {
    const merchant = await super.findOne(field, id, "shops");

    if (merchant) {
      const options = await super.findAll(
        {
          merchant_id: merchant.id
        },
        "merchant_options",
        {
          limit: 50
        }
      );

      // populating the options from separate table.
      if (options && options.length) {
        for (const option of options) {
          if (option && option.key && option.value) {
            if (option.sensitive && !all_options) {
              continue;
            }

            if (!option.is_json) {
              merchant[option.key] = option.value;
            } else {
              try {
                merchant[option.key] = JSON.parse(option.value);
              } catch (err: any) {}
            }
          }
        }
      }

      // required by the client not to be undefined.
      if (!merchant.checkout_form_type) {
        merchant.checkout_form_type = "detailed";
      }

      if (!merchant.monpay_branch_username) {
        merchant.monpay_branch_username = null;
      }

      if (!merchant.qpay_merchant_id) {
        merchant.qpay_merchant_id = null;
      }

      merchant.website_url = this.getURL(merchant);
      merchant.from_monpay = !!merchant.from_monpay;
      merchant.has_chatbot = !!merchant.has_chatbot;
      merchant.facebook_connected = !!merchant.facebook_connected;
      merchant.shopping_cart_disabled = !!merchant.shopping_cart_disabled;
      merchant.dark_mode = !!merchant.dark_mode;
      merchant.hide_price = !!merchant.hide_price;
      merchant.show_stock = !!merchant.show_stock;
      merchant.zoom_disabled = !!merchant.zoom_disabled;
      merchant.share_disabled = !!merchant.share_disabled;
      merchant.cart_disabled = !!merchant.cart_disabled;
      merchant.hide_sale_menu = !!merchant.hide_sale_menu;
      merchant.coupon_disabled = !!merchant.coupon_disabled;
      merchant.uid_by_merchant = !!merchant.uid_by_merchant;
      merchant.currency = merchant.currency || "MNT";
      merchant.currency_symbol = merchant.currency_symbol || "₮";

      merchant.theme_options = {
        menu_type: merchant.menu_type,
        header_type: merchant.header_type,
        footer_type: merchant.footer_type,
        color_code: merchant.color_code,
        home_layout: merchant.home_layout,
        main_layout: merchant.main_layout,
        font_family: merchant.font_family,
        color_schema: merchant.color_schema
      };

      if (!merchant.locales) {
        merchant.locales = {
          translations: {},
          current_locale: "mn"
        };
      }
      if (merchant.category) {
        try {
          const { name } = await super.findOne(
            "code",
            merchant.category,
            "merchant_categories"
          );
          merchant.category_name = name;
        } catch (error) {}
      }
    }

    return merchant;
  }

  async updateOption(
    merchant_id: string | number,
    key: string,
    value: string,
    sensitive = false,
    is_json = false
  ) {
    try {
      if (merchant_id && key && value) {
        const option = await super.findOneByConditions(
          {
            merchant_id,
            key
          },
          "merchant_options"
        );

        if (!option) {
          await super.insert(
            {
              key,
              value,
              is_json,
              sensitive,
              merchant_id
            },
            "merchant_options"
          );
          return;
        }

        await super.update(
          { value, is_json, sensitive },
          { merchant_id, key },
          "merchant_options"
        );
      }
    } catch (err: any) {}
  }

  async removeOption(merchant_id: string | number, key: string) {
    if (merchant_id && key) {
      await super.removeByConditions({ merchant_id, key }, "merchant_options");
    }
  }

  checkUid(uid: string) {
    let validated = true;

    if (RESERVED_UIDS.indexOf(uid) > -1) {
      validated = false;
    }

    const regex = /(^[a-z0-9])([a-z\-0-9]+)/;
    if (!regex.test(uid.toLowerCase())) {
      validated = false;
    }

    if (!validated) {
      throw new Error("uid error");
    }
  }

  getURL(merchant: Merchant, miniapp = false, provider = "monpay") {
    if (miniapp) {
      const suffix = provider === "monpay" ? ".miniapp" : `-${provider}.inapp`;
      return `https://${merchant.uid}${suffix}.${process.env.MAIN_DOMAIN}`;
    }

    if (merchant.custom_domain) {
      return `https://${merchant.custom_domain}`;
    }

    return `https://${merchant.uid}.${process.env.MAIN_DOMAIN}`;
  }

  async updateQuota(
    merchant_id: string | number,
    product_limit?: number,
    inventory_limit?: number
  ) {
    try {
      if (merchant_id) {
        const product_count = await super.count(
          { shop_id: merchant_id },
          "products"
        );
        const order_count = await super.count(
          { shop_id: merchant_id },
          "orders"
        );
        const inventory_count = await super.count(
          { shop_id: merchant_id },
          "inventory"
        );
        const quota = await super.findOneByConditions(
          {
            merchant_id
          },
          "merchant_quota"
        );

        if (!quota) {
          await super.insert(
            {
              merchant_id,
              product_limit: product_limit || 1000,
              inventory_limit: inventory_limit || 1000,
              product_count,
              order_count,
              inventory_count
            },
            "merchant_quota"
          );
          return;
        }

        await super.update(
          {
            merchant_id,
            product_limit: product_limit || quota.product_limit,
            inventory_limit: inventory_limit || quota.inventory_limit,
            product_count,
            order_count,
            inventory_count
          },
          { merchant_id },
          "merchant_quota"
        );
      }
    } catch (err: any) {}
  }

  async productCountUpdate({ merchant_id }: { merchant_id: ID }) {
    const product_count = await super.count(
      { shop_id: merchant_id },
      "products"
    );
    const quota = await super.findOne(
      "merchant_id",
      merchant_id,
      "merchant_quota"
    );
    if (quota) {
      await super.update(
        {
          product_count
        },
        { merchant_id },
        "merchant_quota"
      );
    }
    return {
      product_count
    };
  }

  async inventoryCountUpdate({ merchant_id }: { merchant_id: ID }) {
    const inventory_count = await super.count(
      { shop_id: merchant_id },
      "inventory"
    );
    const quota = await super.findOne(
      "merchant_id",
      merchant_id,
      "merchant_quota"
    );
    if (!quota) {
      await super.insert(
        {
          merchant_id,
          inventory_count
        },
        "merchant_quota"
      );
    } else {
      await super.update(
        {
          inventory_count
        },
        { merchant_id },
        "merchant_quota"
      );
    }
    return {
      inventory_count
    };
  }

  async orderCountUpdate({ merchant_id }: { merchant_id: ID }) {
    const order_count = await super.count({ shop_id: merchant_id }, "orders");
    const quota = await super.findOne(
      "merchant_id",
      merchant_id,
      "merchant_quota"
    );
    if (!quota) {
      await super.insert(
        {
          merchant_id,
          order_count
        },
        "merchant_quota"
      );
    } else {
      await super.update(
        {
          order_count
        },
        { merchant_id },
        "merchant_quota"
      );
    }
    return {
      order_count
    };
  }

  async checkProductLimit(
    merchant_id: number | string,
    message = "product quantity limited.",
    status = "product_limited"
  ): Promise<any> {
    const product_count = await super.count(
      { shop_id: merchant_id },
      "products"
    );
    const quota = await super.findOne(
      "merchant_id",
      merchant_id,
      "merchant_quota"
    );
    if (quota && product_count >= quota.product_limit) {
      throw {
        message,
        responseCode: 500,
        responseStatus: status
      };
    }
  }

  async checkInventoryLimit(
    merchant_id: number | string,
    message = "inventory quantity limited.",
    status = "inventory_limited"
  ): Promise<any> {
    const inventory_count = await super.count(
      { shop_id: merchant_id },
      "inventory"
    );
    const quota = await super.findOne(
      "merchant_id",
      merchant_id,
      "merchant_quota"
    );
    if (quota && inventory_count >= quota.inventory_limit) {
      throw {
        message,
        responseCode: 500,
        responseStatus: status
      };
    }
  }

  async checkMerchantOwnership(
    user_id: number | string,
    merchant_id: number | string,
    message = "User is not owner of the shop.",
    status = constants.PERMISSION_DENIED
  ): Promise<any> {
    const owners = await super.findAll(
      {
        user_id,
        merchant_id,
        user_type: "admin"
      },
      "merchants_users"
    );

    if (owners.length === 0) {
      throw {
        message,
        responseCode: 500,
        responseStatus: status
      };
    }
  }

  async updateFlag(merchant_id: ID, key: string, value: boolean) {
    try {
      if (merchant_id && key && value) {
        const flag = await super.findOneByConditions(
          {
            merchant_id,
            key
          },
          "merchant_flags"
        );

        if (!flag) {
          await super.insert(
            {
              key,
              value,
              merchant_id
            },
            "merchant_flags"
          );
          return;
        }

        await super.update({ value }, { merchant_id, key }, "merchant_flags");
      }
    } catch (err: any) {}
  }

  async removeFlag(merchant_id: ID, key: string) {
    if (merchant_id && key) {
      await super.removeByConditions({ merchant_id, key }, "merchant_flags");
    }
  }
}
