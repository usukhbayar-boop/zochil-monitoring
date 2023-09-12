import CustomError from "lib/errors/custom_error";
import { sendMail } from "lib/mailers/mailgun";

const { BUUKIA_ELCH_MAIL, BUUKHIA_ELCH_TEMPLATE_NAME } = process.env;


const PACKAGE_SIZE_MAP: any  = {
  small: "жижиг",
  medium: "дунд",
  big: "том"

};

const DISTRICT_MAP: any = {
  bayangol: "Баянгол",
  bayanzurkh: "Баянзүрх",
  sukhbaatar: "Сүхбаатар",
  chingeltei: "Чингэлтэй",
  khanuul: "Хан-Уул",
  songino_khairkhan: "Сонгино хайрхан"
};

export default class BuukhiaElchDeliveryService {
  async createDeliveryOrder({ payload }: { payload: any }) {
    const response = await this._sendMailRequest({
      payloadParams: {
        "v:delivery_name": payload.delivery_name,
        "v:package_price": payload.package_price,
        "v:package_quantity": payload.package_quantity,
        "v:package_size": PACKAGE_SIZE_MAP[payload.package_size],
        "v:sender_name": payload.sender_name,
        "v:sender_phone": payload.sender_phone,
        "v:sender_address": payload.sender_address,
        "v:recipient_name": payload.recipient_name,
        "v:recipient_phone": payload.recipient_phone,
        "v:recipient_district": DISTRICT_MAP[payload.recipient_district],
        "v:recipient_khoroo": payload.recipient_unit,
        "v:recipient_address": payload.recipient_address,
        "v:start_date": payload.start_at,
        "v:end_date": payload.end_at,
        "v:fragile": !!payload.fragile === true ? "Тийм" : "Үгүй",
        "v:can_melt": !!payload.can_melt === true ? "Тийм" : "Үгүй",
        "v:can_freeze": !!payload.can_freeze === true ? "Тийм" : "Үгүй",
        "v:doNotShake": !!payload.do_not_shake === true ? "Тийм" : "Үгүй"
      },
      to_email: `${BUUKIA_ELCH_MAIL}`,
      subject: "zochil.shop -Бараа хүргүүлэх хүсэлт",
      template_name: `${BUUKHIA_ELCH_TEMPLATE_NAME}`
    });
    if (!(response)) {
      throw new Error(({ error: "Buukhia-Elch mail sent error" }).error);
    }

    return { response: JSON.stringify(response) };
  }

  async _sendMailRequest({
    payloadParams,
    to_email,
    subject,
    template_name
  }: {
    to_email: string;
    subject: string;
    template_name: string;
    payloadParams: any;
  }) {
    try {
      if (to_email) {
        return await sendMail({
          to: to_email,
          params: payloadParams,
          subject: subject,
          template: template_name
        });
      }
    } catch (err: any) {
      console.log("buukhia mail sent error", (err.response || {}).data);
      throw new CustomError(
        `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
        ((err.response || {}).data || {}).message || ""
      );
    }
  }
}
