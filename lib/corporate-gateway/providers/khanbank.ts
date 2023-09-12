import axios from "axios";

const {
  KHANBANK_CG_URL,
  KHANBANK_CG_USERNAME,
  KHANBANK_CG_PASSWORD,
  KHANBANK_CG_ACCOUNT_NUMBER,
  KHANBANK_INTERNET_LOGIN_NAME,
  KHANBANK_CG_TRAN_PASSWORD
} = process.env;
export default class KhanbankGatewayProvider {
  async getToken() {
    const auth: any = await this._sendRequest(
      "post",
      "/auth/token?grant_type=client_credentials",
      Buffer.from(
        `${KHANBANK_CG_USERNAME}:${KHANBANK_CG_PASSWORD}`,
        "utf8"
      ).toString("base64"),
      {},
      true
    );

    if (auth.token) {
      return auth.token;
    } else {
      throw Error(auth.error || "");
    }
  }

  async transfer({
    bank,
    refno,
    amount,
    statement,
    account_number,
    account_holder
  }: {
    bank: string;
    refno: string;
    amount: number;
    statement: string;
    account_number: string;
    account_holder: string;
  }) {
    const access_token = await this.getToken();

    const payload: any = {
      transferid: refno,
      fromAccount: KHANBANK_CG_ACCOUNT_NUMBER,
      toAccount: account_number,
      toCurrency: "MNT",
      toAccountName: account_holder,
      toBank: this._getBankCodes(bank),
      amount,
      description: statement,
      currency: "MNT",
      loginName: KHANBANK_INTERNET_LOGIN_NAME,
      tranPassword: KHANBANK_CG_TRAN_PASSWORD
    };

    const response: any = await this._sendRequest(
      "post",
      bank === "khan" ? "/transfer/domestic" : "/transfer/interbank",
      access_token,
      payload
    );
    if (response.uuid && response.journalNo) {
      return response.journalNo;
    } else {
      throw Error(response.error || "");
    }
  }

  async _sendRequest(
    method: string,
    path: string,
    access_token: string,
    data: any,
    auth = false
  ) {
    const options: any = {
      method,
      url: `${KHANBANK_CG_URL}${path}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `${!!auth ? "Basic" : "Bearer"} ${access_token}`
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

  _getBankCodes(bank: string) {
    const codes: { [key: string]: string } = {
      khan: "KHN",
      golomt: "150000",
      capital: "020000",
      tdb: "040000",
      arig: "210000",
      nibank: "290000",
      capitron: "300000",
      xac: "320000",
      chinggis: "330000",
      state_fund: "900000",
      statebank: "340000",
      bogd: "380000",
      transbank: "190000"
    };

    return codes[bank] || "GMT";
  }
}
