import axios from "axios";
import crypto from "crypto";
import moment from "moment";

const {
  GOLOMT_LOAN_LOGIN_NAME,
  GOLOMT_LOAN_LOGIN_PASSWORD,
  GOLOMT_LOAN_API_URL,
  GOLOMT_LOAN_IV_KEY,
  GOLOMT_LOAN_SESSION_KEY,
  ZOCHIL_LOAN_REDIRECT_URI
} = process.env;

const SERVICE_MAP: any = {
  prod_code: "ONLNLN",
  appointment: "OCCUPATION",
  sector: "SECTOR_CODE",
  sub_sector: "SUB_SECTOR_CODE",
  degree: "QUALIFICATION",
  marital_status: "MARITAL_STATUS",
  payday: "PAYDAY"
};

const encryptionType = "aes-128-cbc";
const encryptionEncoding = "base64";
const bufferEncryption = "utf-8";
const aesKey = `${GOLOMT_LOAN_SESSION_KEY}`;
const aesIv = `${GOLOMT_LOAN_IV_KEY}`;
export default class GolomtLoanService {
  async login() {
    const encrypted = this.encryptAes(`${GOLOMT_LOAN_LOGIN_PASSWORD}`);
    const options: any = {
      method: "post",
      url: `${GOLOMT_LOAN_API_URL}/v1/auth/login`,
      headers: {
        "Content-Type": "application/json",
        "X-Golomt-Service": "LGIN"
      },
      data: JSON.stringify({
        name: `${GOLOMT_LOAN_LOGIN_NAME}`,
        password: encrypted
      })
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

  async _sendRequest(
    method: string,
    url: string,
    data: any,
    service: string,
    token?: string
  ) {
    let _token;
    if (!token) {
      const response = await this.login();
      _token = response.token;
    } else {
      _token = token;
    }
    const checksum = this._generateChecksum(data);
    const options: any = {
      method,
      url: `${GOLOMT_LOAN_API_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        "X-Golomt-Checksum": checksum,
        "X-Golomt-Service": service,
        Authorization: `Bearer ${_token}`
      }
    };
    if (method === "post") {
      options.data = JSON.stringify(data);
    }
    const request_log: any = {
      provider: "golomt_loan",
      api_method: options.method,
      api_url: options.url,
      headers: options.headers,
      body: data,
      query: options.query
    };
    console.log("loan_options: ", options);
    try {
      const resp = await axios(options);
      const response =
        method === "post" && typeof resp.data === "string"
          ? this.decryptAes(resp.data)
          : resp.data;
      request_log.status = resp.status;
      request_log.response = response;
      console.log("loan_response: ", response);
      return { request_log, response };
    } catch (err: any) {
      const error =
        method === "post" && typeof (err.response || {}).data === "string"
          ? this.decryptAes((err.response || {}).data)
          : (err.response || {}).data;
      request_log.status = err.status;
      request_log.response = error;
      console.log("loan_error", error);
      return { request_log, error };
    }
  }

  _generateChecksum(data: any) {
    const hash = crypto
      .createHash("sha256")
      .update(`${JSON.stringify(data)}`)
      .digest("hex");
    const encrypted = this.encryptAes(hash);
    return encrypted;
  }

  encryptAes(val: any) {
    const key = Buffer.from(aesKey, bufferEncryption);
    const iv = Buffer.from(aesIv, bufferEncryption);
    const cipher = crypto.createCipheriv(encryptionType, key, iv);
    let encrypted = cipher.update(val, bufferEncryption, encryptionEncoding);
    encrypted += cipher.final(encryptionEncoding);
    return encrypted;
  }

  decryptAes(base64String: string) {
    const buff = Buffer.from(base64String, encryptionEncoding);
    const key = Buffer.from(aesKey, bufferEncryption);
    const iv = Buffer.from(aesIv, bufferEncryption);
    const decipher: any = crypto.createDecipheriv(encryptionType, key, iv);
    const deciphered = decipher.update(buff) + decipher.final();
    return JSON.parse(deciphered);
  }

  async getDirectoryList({ type }: any) {
    const response: any = await this._sendRequest(
      "post",
      "/v1/utility/category/inq",
      { type: SERVICE_MAP[type] },
      "CATINQ"
    );
    return response;
  }

  async getStateList() {
    const response: any = await this._sendRequest(
      "post",
      "/v1/utility/state/inq",
      { stateCode: "ALL" },
      "STATEINQ"
    );
    return response;
  }

  async getCityList({ stateCode }: any) {
    const response: any = await this._sendRequest(
      "post",
      "/v1/utility/city/inq",
      { stateCode },
      "CITYINQ"
    );
    return response;
  }

  async sendLoanRequest({ request, query }: { request: any; query: any }) {
    const reqBody = {
      loanInfo: {
        amount: request.amount,
        prepaidAmt: !request.prepaid_amt ? null : request.prepaid_amt,
        period: request.period,
        prodType: "LOAN",
        prodCode: "LA294",
        branchId: 110,
        loanCrn: request.loan_crn,
        installmentType: "M"
      },
      customer: {
        firstName: request.first_name,
        lastName: request.last_name,
        registerNo: request.register_no
      },
      demographic: {
        appointment: request.appointment,
        sector: request.sector,
        subSector: request.sub_sector,
        degree: request.degree,
        maritalStatus: request.marital_status,
        startDate: moment(request.start_date).format("yyyy-MM-DD"),
        yearsWork: request.years_work
      },
      agreements: {
        zmsFlg: request.agreements ? "Y" : "N",
        danFlg: request.agreements ? "Y" : "N"
      },
      thirdPartyInfo: {
        corpId: "12sd",
        corpAccountId: "3615113644",
        corpAccountName: "Цэндбаяр"
      },
      contact: [
        {
          type: "EMAIL",
          subType: "HOMEEML",
          email: request.email
        },
        {
          type: "PHONE",
          subType: "CELLPH",
          phone: request.phone,
          countryCode: "976"
        }
      ],
      address: [
        {
          country: "MN",
          type: "HOME",
          state: request.state,
          city: request.city,
          subDistrict: request.sub_district,
          streetName: request.street,
          town: request.town,
          doorNo: request.door_no,
          addressLine1: `${request.sub_district}, ${request.street}, ${request.town}, ${request.door_no}`
        }
      ],
      callbackUrl: `https://api-dev.zochil.cloud/v2/order/payment-invoices/wh/loan/golomt/${request.id}`
    };
    const response: any = await this._sendRequest(
      "post",
      `/v1/loan/request?client_id=${query.client_id || ""}&state=${
        query.state || ""
      }&scope=${query.scope || ""}`,
      reqBody,
      "LNRQTADD"
    );
    return response;
  }

  async sendLoanConfirm({ request, query }: { request: any; query: any }) {
    const reqBody = {
      approvedAmt:
        request.callback_response && request.callback_response.amount
          ? request.callback_response.amount
          : 0,
      requestId: request.golomt_id,
      registerNo: request.register_no,
      newAcctFlg: request.newAcctFlg ? "Y" : "N",
      creditAccount: "3615113644",
      creditAccountName: "Цэндбаяр",
      payday: [20]
    };
    const response: any = await this._sendRequest(
      "post",
      `/v1/loan/confirm?client_id=${query.client_id || ""}&state=${
        query.state || ""
      }&scope=${query.scope || ""}`,
      reqBody,
      "LNSTTCNF"
    );
    return response;
  }

  async checkLoanRequest({ registerNo, requestId }: any) {
    const response: any = await this._sendRequest(
      "post",
      "/v1/loan/status",
      {
        registerNo,
        requestId
      },
      "LNSTTINQ"
    );

    return response;
  }

  async checkLoanRequestList({ registerNo, start, end }: any) {
    const response: any = await this._sendRequest(
      "post",
      "/v1/loan/list",
      {
        registerNo,
        startDate: start,
        endDate: end
      },
      "OLNINQ"
    );

    return response;
  }

  async getPhone({ client_id, state, scope }: any) {
    const response: any = await this._sendRequest(
      "get",
      `/v1/auth/authorize/getphone?client_id=${client_id}&state=${state}&scope=${scope}`,
      {},
      "PHINQ"
    );

    return response;
  }

  async otpSend({ client_id, state, scope }: any) {
    const response: any = await this._sendRequest(
      "get",
      `/v1/auth/authorize/otpsend?client_id=${client_id}&state=${state}&scope=${scope}`,
      {},
      "OTPCD"
    );

    return response;
  }

  async otpValidate({
    otp,
    client_id,
    scope,
    state
  }: {
    otp: string;
    client_id: string;
    scope: string;
    state: string;
  }) {
    const response: any = await this._sendRequest(
      "post",
      "/v1/auth/authorize/otp",
      {
        otp,
        clientId: client_id,
        redirectUri: `${ZOCHIL_LOAN_REDIRECT_URI}`,
        scope,
        state
      },
      "OTPVAL"
    );

    return response;
  }

  async customerInquire(query: any) {
    const response: any = await this._sendRequest(
      "post",
      `/customer/inquire?client_id=${query.client_id || ""}&state=${
        query.state || ""
      }&scope=${query.scope || ""}`,
      { registerNo: query.registerNo },
      "RETCUSTINQ"
    );
    return response;
  }
}
