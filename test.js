const psl = require("psl");
const axios = require("axios");
function fetchShopId(req, res, next) {
  const BACKEND_URL = process.env.BACKEND_URL;
  const MAIN_DOMAIN = process.env.MAIN_DOMAIN;

  if (req.url.indexOf("/static") === -1 && req.url.indexOf("/_next") === -1) {
    const host = psl.parse(req.get("host"));

    let uid = "",
      inapp = false,
      miniapp = false,
      miniapp_provider = "";

    if (host.domain === MAIN_DOMAIN) {
      if (host.subdomain === "accounts") {
        return next();
      }

      uid = `${host.subdomain}`;

      if (uid.endsWith(".miniapp") || uid.endsWith(".socialpay")) {
        miniapp = true;
        miniapp_provider = uid.substring(uid.lastIndexOf(".") + 1);

        if (miniapp_provider === "miniapp") {
          miniapp_provider = "monpay";
        }

        uid = uid.replace(/\.miniapp|\.socialpay/g, "");
      }

      if (uid.endsWith(".inapp")) {
        uid = uid.replace(".inapp", "");
        const uidParts = uid.split("-");
        if (uidParts.length === 2) {
          inapp = true;
          miniapp = true;
          miniapp_provider = uidParts[1];

          uid = uidParts[0];
        }
      }
    } else {
      uid = (host.domain || "").replace(`.${host.tld}`, "");

      if (host.subdomain) {
        uid = `${host.subdomain}.${uid}`;
      }
    }

    if (process.env.NODE_ENV !== "production") {
      uid = "iveelbrand";
      host.domain = `https://iveelbrand.zochil.shop/`;
    }

    if (!uid) {
      return res.redirect(`https://zochil.shop`);
    }

    const fetchUrl = `${BACKEND_URL}/storefront/shops/${uid}`;

    return axios
      .get(fetchUrl)
      .then(({ data }) => {
        if (data.shop && data.shop.id) {
          data.shop.inapp = inapp;
          data.shop.miniapp = miniapp;
          data.shop.miniapp_provider = miniapp_provider;

          req.__zochil_shop = data.shop;
          req.__zochil_categories = data.categories || [];

          if (data.shop.expired || !data.shop.is_subscribed) {
            return res.redirect(`https://${MAIN_DOMAIN}`);
          }

          if (
            !miniapp &&
            host.domain === MAIN_DOMAIN &&
            data.shop.custom_domain
          ) {
            return res.redirect(`https://${data.shop.custom_domain}${req.url}`);
          }

          return next();
        }

        return Promise.reject(`INVALID RESULT : ${JSON.stringify(data || {})}`);
      })
      .catch((err) => {
        console.log((err || {}).message);
        return res.redirect(`https://zochil.shop`);
      });
  }

  next();
}

module.exports = {
  fetchShopId
};
