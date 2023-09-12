import axios from "axios";
import _ from "lodash";
import { OAuth2Client } from "google-auth-library";

const { GOOGLE_API_URL } = process.env;

function _buildQueryString(params: { [key: string]: string }) {
  const options: { [key: string]: any } = { ...params };

  return Object.keys(options)
    .map((key) => `${key}=${encodeURIComponent(options[key])}`)
    .join("&");
}

async function _sendRequest(
  method: string,
  url: string,
  body: any,
  options = {}
) {
  const qs = _buildQueryString(options);
  try {
    const { data } = await axios({
      method,
      url: `${GOOGLE_API_URL}${url}?${qs}`,
      data: method === "post" ? body : undefined
    } as any);

    return data;
  } catch (error: any) {
    throw new Error(`${error.message},${JSON.stringify(error.response.data)}`);
  }
}

export async function fetchUserInformation(access_token: string) {
  return await _sendRequest("get", "/oauth2/v2/userinfo", undefined, {
    access_token
  });
}

export async function verifyToken(token: string) {
  const client = new OAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken: token
  });
  return ticket.getPayload();
}
