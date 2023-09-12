import mailgun from "mailgun-js";

const mailer = mailgun({
  apiKey: process.env.MAILGUN_API_KEY || "",
  domain: process.env.MAILGUN_API_DOMAIN || ""
});

export async function sendMail({
  to,
  subject,
  template,
  params = {},
  sender = `no-reply@${process.env.MAILGUN_API_DOMAIN}`
}: any) {
  const data = {
    ...params,
    to,
    subject,
    template,
    from: sender
  };
  return new Promise((resolve, reject) =>
    mailer
      .messages()
      .send(data, (error, response) =>
        error ? reject(error) : resolve(response)
      )
  );
}
