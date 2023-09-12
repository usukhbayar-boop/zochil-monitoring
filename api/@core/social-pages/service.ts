import moment from "moment";
import pick from "lodash/pick";
import logger from "lib/utils/logger";
import APIService from "core/base/service";
import CustomError from "lib/errors/custom_error";
import MerchantService from "core/merchants/service";

import * as facebook from "lib/external-apis/facebook";
import { DBConnection, ID, User } from "core/types";





export default class SocialPagesService extends APIService {
  _merchantService: MerchantService;

  constructor(db: DBConnection) {
    super(db, "social_pages");
    this._merchantService = new MerchantService(db, "shops");
  }

  async list(user: User) {
    const pages = await super.findAll({
      user_id: user.id
    });

    return { pages };
  }

  async remove(user: User, id: ID) {
    const existing = await super.findAll({
      id,
      user_id: user.id
    });

    if (existing && existing.length) {
      await this.removeByConditions({
        id,
        user_id: user.id
      });
    }
  }

  async update({
    user,
    id,
    name,
    status,
    page_type,
    uid
  }: {
    user: User;
    id: ID;
    name: string;
    status: string;
    page_type: string;
    uid: string;
  }) {
    const existing = await super.findAll({
      id,
      user_id: user.id
    });

    if (existing && existing.length) {
      await super.update(
        {
          name,
          status,
          page_type,
          uid,
          user_id: user.id
        },
        {
          id,
          user_id: user.id
        }
      );
    }
  }

  async postToPage({
    user,
    shop_id,
    link,
    message
  }: {
    user: User;
    shop_id: ID;
    link: string;
    message: string;
  }) {
    await this._merchantService.checkOwnership(user.id, shop_id);
    const shop = await this._merchantService.getMerchant(shop_id);

    if (shop.social_page_uid) {
      const socialPage = await super.findOneByConditions({
        user_id: user.id,
        uid: shop.social_page_uid
      });

      if (socialPage) {
        await this._sendFacebookAPIRequest(
          user,
          "post",
          `/${shop.social_page_uid}/feed`,
          undefined,
          {
            access_token: socialPage.access_token,
            message,
            link: link.replace(/\s|\n/g, "")
          }
        );
      }
    }
  }

  async connectFacebook({
    id,
    access_token,
    usersTable = "users"
  }: {
    id: ID;
    access_token: string;
    usersTable: string;
  }) {
    const user = await super.findOne("id", id, usersTable);
    const tokenResult = await this._sendFacebookAPIRequest(
      user,
      "get",
      "/oauth/access_token",
      undefined,
      {
        grant_type: "fb_exchange_token",
        fb_exchange_token: access_token
      },
      true,
    )

    if (tokenResult && tokenResult.access_token) {
      const fbUser = await this._sendFacebookAPIRequest(
        user,
        "get",
        `/me`,
        undefined,
        {
          access_token: tokenResult.access_token,
          fields: "first_name,last_name,email"
        }
      );

      await super.update(
        {
          facebook_id: fbUser.id,
          facebook_token: tokenResult.access_token,
          facebook_token_expires: moment().add(55, "d").toDate()
        },
        {
          id
        },
        usersTable
      );
    } else {
      throw new Error(
        `Error fetching fb long lived token: ${JSON.stringify(tokenResult)}`
      );
    }
  }

  async fetchFacebookPages(userId: ID, usersTable = "users") {
    const user = await super.findOne("id", userId, usersTable);

    if (user && user.facebook_id && user.facebook_token) {
      const { data: pages } = await this._sendFacebookAPIRequest(
        user,
        "get",
        `/${user.facebook_id}/accounts`,
        undefined,
        {
          access_token: user.facebook_token
        }
      );

      return { fb_pages: pages.map((page: any) => pick(page, ["id", "name"])) };
    } else {
      throw new Error(
        `User hadn't connected facebook profile: ${JSON.stringify(user)}`
      );
    }
  }

  async saveFacebookPages({
    user_id,
    ids = [],
    has_chatbot = false
  }: {
    user_id: ID;
    ids: ID[];
    has_chatbot: boolean;
  }) {
    const user = await super.findOne("id", user_id, "users");

    if (user && user.facebook_id && user.facebook_token) {
      const { data: fbPages } = await this._sendFacebookAPIRequest(
        user,
        "get",
        `/${user.facebook_id}/accounts`,
        undefined,
        {
          access_token: user.facebook_token
        }
      );

      if (fbPages && fbPages.length) {
        const pages = fbPages.filter((page: any) => ids.indexOf(page.id) > -1);
        for (const currentPage of pages) {
          try {
            await super.insert({
              has_chatbot,
              uid: currentPage.id,
              name: currentPage.name,
              status: "enabled",
              user_id: user.id,
              page_type: "facebook",
              access_token: currentPage.access_token,
              chatbot_token: currentPage.access_token,
              access_token_expires: moment().add(55, "d").toDate()
            });
          } catch (error: any) {
            logger.error({
              message: error.stack || error.message,
              page_id: (currentPage || {}).id,
              module_name: `core/social_pages`
            });
          }
        }
      } else {
        throw new Error(`No pages for facebook user ${user.facebook_id}`);
      }
    } else {
      throw new Error(
        `User hadn't connected facebook profile: ${JSON.stringify(user)}`
      );
    }
  }

  async checkFacebookConnection(user_id: ID, usersTable = "users") {
    let success = false;
    const user = await super.findOneByConditions({ id: user_id }, usersTable);

    if (user) {
      if (user.facebook_id && user.facebook_token) {
        try {
          await this._sendFacebookAPIRequest(
            user,
            "get",
            `/me`,
            undefined,
            {
              access_token: user.facebook_token
            }
          );

          success = true;
        } catch {}

        if (!success) {
          await super.update(
            {
              facebook_id: null,
              facebook_token: null,
              facebook_token_expires: null
            },
            { id: user_id },
            usersTable
          );
        }
      }
    }

    return { success };
  }

  async configurePrimaryPage(user: User, shop_id: ID, uid: string) {
    await this._merchantService.checkOwnership(user.id, shop_id);

    const shop = await this._merchantService.getMerchant(shop_id);
    if (shop) {
      await super.removeByConditions({ uid, user_id: user.id });
      await this.saveFacebookPages({
        ids: [uid],
        user_id: user.id,
        has_chatbot: !!shop.has_chatbot
      });
      await super.update(
        {
          social_page_uid: uid
        },
        { id: shop_id },
        "shops"
      );

      await this._merchantService.updateOption(
        shop_id,
        "facebook_connected",
        "1"
      );
    }
  }

  async configureChatbot(user: User, shop_id: ID) {
    await this._merchantService.checkOwnership(user.id, shop_id);

    const shop = await this._merchantService.getMerchant(shop_id);
    if (shop && shop.social_page_uid && shop.has_chatbot) {
      const socialPage = await super.findOneByConditions({
        uid: shop.social_page_uid
      });

      if (socialPage) {
        await this._sendFacebookAPIRequest(
          user,
          "post",
          `/${socialPage.uid}/subscribed_apps`,
          undefined,
          {
            access_token: socialPage.access_token
          }
        );
        await facebook.configureMessengerProfile({
          page_id: socialPage.uid,
          domains: [shop.custom_domain, `${shop.uid}.zochil.shop`]
            .filter((d) => d)
            .map((d) => `https://${d}`),
          access_token: socialPage.access_token
        });

        await super.update(
          {
            has_chatbot: true,
            chatbot_configured: true
          },
          { uid: shop.social_page_uid }
        );
      } else {
        throw new Error("Social page not not configured for this page.");
      }
    } else {
      throw new Error("Social page not not configured for this page.");
    }
  }

  async removePrimaryPage(user: User, shop_id: ID, usersTable = "users") {
    await this._merchantService.checkOwnership(user.id, shop_id);
    const shop = await this._merchantService.getMerchant(shop_id);
    const currentUser = await super.findOne("id", user.id, usersTable);

    if (shop.social_page_uid) {
      await super.removeByConditions({
        user_id: user.id,
        uid: shop.social_page_uid
      });

      if (currentUser.facebook_id && currentUser.facebook_token) {
        try {
          const data = await this._sendFacebookAPIRequest(
            user,
            "delete",
            `/${currentUser.facebook_id}/permissions`,
            undefined,
            {
              access_token: currentUser.facebook_token
            }
          );
        } catch (error: any) {
          logger.error({
            message: error.stack || error.message,
            page_id: shop.social_page_uid,
            module_name: `core/social_pages`
          });
        }
      }
    }

    await this._merchantService.removeOption(shop_id, "facebook_connected");

    await super.update(
      {
        facebook_id: null,
        facebook_token: null,
        facebook_token_expires: null
      },
      { id: user.id },
      usersTable
    );
  }

  async syncFBAll({
    page_id,
    access_token
  }: {
    page_id: ID;
    requests: any;
    access_token: string;
  }) {
    const socialPage = await super.findOneByConditions({
      uid: page_id
    });

    if (socialPage && socialPage.fb_catalog_id) {
      await this._sendFacebookAPIRequest(
        {} as any,
        "post",
        `/${socialPage.fb_catalog_id}/batch`,
        undefined,
        {
          access_token: access_token
        }
      );
    }
  }

  async getPrimaryPage(user: User, shop_id: ID) {
    const { social_page_uid } = await this._merchantService.getMerchant(
      shop_id
    );

    const page = await super.findOneByConditions({
      user_id: user.id,
      uid: social_page_uid
    });

    return { data: page };
  }

  private async _sendFacebookAPIRequest(
    user: User,
    method: string,
    url: string,
    body: any,
    options: { [key: string]: any } = {},
    includeCrediantials = false,
    type?: string
  ) {
    const id = await super.insert(
      {
        url,
        method,
        account_id: user.id,
        access_token: `${options?.access_token || ""}`,
        params: `${JSON.stringify(body || {})}`
      },
      "social_page_requests"
    );

    try {
      const response = await facebook.facebookGraphApiRequest(
        method,
        url,
        body,
        options,
        includeCrediantials,
        type
      );

      await super.update(
        {
          status: "success",
          response: JSON.stringify(response)
        },
        { id },
        "social_page_requests"
      );

      return response;
    } catch (err: any) {
      await super.update(
        {
          status: "error",
          response: err.message
        },
        { id },
        "social_page_requests"
      );

      throw new CustomError(err.message, err.message);
    }
  }
}
