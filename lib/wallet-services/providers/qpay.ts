
import axios from "axios";
import moment from 'moment';
import logger from "lib/utils/logger";

const {
  QPAY_WALLET_URL,
  QPAY_WALLET_AUTH_USERNAME,
  QPAY_WALLET_AUTH_PASSWORD,
} = process.env;

export default class QpayWalletProvider {
  async requestCard(
    {
      extra,
      redirect_url,
    }: {
      redirect_url: string,
      extra: { [key: string]: any },
    }) {
      const { access_token } = await this._authenticate();

      return await this._sendRequest(
        "/card/register",
        "post",
        {
          headers: {
            Authorization: `Bearer ${access_token}`
          },
          data: {
            phone: extra?.phone,
            callback_url: redirect_url,
            last_name: extra?.last_name || "NA",
            first_name: extra?.first_name|| "NA",
            customer_code: extra?.customer_code,
          }
        }
      );
  }

  private async _authenticate() {
    const { access_token, expires_in} = await this._sendRequest(
      '/auth/token',
      "post",
      {
        auth: {
          username: QPAY_WALLET_AUTH_USERNAME || "",
          password: QPAY_WALLET_AUTH_PASSWORD || "",
        }
      },
    );

    return { access_token, expires_in };
  }

  private async _sendRequest(url: string, method: any, options: { [key: string]: any }) {
    try {
      const { data } = await axios({
        method,
        url: `${QPAY_WALLET_URL}${url}`,
        ...options
      });

      return data as any;
    } catch(error: any) {
      console.log(`${error.message},${JSON.stringify((error.response || {}).data)}`);
      console.error(error);
      throw new Error(`${error.message},${JSON.stringify((error.response || {}).data)}`);
    }
  }
}
