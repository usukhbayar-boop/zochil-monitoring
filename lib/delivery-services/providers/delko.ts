import axios from "axios";
import CustomError from "lib/errors/custom_error";

const { DELKO_API_URL, DELKO_API_TOKEN } = process.env;

const DISTRICT_MAP: any = {
  bayangol: 3,
  bayanzurkh: 4,
  sukhbaatar: 7,
  chingeltei: 9,
  khanuul: 8,
  songino_khairkhan: 6
};

export default class DelkoDeliveryService {
  async createDeliveryOrder({
    payload
  }: {
    payload: any;
    merchant_id?: string;
  }) {
    const response = await this._sendRequest({
      method: "post",
      url: "/critical/delivery/create-api",
      payload: {
        deliveryName: payload.delivery_name,
        category: payload.category,
        packagePrice: `${payload.package_price}₮`,
        packageQuantity: payload.package_quantity,
        packageSize: payload.package_size,
        senderName: payload.sender_name,
        senderPhone: payload.sender_phone,
        senderDistrict: DISTRICT_MAP[payload.sender_district],
        senderSubdistrict: payload.sender_unit,
        senderAddress: payload.sender_address,
        senderLatitude: payload.sender_lat,
        senderLongitude: payload.sender_lng,
        recipientName: payload.recipient_name,
        recipientPhone: payload.recipient_phone,
        recipientDistrict: DISTRICT_MAP[payload.recipient_district],
        recipientSubdistrict: payload.recipient_unit,
        recipientAddress: payload.recipient_address,
        recipientGateCode: payload.recipient_doorno,
        dateStart: payload.start_at,
        dateEnd: payload.end_at,
        fragile: !!payload.fragile,
        canMelt: !!payload.can_melt,
        canFreeze: !!payload.can_freeze,
        doNotShake: !!payload.do_not_shake,
        subMerchantId: payload.sub_merchant_id
      }
    });

    if (!(response && response.status !== "error")) {
      throw new Error((response || { error: "" }).error);
    }

    if (!(response.payload && response.payload.trackingNumber)) {
      throw new Error(
        `Tracking number not found. response: ${JSON.stringify(response)}`
      );
    }

    return {
      refno: `${response.payload._id}`,
      response: JSON.stringify(response),
      tracking_number: response.payload.trackingNumber
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
      url: `${DELKO_API_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DELKO_API_TOKEN}`
      }
    };

    if (method === "post") {
      options.data = JSON.stringify(payload);
    }

    try {
      const resp = await axios(options);
      return resp.data;
    } catch (err: any) {
      console.log((err.response || {}).data);
      throw new CustomError(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
        ((err.response || {}).data || {}).message || ""
      );
    }
  }
}
