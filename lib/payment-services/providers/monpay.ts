import qs from "qs";
import axios from "axios"

const {
  MONPAY_API_URL,
} = process.env;

export default class MonpayPaymentProvider {
  async createInvoice({ amount, redirect_uri, access_token, extra = {} }: any) {
    const { result } = await this._sendRequest(
      "post",
      "/api/oauth/invoice",
      access_token,
      {
        amount,
        invoiceType: "P2B",
        receiver: extra.receiver,
        redirectUri: redirect_uri,
        description: extra.description,
      }
    );

    if (result && result.id) {
      return {
        response: result,
        invoiceno: `${result.id || ""}`,
        checkout_url: `${result.redirectUri || ""}`,
      };
    }

    return {};
  }

  async checkInvoice({ invoiceno, access_token }: any) {
    let success = false;

    try {
      const { result } = await this._sendRequest(
        'get',
        `/api/oauth/invoice/${invoiceno}`,
        access_token,
      );

      if (
        result &&
        result.status &&
        result.status.toLowerCase() === 'paid'
      ) {
        success = true;
      }
    } catch(err: any) {}

    return success;
  }

  async getUserInfo({
    code,
    client_id,
    client_secret,
  }: any) {
    try {
      const access_token = await this.getAccessToken({
        code,
        client_id,
        client_secret,
        grant_type: "authorization_code",
        redirect_uri: process.env.MONPAY_WEBHOOK_URL || "",
      });

      const { result } = await this._sendRequest(
        "get",
        "/api/oauth/userinfo",
        access_token
      );

      if (result && result.userId) {
        return {
          user_id: result.userId,
          email: result.userEmail,
          regno: result.userRegno,
          phone: result.userPhone,
          last_name: result.userLastname,
          first_name: result.userFirstname,
        };
      } else {
        throw new Error("MonPay user not found");
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  async getAccessToken({
    code,
    client_id,
    grant_type,
    redirect_uri,
    client_secret,
  }: {
    code?: string ,
    client_id: string,
    redirect_uri: string,
    client_secret: string,
    grant_type: "authorization_code" | "client_credentials"
  }) {
    const args: any = {
      client_id,
      grant_type,
      redirect_uri,
      client_secret,
    };

    if (code) {
      args.code = code;
    }

    try {
      const resp = await axios({
        method: "post",
        data: qs.stringify(args),
        url: `${MONPAY_API_URL}/oauth/token`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      return resp?.data?.access_token || "";
    } catch (err: any) {
      throw new Error(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`
      );
    }
  }

  async _sendRequest(method: string, url: string, access_token: string, data?: any) {
    const options: any = {
      method,
      url: `${MONPAY_API_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    };

    if (method === "post") {
      options.data = JSON.stringify(data);
    }

    try {
      const resp = await axios(options);
      return resp.data;
    } catch (err: any) {
      console.log((err.response || {}).data);
      throw new Error(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`
      );
    }
  }
}
