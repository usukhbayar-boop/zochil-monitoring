import axios from "axios";
import logger from "lib/utils/logger";

const { LENDPAY_API_URL, LENDPAY_AUTH_USERNAME, LENDPAY_AUTH_PASSWORD } =
  process.env;

export default class LendpayPaymentProvider {
  async createInvoice({ amount, extra = {} }: any) {
    if (
      !extra.lendpay_username ||
      !extra.lendpay_password ||
      !extra.lendpay_id
    ) {
      throw new Error(`Invalid extra data: ${JSON.stringify(extra)}`);
    }

    const data = {
      amount,
      expiredDate: extra.expire_at,
      receiverWalletId: extra.lendpay_wallet_id,
      organizationId: extra.lendpay_organization_id,
      description: extra.description,
      externalId: extra.lendpay_tracking_data,
      userWalletNumber: extra.lendpay_user_wallet_id,
      lendPay: true
    };

    let error_message = "Нэхэмжлэх үүсгэхэд алдаа гарлаа.";

    try {
      const { access_token } = await this._getAccessToken(
        extra.lendpay_username,
        extra.lendpay_password
      );

      if (access_token) {
        const {
          data: { value, status, ...resp }
        } = await axios({
          data,
          method: "post",
          url: `${LENDPAY_API_URL}/payment/create-invoice`,
          headers: { "x-and-auth-token": `${access_token}` }
        });

        if (value && status && status.toLowerCase() === "success") {
          return {
            invoiceno: `sp_${value}`,
            response: { status, value, ...resp }
          };
        } else {
          if (resp.msgList && resp.msgList.length) {
            error_message = error_message + " " + resp.msgList[0].text;
          }

          throw {
            error_message,
            message: "Failed loan request.",
            response: { data: { status, value, ...resp } }
          };
        }
      } else {
        throw {
          message: "Error fetching lendpay access token."
        };
      }
    } catch (err: any) {
      throw {
        error_message: err.error_message || error_message,
        message: `${err.message}, ${JSON.stringify((err.response || {}).data)}`
      };
    }
  }

  async checkInvoice({ invoiceno, extra = {} }: any) {
    let success = false;

    try {
      if (!extra.lendpay_username || !extra.lendpay_password) {
        throw new Error(`Invalid extra data: ${JSON.stringify(extra)}`);
      }

      const { access_token } = await this._getAccessToken(
        extra.lendpay_username,
        extra.lendpay_password
      );

      const {
        data: { status, value }
      } = await axios({
        method: "get",
        headers: { "x-and-auth-token": `${access_token}` },
        url: `${LENDPAY_API_URL}/payment/check-invoice/${invoiceno}`
      });

      if (value === true && status && status.toLowerCase() === "success") {
        success = true;
      }
    } catch (err: any) {
      logger.error({
        message: `${err.message}, ${JSON.stringify((err.response || {}).data)}`
      });
      success = false;
    }

    return success;
  }

  
  async _getAccessToken(username: string, password: string) {
    try {
      //@ts-ignore
      const { data: { access_token , expires_in } } = await axios({
        method: 'post',
        auth: {
          username: LENDPAY_AUTH_USERNAME,
          password: LENDPAY_AUTH_PASSWORD,
        },
        url: `${LENDPAY_API_URL}:7701/oauth/token?grant_type=password&username=${username}&password=${password}`,
      });

      return { access_token, expires_in};
    } catch(error: any) {
      throw new Error(`${error.message},${JSON.stringify((error.response || {}).data)}`);
    }
  }
  async validateHook() {
    return true;
  }
}
