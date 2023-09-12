import qs from "qs";
import axios from "axios";
import moment from "moment";

export async function sendSMS(phone: string, message: string) {
  const options: any = {
    url: process.env.MESSAGE_PRO_URL,
    method: "get"
  };

  const _params = {
    key: process.env.MESSAGE_PRO_API_KEY,
    from: process.env.MESSAGE_PRO_NUMBER,
    to: phone,
    text: message
  };

  try {
    options.url = `${options.url}/send?${qs.stringify(_params)}`;
    console.log(options.url);
    const { data } = await axios(options);
    return JSON.stringify(data);
  } catch (err: any) {
    return `${err.message}, ${JSON.stringify((err.response || {}).data)}`;
  }
}

export async function sendSMSCampaign(id: string, numbers: string[], message: string) {
  const now = moment().add(2, "seconds");
  const options: any = {
    method: "POST",
    url: `${process.env.MESSAGE_PRO_URL}/order-campaign`,
    headers: {
      "x-api-key": process.env.MESSAGE_PRO_API_KEY,
    },
    data: {
      numbers,
      text: message,
      name: `sms-campign-${id}`,
      begin_hour: now.format("HH"),
      begin_date: now.format("YYYY-MM-DD"),
      begin_minute: now.format("mm"),
      from: process.env.MESSAGE_PRO_NUMBER,
    }
  };

  try {
    const { data } = await axios(options);
    console.log(data);
  } catch (err: any) {
    return `${err.message}, ${JSON.stringify((err.response || {}).data)}`;
  }
}


// deprecated

const SKYTEL_PREFIXES = ["90", "91", "96"];
const UNITEL_PREFIXES = ["80", "86", "88", "89"];
const GMOBILE_PREFIXES = ["93", "97", "98", "83"];
const MOBICOM_PREFIXES = ["84", "85", "94", "95", "99", "89"];

export async function sendSMSDeprecated(phone: string, message: string) {
  const options: any = {
    url: "",
    method: "get"
  };

  let _params = {};
  const prefix = phone.substr(0, 2);

  if (MOBICOM_PREFIXES.indexOf(prefix) > -1) {
    options.url = process.env.MOBICOM_SMS_URL || "";
    _params = {
      to: phone,
      msg: message,
      from: process.env.SMS_NUMBER,
      username: process.env.MOBICOM_SMS_USERNAME,
      servicename: process.env.MOBICOM_SMS_SERVICE
    };
  }

  if (SKYTEL_PREFIXES.indexOf(prefix) > -1) {
    options.url = process.env.SKYTEL_SMS_URL || "";
    _params = {
      id: 1000112,
      dest: phone,
      text: message,
      src: process.env.SMS_NUMBER
    };
  }

  if (UNITEL_PREFIXES.indexOf(prefix) > -1) {
    options.url = process.env.UNITEL_SMS_URL || "";
    _params = {
      uname: process.env.UNITEL_SMS_USERNAME,
      upass: process.env.UNITEL_SMS_PASSWORD,
      sms: message,
      from: process.env.SMS_NUMBER,
      mobile: phone
    };
  }

  if (GMOBILE_PREFIXES.indexOf(prefix) > -1) {
    options.url = process.env.GMOBILE_SMS_URL || "";
    _params = {
      to: phone,
      text: message,
      from: process.env.SMS_NUMBER,
      username: process.env.GMOBILE_SMS_USERNAME,
      password: process.env.GMOBILE_SMS_PASSWORD
    };
  }

  if (options.url) {
    try {
      options.url = `${options.url}?${qs.stringify(_params)}`;
      console.log(options.url);
      const { data } = await axios(options);
      return JSON.stringify(data);
    } catch (err: any) {
      return `${err.message}, ${JSON.stringify((err.response || {}).data)}`;
    }
  } else {
    return `INVALID PARAMS: ${JSON.stringify(options)}`;
  }
}
