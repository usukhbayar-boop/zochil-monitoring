import logger from "lib/utils/logger";
import * as firebase from "firebase-admin";

const serviceAccount = require("resources/firebase_key.json");

const app = firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://zochilshop.firebaseio.com"
});

export function sendMessage(token: string, payload: any, options: any) {
  firebase
    .messaging(app)
    .sendToDevice(token, payload, options)
    .then(() => true)
    .catch((error) => logger.error({
      module_name: `external-apis/firebase`,
      message: `Firebase SDK error, ${error.message}`,
    }));
}
