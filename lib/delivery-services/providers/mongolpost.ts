import axios from "axios"
import CustomError from "lib/errors/custom_error";

const { MONGOLPOST_API_URL, MONGOLPOST_DELIVERY_USER, MONGOLPOST_DELIVERY_TOKEN, MONGOLPOST_API_ZIPCODE_URL} = process.env;

const DISTRICT_MAP: any = {
  bayangol: 3,
  bayanzurkh: 4,
  sukhbaatar: 7,
  chingeltei: 9,
  khanuul: 8,
  songino_khairkhan: 6
};



export default class MongolShuudanDeliveryService {
  async createDeliveryOrder({
    payload
  }: {
    payload: any;
    merchant_id?: string;
  }) {
    // @TODO implement
    const response = await this._sendRequest({
      method: "post",
      url: "/api/v1/order",
      payload: {
        receiverFname: payload.recipient_name,
        receiverPhone1: payload.recipient_phone,
        receiverZipcode: payload.receiverZipcode,
        senderZipCode: payload.senderZipCode,
        senderFname: payload.sender_name,
        senderPhone1: payload.sender_phone,
        senderW3w: "",
        senderZipcode: payload.senderZipCode,
        items: payload.items
      }
    });


    if (!(response && response.status !== "error")) {
      throw new Error((response || { error: "" }).error);
    }

    if (!(response.result && response.result.order.no)) {
      throw new Error(
        `Tracking number not found. response: ${JSON.stringify(response)}`
      );
    }

    return {
      refno: `${response.result.order.no}`,
      response: JSON.stringify(response),
      tracking_number: response.result.order.no
    };
  }


  async _sendRequest({
    url,
    method,
    payload
  }: {
    url: string;
    method: string;
    payload: any;
  }) {
    const options: any = {
      method,
      url: `${MONGOLPOST_API_URL}${url}`,
      headers: {
        "Content-Type" : "application/json",
        "MyDelivery-User" : MONGOLPOST_DELIVERY_USER,
        "MyDelivery-Token" : MONGOLPOST_DELIVERY_TOKEN,
      }
    };

    if (method === "post") {
      options.data = JSON.stringify(payload);
    }
    try {
      const resp = await axios(options);

      return resp.data;
    } catch (err: any) {
      console.log("mongol post send error");

      console.log((err.response || {}).data);
      throw new CustomError(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
        ((err.response || {}).data || {}).message || ""
      );
    }
  }


  async getZipCode({
    payload
  }: {
    payload: any;
  }) {
    const response = await this._getZipCode({
      method: "GET",
      url: "/get_zip_code",
      payload: {
        zip_code : payload.zip_code
      }
    });


    if (!(response && response.status !== "error")) {
      throw new Error((response || { error: "" }).error);
    }

    return {
      response: response
    };
  }


  async _getZipCode({
    url, 
    method,
    payload
  } : {
    url : string,
    method : string,
    payload : any
  }) {
    const options : any = {
      method,
      url: `${MONGOLPOST_API_ZIPCODE_URL}?zipcode=${payload.zip_code}`,
      headers : {
        "Content-Type" : "application/json",
      }
    }
    try {
      const resp = await axios(options);

      return resp.data.result;
    } catch (err: any) {

      console.log((err.response || {}).data);
      throw new CustomError(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
        ((err.response || {}).data || {}).message || ""
      );
    }

  }
}
