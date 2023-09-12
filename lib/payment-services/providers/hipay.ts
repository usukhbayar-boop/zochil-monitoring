import axios from "axios"
import logger from "lib/utils/logger";

const { HIPAY_API_URL } = process.env;

export default class HiPayPaymentProvider {
  async createInvoice({
    amount,
    access_token,
    redirect_uri,
    extra = {},
  }: any) {
    if (!extra.hipay_entity_id || !extra.hipay_redirect_uri) {
      throw new Error(`Invalid extra data: ${JSON.stringify(extra)}`);
    }

    try {
      console.log("HIPAY: ", extra.hipay_entity_id, access_token)
      let response = await this._sendRequest(
        "/checkout",
        access_token,
        {
          amount,
          signal: true,
          currency: 'MNT',
          entityId: extra.hipay_entity_id,
          redirect_uri: extra.hipay_redirect_uri,
        },
      );

      if (response.checkoutId && response.code === 1) {
        return {
          response,
          invoiceno: response.checkoutId,
          checkout_url: `${HIPAY_API_URL}/payment?checkoutId=${response.checkoutId}&shopperResultUrl=${extra.hipay_redirect_uri}&shopperCancelUrl=${redirect_uri}&lang=mn`,
        };
      } else {
        throw {
          message: 'Failed invoice request.',
          response: { data: response },
        }
      }
    } catch(err: any) {
      throw new Error(`${err.message}, ${JSON.stringify((err.response || {}).data)}`);
    }
  }

  async checkInvoice({
    invoiceno,
    access_token,
    extra = {},
  }: any) {
    let success = false;

    if (!extra.hipay_entity_id) {
      throw new Error(`Invalid extra data: ${JSON.stringify(extra)}`);
    }

    try {
      const { data: { status, ...resp } } = await axios({
        method: 'get',
        headers: { Authorization: `Bearer ${access_token}` },
        url: `${HIPAY_API_URL}/checkout/get/${invoiceno}?entityId=${extra.hipay_entity_id}`,
      });

      if (resp.paymentId && `${status}` === 'paid') {
        success = true;
      }

    } catch(err: any) {
      logger.error(`${err.message}, ${JSON.stringify((err.response || {}).data)}`);
      success = false;
    }

    return success;
  }

  async validateHook() {
    return true;
  }

  async getUserInfo({ code, redirect_uri, client_id, client_secret }: any) {
    try {
      const response = await this._sendRequest('/v2/auth/token', null, {
        code,
        client_id,
        client_secret,
        grant_type: "authorization_code",
        redirect_uri: 'https://zochil.mn',
      });

      if (response && response.access_token) {
        const {
          code,
          email,
          phone,
          lastname: last_name,
          firstname: first_name,
        } = await this._sendRequest('/v2/user/info', response.access_token, null, 'get');

        if (phone && last_name && first_name) {
          return { phone, last_name, email, first_name };
        }
      } else {
        throw new Error(`Error: ${JSON.stringify(response)}`);
      }
    } catch(err: any) {
      throw new Error(`${err.message}, ${JSON.stringify((err.response || {}).data)}`);
    }
  }

  async _sendRequest(url: string, access_token: string | null, payload: any, method="post") {
    const { data } = await axios({
      method,
      data: JSON.stringify(payload),
      url: `${HIPAY_API_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        ...(!!access_token && { Authorization: `Bearer ${access_token}`, })
      },
    } as any);

    return data || {};
  }

}


