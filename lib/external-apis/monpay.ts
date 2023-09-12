import axios from "axios"

const {
  MONPAY_API_URL,
  MONPAY_API_AUTH_USERNAME,
  MONPAY_API_AUTH_PASSWORD,
} = process.env;

export async function sendMonpayMerchantRequest({
  name,
  nameEn,
  redirectUri,
  iconPath,
  branchUsername,
}: {
  name: string,
  nameEn?: string,
  redirectUri: string,
  iconPath: string,
  branchUsername?: string,
}) {
  try {
    const response = await axios({
      method: 'post',
      url: `${MONPAY_API_URL}/api/ministore/submit`,
      data: JSON.stringify({
        name,
        nameEn,
        iconPath,
        redirectUri,
        branchUsername,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      auth: {
        username: MONPAY_API_AUTH_USERNAME,
        password: MONPAY_API_AUTH_PASSWORD,
      }
    } as any);
    console.log(JSON.stringify(response && response.data || {}));
    if (response && response.data && response.data.result) {
      return response.data.result;
    }
  } catch(err: any) {
    console.log(
      `${err.message}, ${JSON.stringify((err.response || {}).data)}`
    );
  }
}

export async function checkMonpayMerchantRequest(id: any) {
  try {
    const response = await axios({
      method: 'get',
      url: `${MONPAY_API_URL}/api/ministore/submit`,
      auth: {
        username: MONPAY_API_AUTH_USERNAME,
        password: MONPAY_API_AUTH_PASSWORD,
      }
    } as any);

    if (response && response.data && response.data.result) {
      return response.data.result;
    }
  } catch(err: any) {
    console.log(
      `${err.message}, ${JSON.stringify((err.response || {}).data)}`
    );
  }
}

