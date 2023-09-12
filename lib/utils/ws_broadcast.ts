import WebSocket from 'ws';
import logger from "lib/utils/logger";

export default async function ws_broadcast({ action_type, payload }: any) {
  if (!process.env.SOCKET_SERVER_URL) {
    throw new Error('SOCKET_SERVER_URL not configured in .env file.');
  }

  const ws = new WebSocket(process.env.SOCKET_SERVER_URL || "");

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      try {
        ws.send(JSON.stringify({
          payload,
          action_type,
        }));
        ws.close();
        resolve(true);
      } catch(error: any) {
        logger.error({
          message: error.stack  || error.message,
          module: "utils/ws_broadcast",
        });
        ws.close();
        reject('error on stringing data');
      }
    });

    ws.on('error', () => {
      reject('socket closed');
    });
  });
}
