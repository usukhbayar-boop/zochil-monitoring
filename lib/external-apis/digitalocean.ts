import axios from "axios";
import logger from "lib/utils/logger";

const {
  DIGITAL_OCEAN_URL,
  DIGITAL_OCEAN_TOKEN,
  STOREFRONT_IP_ADDRESS,
} = process.env;

export async function updateARecord(domain: string) {
  const { domain_records : a_records } = await _sendDORequest(
    "get",
    `/domains/${domain}/records?type=A&name=${domain}`
  );

  if (a_records && a_records.length) {
    await _sendDORequest(
      "put",
      `/domains/${domain}/records/${a_records[0].id}`,
      {
        data: STOREFRONT_IP_ADDRESS,
      }
    )
  }
}

async function _sendDORequest(method: string, url: string, data?: any) {
  const options: any = {
    method,
    url: `${DIGITAL_OCEAN_URL}${url}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIGITAL_OCEAN_TOKEN}`,
    },
  };

  if (method === "post" || method === "put") {
    options.data = JSON.stringify(data);
  }

  try {
    const resp = await axios(options);
    return resp?.data || {};
  } catch (err: any) {
    logger.error({
      message: `${err.message}, ${JSON.stringify((err.response || {}).data)}`,
    })
  }

  return {};
}
