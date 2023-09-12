import axios from "axios";
import CustomError from "lib/errors/custom_error";

const { TU_DELIVERY_API_URL, TU_DELIVERY_API_TOKEN } = process.env;

export default class TuDeliveryService {
  async createDeliveryOrder({
    payload
  }: {
    payload: any;
    merchant_id?: string;
  }) {

    const response = await this._sendRequest({
      url: "/v1/order",
      method: "post",
      payload: {
        orderId: payload.orderId,
        orderNum: payload.delivery_name,
        customerName: payload.recipient_name,
        customerPhone: payload.recipient_phone,
        customerDistrict: payload.recipient_district,
        customerKhoroo: payload.recipient_unit,
        customerAddress: payload.recipient_address,
        productId: payload.productId,
        productQty: payload.package_quantity,
        productAmount: payload.package_price,
        senderId: payload.senderId,
        // orderDesc: "Өглөө эрт авах",
        orderDDate: payload.start_at,
        senderName: payload.sender_name,
        senderPhone: payload.sender_phone,
        senderAddress: payload.sender_address,
        senderCoordinates: `${payload.sender_lat},${payload.sender_lng}`,
        fragile: !!payload.fragile === true ? 1 : 0,
        canMelt: !!payload.can_melt === true ? 1 : 0,
        canFreeze: !!payload.can_freeze === true ? 1 : 0,
        doNotShake: !!payload.do_not_shake === true ? 1 : 0
      }
    });
    if (!(response && response.status !== "error")) {
      throw new Error((response || { error: "" }).error);
    }
    return {
      response: JSON.stringify(response)
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
      url: `${TU_DELIVERY_API_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        "access-token": `${TU_DELIVERY_API_TOKEN}`
      }
    };

    if (method === "post") {
      options.data = JSON.stringify(payload);
    }

    try {
      const response = await axios(options);
      return response.data;
    } catch (err: any) {
      console.log("tu-delivery post send error:", (err.response || {}).data);
      throw new CustomError(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
        ((err.response || {}).data || {}).message || ""
      );
    }
  }

  async getProductSizeCode(){
    const response = await this._getProductSizeCode({
      method: "GET",
      url: "/v1/product",
    });
    if(!(response && response.status !== "error")){
      throw new Error((response || { error: ""}).error);
    }

    return {
      response: response
    };
  }

  async _getProductSizeCode({
    url,
    method,
  }: {
    url: string;
    method: string;
  }) {
    const options: any = {
      method,
      url: `${TU_DELIVERY_API_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        "access-token": `${TU_DELIVERY_API_TOKEN}`
      }
    };
    try {
      const response = await axios(options);

      return response.data;
    } catch (err: any) {
      console.log((err.response || {}).data);

      throw new CustomError(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
        ((err.response || {}).data || {}).message || ""
      );
    }
  }
}
