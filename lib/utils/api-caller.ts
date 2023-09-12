import axios from "axios";

const { PROXY_URL } = process.env;

export async  function call_external_api({
  url,
  params,
  method,
  headers,
  data,
  auth,
}: {
  url: string;
  method: string;
  params?: any;
  headers?: any;
  data?: any;
  auth?: any;
}) {
  return await axios({
    method: "post",
    url: `${PROXY_URL}/v1/external-api/make-call`,
    data: {
      url,
      params,
      method,
      headers,
      data,
      auth,
    },
  } as any);
};
