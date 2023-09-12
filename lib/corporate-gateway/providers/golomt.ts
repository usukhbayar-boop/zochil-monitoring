import xml from "xml2js";
import uuid from "short-uuid";
import axios from "axios";
import moment from "moment";
import numeral from "numeral";

export default class GolomtGatewayProvider {
  private _xmlParser: xml.Parser;
  constructor() {
    this._xmlParser = new xml.Parser();
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
    const body = this._buildBody({
      bank,
      refno,
      amount,
      statement,
      account_holder,
      account_number
    });

    const payload = `<?xml version="1.0" encoding="UTF-8"?>
      <Document>
        ${this._buildHeader({ amount, bank })}
        ${body}
      </Document>
    `;

    const response: any = await this._sendXMLRequest(payload);
    if (response.status.toLowerCase() === "success") {
      return response.txId;
    } else {
      throw Error(response.error || "");
    }
  }

  async _sendXMLRequest(payload: string) {
    let xmlResponse = "";

    try {
      const { data } = await axios({
        data: payload,
        method: "post",
        url: process.env.GOLOMT_CG_URL,
        responseType: "text",
        headers: { "Content-Type": "text/xml" }
      });

      xmlResponse = data || "";
    } catch (err: any) {
      xmlResponse = (err.response || {}).data || "";

      if (!xmlResponse) {
        xmlResponse = err.message;
      }
    }

    if (xmlResponse.indexOf("<?xml") === -1) {
      return { status: "failed", error: xmlResponse };
    }
    return await this._parseResponse(xmlResponse);
  }

  async _parseResponse(response: string) {
    try {
      let txId = "",
        error = "";
      const parsed = await this._xmlParser.parseStringPromise(response);
      const status =
        parsed.Document.Header[0].ResponseHeader[0].Status[0] || "";

      if (status.toLowerCase() === "success") {
        txId =
          parsed.Document.Body[0].TrnAddRs[0].TrnIdentifier[0].TrnId[0] || "";
      } else {
        error =
          parsed.Document.Body[0].Error[0].ErrorDetail[0].ErrorCode[0] +
          " - " +
          parsed.Document.Body[0].Error[0].ErrorDetail[0].ErrorDesc[0];
      }

      return { status, error };
    } catch (err: any) {
      return { status: "failed", error: `XML Parse error: ${err.message}` };
    }
  }

  _buildBody({
    bank,
    amount,
    statement,
    account_number,
    account_holder
  }: {
    bank: string,
    refno?: string,
    amount: number,
    statement: string,
    account_number: string,
    account_holder: string
  }) {
    return `<PmtInf>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${Math.floor(amount)}</CtrlSum>
      <ForT>F</ForT>
      <Dbtr>
         <Nm>${process.env.GOLOMT_CG_ACCOUNT_HOLDER}</Nm>
      </Dbtr>
      <DbtrAcct>
         <Id>
            <IBAN>${process.env.GOLOMT_CG_ACCOUNT_NUMBER}</IBAN>
         </Id>
         <Ccy>MNT</Ccy>
      </DbtrAcct>
      <CdtTrfTxInf>
         <CdtrId>${Math.floor(Math.random() * 900000)}</CdtrId>
         <Amt>
            <InstdAmt>${Math.floor(amount)}</InstdAmt>
            <InstdCcy>MNT</InstdCcy>
         </Amt>
         <Cdtr><Nm>${account_holder}</Nm></Cdtr>
         <CdtrAcct>
            <Id>
               <IBAN>${account_number}</IBAN>
            </Id>
            <Ccy>MNT</Ccy>
         </CdtrAcct>
         <CdtrAgt>
            <FinInstnId>
               <BICFI>${this._getBankCodes(bank)}</BICFI>
            </FinInstnId>
         </CdtrAgt>
         <RmtInf>
            <AddtlRmtInf>${statement}</AddtlRmtInf>
         </RmtInf>
      </CdtTrfTxInf>
     </PmtInf>`;
  }

  _buildHeader({ amount, bank }: { amount: number, bank: string }) {
    const now = new Date();
    const traceno = uuid.generate();
    return `<GrpHdr>
        <MsgId>${traceno}</MsgId>
        <CreDtTm>${moment().format("YYYY-MM-DDTHH:mm:ss")}</CreDtTm>
        <TxsCd>${bank === "golomt" ? "1001" : "1002"}</TxsCd>
        <NbOfTxs>1</NbOfTxs>
        <CtrlSum>${Math.floor(amount)}</CtrlSum>
        <InitgPty>
           <Id>
              <OrgId>
                 <AnyBIC>${process.env.GOLOMT_CG_ANYBIC}</AnyBIC>
              </OrgId>
           </Id>
        </InitgPty>
        <Crdtl>
           <Lang>0</Lang>
           <LoginID>${process.env.GOLOMT_CG_LOGINID}</LoginID>
           <RoleID>1</RoleID>
           <Pwds>
              <PwdType>3</PwdType>
              <Pwd />
           </Pwds>
        </Crdtl>
     </GrpHdr>`;
  }

  _getBankCodes(bank: string) {
    const codes: { [key:string]: string } = {
      golomt: "GMT",
      khan: "050000|AGMOMNUB",
      capital: "020000|INOVMNUB",
      tdb: "040000|TDBMMNUB",
      arig: "210000|ARGBMNUB",
      nibank: "290000|NAIMMNUB",
      capitron: "300000|CPITMNUB",
      xac: "320000|CAXBMNUB",
      chinggis: "330000|CHKHMNUB",
      state_fund: "900000|MOFUMNUB",
      statebank: "340000|STBMMNUB",
      bogd: "380000|BOGDMNUB",
      transbank: "190000|TRDMMNUB"
    };

    return codes[bank] || "GMT";
  }
}
