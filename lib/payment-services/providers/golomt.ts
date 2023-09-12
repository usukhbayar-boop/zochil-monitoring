import axios from "axios";
import crypto from "crypto";

const { GOLOMT_API_URL } = process.env;

export default class GolomtPaymentProvider {
  socialpay: boolean;
  constructor(socialpay = false) {
    this.socialpay = socialpay;
  }

  async createInvoice({ amount, redirect_uri, access_token, extra = {} }: any) {
    const checksum = this._generateChecksum(
      `${extra.transactionId}${amount}${extra.returnType}${redirect_uri}`,
      extra.hmac_key
    );

    const response = await this._sendRequest(
      "post",
      "/api/invoice",
      access_token,
      {
        checksum,
        amount: `${amount}`,
        callback: `${redirect_uri}`,
        returnType: extra.returnType,
        transactionId: `${extra.transactionId}`
      }
    );

    const paymentType = this.socialpay ? "socialpay" : "payment";
    return {
      response,
      invoiceno: extra.transactionId,
      checkout_url: `${GOLOMT_API_URL}/${paymentType}/mn/${response.invoice}`
    };
  }

  async checkInvoice({ invoiceno, access_token, extra = {} }: any) {
    let success = false;
    const checksum = await this._generateChecksum(
      `${invoiceno}${invoiceno}`,
      extra.hmac_key
    );

    try {
      const response = await this._sendRequest(
        "post",
        "/api/inquiry",
        access_token,
        {
          checksum,
          transactionId: invoiceno
        }
      );

      console.log(JSON.stringify(response));

      if (response && response.errorCode === "000") {
        success = true;
      }
    } catch (err: any) {}

    return success;
  }

  async validateHook({
    amount,
    checksum,
    errorCode,
    transactionId,
    hmac_key
  }: any) {
    const checksumToCompare = this._generateChecksum(
      `${transactionId}${errorCode}${amount}`,
      hmac_key
    );

    return checksumToCompare === checksum;
  }

  async _sendRequest(
    method: string,
    url: string,
    access_token: string,
    data: any
  ) {
    const options: any = {
      method,
      url: `${GOLOMT_API_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`
      }
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

  _generateChecksum(message: string, hmac_key: any) {
    const hash = crypto.createHmac("sha256", hmac_key).update(message);

    return hash.digest("hex");
  }

  async preProcess(options: any) {
    const data = options.data;
    const checksum = this._generateChecksum(
      data.amount && data.returnType && data.callback
        ? `${data.transactionId}${data.amount}${data.returnType}${data.callback}`
        : `${data.transactionId}${data.transactionId}`,
      data.hmac_key
    );

    delete data.hmac_key;
    data.checksum = checksum;
    options.data = data;
    return options;
  }
}
