import fs from 'fs';
import AWS from 'aws-sdk';
import logger from "lib/utils/logger";

const ses = new AWS.SES({ region: 'us-east-1' });

export async function sendMail({
  ToAddresses,
  subject,
  template,
  params = {},
  Source = 'support@zochil.shop',
}: any) {
  if (fs.existsSync(`${__dirname}/templates/${template}.html`)) {
    let html = fs.readFileSync(`${__dirname}/templates/${template}.html`).toString();

    for(const key in params) {
      html = html.replace(`{{${key}}}`, params[key]);
    }

    let options = {
      Source,
      Destination: {
        ToAddresses,
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: html,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        }
      },
    };

    await ses.sendEmail(options).promise();


  } else {
    logger.error({
      message: `Email template not found: templates/${template}.html`,
    });
  }
}
