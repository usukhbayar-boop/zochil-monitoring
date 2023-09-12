import axios from "axios";
import numeral from "numeral"
import logger from "lib/utils/logger";
import _ from "lodash";

const {
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  OPEN_GRAPH_URL,
  LOOKBOOK_FACEBOOK_APP_ID,
  LOOKBOOK_FACEBOOK_APP_SECRET
} = process.env;

function _buildQueryString(
  params: { [key: string]: string },
  includeCrediantials = false,
  type?: string
) {
  const options: { [key: string]: any } = { ...params };

  if (includeCrediantials) {
    options.client_id = `${type && type === "lookbook" ? LOOKBOOK_FACEBOOK_APP_ID : FACEBOOK_APP_ID
      }`;
    options.client_secret =
      type && type === "lookbook"
        ? LOOKBOOK_FACEBOOK_APP_SECRET
        : FACEBOOK_APP_SECRET;
  }

  return Object.keys(options)
    .map((key) => `${key}=${encodeURIComponent(options[key])}`)
    .join("&");
}

export async function facebookGraphApiRequest(
  method: string,
  url: string,
  body: any,
  options = {},
  includeCrediantials = false,
  type?: string
) {
  const qs = _buildQueryString(options, includeCrediantials, type);
  try {
    const { data } = await axios({
      method,
      url: `${OPEN_GRAPH_URL}${url}?${qs}`,
      data: method === "post" ? body : undefined
    } as any);

    return data;
  } catch (error: any) {
    throw new Error(`${JSON.stringify({ message: error.message, response: error.response.data})}`);
  }
}
export async function fetchUserInformation(access_token: string) {
  return await facebookGraphApiRequest("get", "/me", undefined, {
    access_token,
    fields: "first_name,last_name,email"
  });
}

export async function fetchLongLivedToken(access_token: string, type?: string) {
  return await facebookGraphApiRequest(
    "get",
    "/oauth/access_token",
    undefined,
    {
      grant_type: "fb_exchange_token",
      fb_exchange_token: access_token
    },
    true,
    type
  );
}

export async function renewLongLivedToken(access_token: string) {
  const { code: client_code } = await facebookGraphApiRequest(
    "get",
    "/oauth/client_code",
    undefined,
    {
      access_token: access_token,
      redirect_uri: process.env.OAUTH_REDIRECT_URL
    },
    true
  );

  return await facebookGraphApiRequest(
    "get",
    "/oauth/access_token",
    undefined,
    {
      code: client_code,
      redirect_uri: process.env.OAUTH_REDIRECT_URL
    },
    true
  );
}

export async function fetchAccounts(user_id: any, access_token: string) {
  return await facebookGraphApiRequest("get", `/${user_id}/accounts`, undefined, {
    access_token
  });
}

export async function fetchCatalogId({
  page_id,
  access_token
}: {
  page_id: any;
  access_token: string;
}) {
  const { data: catalogs } = await facebookGraphApiRequest(
    "get",
    `/${page_id}/product_catalogs`,
    null,
    {
      access_token
    }
  );

  if (catalogs && catalogs.length) {
    return catalogs[0].id;
  }

  return null;
}

export async function syncProduct({
  data,
  catalog_id,
  product_id,
  access_token
}: any) {
  return await facebookGraphApiRequest(
    "post",
    catalog_id ? `/${catalog_id}/products` : `/${product_id}`,
    data,
    {
      access_token
    }
  );
}

export async function removeProduct({ product_id, access_token }: any) {
  return await facebookGraphApiRequest("delete", `/${product_id}`, undefined, {
    access_token
  });
}

export async function disconnectUser({ user_id, access_token }: any) {
  return await facebookGraphApiRequest("delete", `/${user_id}/permissions`, undefined, {
    access_token
  });
}

export async function checkToken(access_token: string) {
  let success = false;

  try {
    await facebookGraphApiRequest("get", `/me`, undefined, {
      access_token
    });

    success = true;
  } catch (error: any) {
    logger.error({
      message: error.stack || error.message,
      module: "external-apis/facebook"
    });
  }

  return success;
}

export async function postToPage({
  message,
  link,
  page_id,
  access_token
}: any) {
  return await facebookGraphApiRequest("post", `/${page_id}/feed`, undefined, {
    access_token,
    message,
    link: link.replace(/\s|\n/g, "")
  });
}

export async function addCallToActionToPage({
  page_id,
  url,
  access_token,
  type
}: any) {
  return await facebookGraphApiRequest(
    "post",
    `/${page_id}/call_to_actions`,
    {
      type,
      web_url: url,
      iphone_url: url,
      android_url: url,
      web_destination_type: "WEBSITE",
      iphone_destination_type: "WEBSITE",
      android_destination_type: "WEBSITE"
    },
    {
      access_token
    }
  );
}

export async function catalogBatch(
  catalog_id: any,
  requests: any,
  access_token: string
) {
  return await facebookGraphApiRequest(
    "post",
    `/${catalog_id}/batch`,
    {
      requests,
      allow_upsert: true
    },
    {
      access_token
    }
  );
}

export async function subscribePageToApp({ page_id, access_token }: any) {
  await facebookGraphApiRequest(
    "post",
    `/${page_id}/subscribed_apps`,
    { subscribed_fields: "messages,messaging_postbacks,message_echoes" },
    { access_token }
  );
}

export async function fetchPageDetail({ page_id, access_token }: any) {
  return await facebookGraphApiRequest("get", `/${page_id}`, undefined, {
    access_token,
    locale: "en_US",
    fields: "cover,phone,category,emails,username,about,single_line_address"
  });
}

export async function configureMessengerProfile({
  page_id,
  domains,
  access_token
}: any) {
  const body = {
    get_started: {
      payload: "MAIN_MENU"
    },
    whitelisted_domains: domains,
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          {
            type: "postback",
            title: "Дэлгүүр хэсэх",
            payload: "PRODUCT_HOME"
          },
          {
            type: "postback",
            title: "Мэдээ мэдээлэл",
            payload: "POST_HOME"
          },
          {
            type: "postback",
            title: "Холбоо барих / Тусламж",
            payload: "CONTACT_HOME"
          }
        ]
      }
    ]
  };

  await facebookGraphApiRequest("post", "/me/messenger_profile", body, {
    access_token
  });
}

export async function fetchInstagramPost({ post_url, access_token }: any) {
  return await facebookGraphApiRequest("get", `/instagram_oembed`, undefined, {
    access_token,
    url: post_url
  });
}

export async function fetchInstagramPosts(instagram_posts: any) {
  const promises = _.map(instagram_posts, async (post) => {
    try {
      const { author_name, thumbnail_url } = await facebookGraphApiRequest(
        "get",
        `/instagram_oembed`,
        undefined,
        {
          access_token: process.env.FACEBOOK_OEMBED_TOKEN,
          url: post.url
        }
      );
      return { author_name, thumbnail_url, url: post.url };
    } catch (err) {
      return { url: post.url };
    }
  });
  return await Promise.all(promises);
}
