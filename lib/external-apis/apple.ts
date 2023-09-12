import { verifyIdToken } from "apple-signin-auth";

const { APPLE_CLIENT_ID } = process.env;

export async function verifyToken(token: string) {
  try {
    const appleUser = await verifyIdToken(
      token, // We need to pass the token that we wish to decode.
      {
        audience: APPLE_CLIENT_ID, // client id - The same one we used  on the frontend, this is the secret key used for encoding and decoding the token.
        ignoreExpiration: true // Token will not expire unless you manually do so.
      }
    );
    return appleUser;
  } catch (err) {
    // Token is not verified
    console.error(err);
  }
}
