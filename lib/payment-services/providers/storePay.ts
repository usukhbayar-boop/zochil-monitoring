import axios from "axios"
import logger from "lib/utils/logger";

const {
  STOREPAY_API_URL,
  STOREPAY_AUTH_USERNAME,
  STOREPAY_AUTH_PASSWORD,
} = process.env;

export default class StorepayPaymentProvider {
  async createInvoice({
    amount,
    extra = {},
  }: any) {
    if (!extra.storepay_username || !extra.storepay_password || !extra.storepay_id) {
      throw new Error(`Invalid extra data: ${JSON.stringify(extra)}`);
    }

    const data = {
      amount,
      mobileNumber: extra.phone,
      storeId: extra.storepay_id,
      description: extra.description,
    }

    let error_message = "Нэхэмжлэх үүсгэхэд алдаа гарлаа.";

    try {
      const { access_token } = await this._getAccessToken(
        extra.storepay_username,
        extra.storepay_password,
      );

      if (access_token) {
          const { data: { value, status, ...resp } } = await axios({
            data,
            method: 'post',
            url: `${STOREPAY_API_URL}:7005/merchant/loan`,
            headers: { Authorization: `Bearer ${access_token}` },
          });

          if (
            value &&
            status && status.toLowerCase() === 'success'
          ) {
            return {
              invoiceno: `sp_${value}`,
              response: { status, value, ...resp },
            };
          } else {
            if (
              resp.msgList &&
              resp.msgList.length
            ) {
              error_message = error_message + " " + resp.msgList[0].text + " "  + resp.msgList[0].code;
            }

            throw {
              error_message,
              message: 'Failed loan request.',
              response: { data: { status, value, ...resp } },
            }
          }
      } else {
        throw {
          message: "Error fetching storepay access token.",
        };
      }
    } catch(err: any) {
      throw {
        error_message: err.error_message || error_message,
        message: `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
      }
    }
  }

  async checkInvoice({
    invoiceno,
    extra = {},
  }: any) {
    let success = false;

    try {
      if (!extra.storepay_username || !extra.storepay_password) {
        throw new Error(`Invalid extra data: ${JSON.stringify(extra)}`);
      }

      const { access_token } = await this._getAccessToken(
        extra.storepay_username,
        extra.storepay_password,
      );

      const { data: { status, value } } = await axios({
        method: 'get',
        headers: { Authorization: `Bearer ${access_token}` },
        url: `${STOREPAY_API_URL}:7005/merchant/loan/check/${invoiceno.replace('sp_', '')}`,
      });

      if (
        value === true &&
        status && status.toLowerCase() === 'success'
      ) {
        success = true;
      }

    } catch(err: any) {
      logger.error({
        message: `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
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
          username: STOREPAY_AUTH_USERNAME,
          password: STOREPAY_AUTH_PASSWORD,
        },
        url: `${STOREPAY_API_URL}:7701/oauth/token?grant_type=password&username=${username}&password=${password}`,
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
