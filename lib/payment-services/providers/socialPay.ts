import GolomtPaymentProvider from './golomt';
import axios from "axios"
import crypto from "crypto"

export default class SocialPayPaymentProvider extends GolomtPaymentProvider {
  constructor() {
    super(true);
  }

  async getUserInfo({ code }: any) {
    const {
      email,
      firstName,
      lastName,
      mobileNumber,
      registerNumber,
    } = await this._sendWebTokenRequest(code);

    return {
      email,
      regno: registerNumber,
      last_name: lastName,
      phone: mobileNumber,
      first_name: firstName,
    };
  }

  async _sendWebTokenRequest(token: string) {
    const data = { token };
    const signature = this._getRequestSignature(JSON.stringify(data));

    const options: any = {
      data,
      method: "post",
      url: `${process.env.SOCIALPAY_WEB_TOKEN_URL || ""}/utility/miniapp/token/check?language=mn`,
      headers: {
        "Content-Type": "application/json",
        "X-Golomt-Signature": signature,
        "X-Golomt-Cert-Id": process.env.SOCIALPAY_CERT_ID || "",
      },
    };

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

  _getRequestSignature(data: string) {
    try {
      const publicKey = `-----BEGIN PUBLIC KEY-----\n${process.env.SOCIAL_PAY_PUBLIC_KEY || ""}\n-----END PUBLIC KEY-----`;
      const hash = crypto.createHash('sha256').update(data, 'utf8').digest('hex');
      // Encrypt using RSA with public key
      const encrypted = crypto.publicEncrypt({
        padding: crypto.constants.RSA_PKCS1_PADDING,
        key: publicKey,
      }, Buffer.from(hash, 'utf8'));
      return encrypted.toString('base64');

    } catch(err: any) {
      console.log(err.message);
    }

    return "";
  }
}
