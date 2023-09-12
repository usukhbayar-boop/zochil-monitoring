import moment from "moment";
import axios from "axios";
import logger from "lib/utils/logger";

const {
  QPAY_API_URL,
  QPAY_CLIENT_ID,
  QPAY_CLIENT_SECRET,
} = process.env;

export default class KhanbankSuperappPaymentProvider {
  async createInvoice({
    amount,
    extra = {},
  }: any) {
    if (!extra.bill_no || !extra.qpay_template_id || !extra.qpay_merchant_id) {
      throw new Error(`Invalid extra data: ${JSON.stringify(extra)}`);
    }

    const data = {
      amount,
      "pos_id": "1",
      "branch_id": "1",
      "bill_no": extra.bill_no,
      "description": extra.description,
      "template_id": extra.qpay_template_id,
      "merchant_id": extra.qpay_merchant_id,
      "date": moment().format("YYYY-MM-DD HH:mm"),
      "receiver": {
        note: extra.note,
        id: extra.receiver_id,
        phone_number: /[0-9]{8}/g.test(extra.merchant_phone)
          ? extra.merchant_phone : "77778787",
      },
      "btuk_code": "",
      "vat_flag": "0"
    }

    try {
      const { access_token, expires_in } = await this.getQPAYAccessToken();

      if (access_token) {
          const { data: response } = await axios({
            data,
            method: 'post',
            url: `${QPAY_API_URL}/bill/create`,
            headers: { authorization: `Bearer ${access_token}` },
          });

          response.access_token = access_token;
          response.access_token_expires = moment().add(expires_in, 's').toDate();

          return {
            response,
            invoiceno: extra.bill_no,
            qrcode: response.qPay_QRcode,
            deeplinks: response.qPay_deeplink,
          };
      } else {
        throw new Error(`Error fetching qpay access token.`);
      }
    } catch(err: any) {
      throw new Error(`${err.message}, ${JSON.stringify((err.response || {}).data)}`);
    }
  }


  async checkInvoice({
    extra,
    invoiceno,
  }: any) {
    let success = false;

    try {
      if (!extra.qpay_merchant_id) {
        throw new Error('QPay merchant id missing.');
      }

      if (!(extra.response && extra.response.access_token)) {
        throw new Error('QPay access token missing.');
      }

      const access_token = extra.response.access_token;

      const { data: { payment_info } } = await axios({
        data: {
          "order_no": invoiceno,
          "merchant_id": extra.qpay_merchant_id,
        },
        method: 'post',
        url: `${QPAY_API_URL}/in_store/check`,
        headers: { authorization: `Bearer ${access_token}` },
      });

      if (
        payment_info &&
        (payment_info.payment_status || '').toLowerCase() === 'paid'
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

  async getQPAYAccessToken() {
    try {
      const { data: { access_token , expires_in } } = await axios({
        method: 'post',
        url: `${QPAY_API_URL}/auth/token`,
        data: {
          grant_type: "client",
          client_id: QPAY_CLIENT_ID,
          client_secret: QPAY_CLIENT_SECRET,
        },
      });

      return { access_token, expires_in};
    } catch(error: any) {
      throw new Error(`${error.message},${JSON.stringify((error.response || {}).data)}`);
    }
  }

  async getUserInfo({ code }: any) {
    const result = JSON.parse(code);

    if (result) {
      const { firstName, lastName, email, phone } = result;
      return {
        email,
        phone,
        last_name: lastName || "khanbank user",
        first_name: firstName || "khanbank user",
      };
    }

    return {}
  }

  async validateHook() {
    return true;
  }
}
