import messagebird from 'messagebird';
import logger from "lib/utils/logger";

const client = messagebird(process.env.MESSAGE_BIRD_APIKEY || "");

export async function sendSMS(to: any, body: any): Promise<string> {
  const params = {
    body,
    recipients: [to],
    originator: 'Zochil',
  };


  return new Promise(done => {
    client.messages.create(params, function (err, response) {
      if (err) {
        logger.error(err);
        done(err.message)
      } else {
        logger.info(response);
        done(JSON.stringify(response))
      }
    })
  });
}
