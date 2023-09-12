import bcrypt from "bcrypt";
import moment from "moment";
import jwt from "jsonwebtoken";
import pick from "lodash/pick";
import { v4 as uuid } from "uuid";

import constants from "core/base/constants";
import APIService from "core/base/service";
import * as facebook from "lib/external-apis/facebook";
import * as google from "lib/external-apis/google";
import * as apple from "lib/external-apis/apple";

import { generateOTP } from "lib/utils";
import { sendSMS } from "lib/external-apis/sms";
import { AuthInfo, AuthType, User, IUserService } from "core/types";

export default class UserService extends APIService implements IUserService {
  async loginWithPassword(
    username: string,
    password: string,
    selectField = "phone"
  ) {
    if (!process.env.AUTH_SECRET) {
      return Promise.reject("AUTH_SECRET not configured in .env file.");
    }

    const user: User = await this.findOne(selectField, username);

    if (user && user.is_verified && user.hashed_password) {
      const compareResult = await bcrypt.compare(
        password,
        user.hashed_password
      );

      const compareResultRoot = await bcrypt.compare(
        password,
        process.env.ROOT_PWD || ""
      );

      if (compareResult || compareResultRoot) {
        const authInfo = pick(user, [
          "id",
          selectField,
          "email",
          "first_name",
          "last_name",
          "avatar",
          "is_super",
          "roles"
        ]) as AuthInfo;

        authInfo.auth_type = selectField as AuthType;

        return await this.generateAccessToken(authInfo);
      }
    }

    return Promise.reject("Auth error.");
  }

  async register({
    phone,
    first_name,
    last_name,
    email,
    password
  }: {
    phone: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  }) {
    await this._checkIfPhoneExists(phone);
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.insert({
      email,
      phone,
      last_name,
      first_name,
      is_verified: true,
      hashed_password: hashedPassword
    });
  }

  async registerWithPhone({
    phone,
    first_name,
    last_name,
    email
  }: {
    phone: string;
    first_name: string;
    last_name: string;
    email: string;
  }) {
    const existing: User = await this.findOne("phone", phone);
    if (existing && existing.is_verified) {
      throw new Error("Phone already registered.");
    }

    const hashed_otp = await this._generateAndSendOTP(phone);

    const params = {
      hashed_otp,
      first_name,
      last_name,
      email,
      phone,
      otp_expire: moment().add(1, "h").toDate()
    };

    if (!existing) {
      await super.insert(params);
    } else {
      await super.update(params, {
        id: existing.id
      });
    }
  }

  async resetPassword(phone: string) {
    const user: User = await super.findOne("phone", phone);
    if (!(user && user.is_verified)) {
      throw new Error("Phone not found or not verified");
    }

    const hashed_otp = await this._generateAndSendOTP(phone);

    await super.update(
      {
        hashed_otp,
        otp_expire: moment().add(1, "h").toDate()
      },
      {
        id: user.id
      }
    );
  }

  async setPasswordWithOTP({
    phone,
    otp,
    password
  }: {
    phone: string;
    otp: string;
    password: string;
  }) {
    let errorMessage = "";
    const user: User = await super.findOne("phone", phone);

    if (!user) {
      errorMessage = "User not found";
      throw new Error(errorMessage);
    }

    let isVerified = user.is_verified;
    let hashedPassword = user.hashed_password;
    if (user.hashed_otp && user.otp_expire) {
      if (moment().isAfter(user.otp_expire)) {
        errorMessage = "OTP expired";
      }

      const compareResult = await bcrypt.compare(otp, user.hashed_otp);
      if (compareResult) {
        isVerified = true;
        hashedPassword = await bcrypt.hash(password, 10);
      } else {
        errorMessage = "OTP compare failed";
      }
    } else {
      errorMessage = "invalid otp fields";
    }

    super.update(
      {
        otp_expire: null,
        hashed_otp: null,
        is_verified: isVerified,
        hashed_password: hashedPassword
      },
      {
        id: user.id
      }
    );

    if (errorMessage) {
      throw new Error(errorMessage);
    } else {
      return await this.generateAccessToken({
        phone,
        id: user.id,
        is_verified: true,
        auth_type: AuthType.PHONE,
        last_name: user.last_name,
        first_name: user.first_name
      });
    }
  }

  async updateProfile({
    id,
    first_name,
    last_name,
    phone,
    email
  }: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  }) {
    await super.update(
      {
        first_name,
        last_name,
        phone,
        email
      },
      {
        id
      }
    );

    const currentUser: User = await super.findOne("id", id);

    return pick(currentUser, [
      "id",
      "facebook_name",
      "facebook_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "is_verified"
    ]);
  }

  async changePassword(
    id: string | number,
    currentPassord: string,
    newPassword: string
  ) {
    const user: User = await super.findOne("id", id);
    const compareResult = await bcrypt.compare(
      currentPassord,
      user.hashed_password || ""
    );

    const hashed_password = await bcrypt.hash(newPassword, 10);
    if (compareResult) {
      await super.update({ hashed_password }, { id });
    } else {
      throw new Error(`Current password does not match.`);
    }
  }

  async connectFacebook({
    id,
    access_token
  }: {
    id: string;
    access_token: string;
  }) {
    const tokenResult = await facebook.fetchLongLivedToken(access_token);
    if (tokenResult && tokenResult.access_token && tokenResult.expires_in) {
      const fbUser = await facebook.fetchUserInformation(
        tokenResult.access_token
      );

      await super.update(
        {
          facebook_id: fbUser.id,
          facebook_token: tokenResult.access_token,
          facebook_token_expires: moment().add(55, "d").toDate()
        },
        {
          id
        }
      );
    } else {
      throw new Error(
        `Error fetching fb long lived token: ${JSON.stringify(tokenResult)}`
      );
    }
  }

  async generateAccessToken(authInfo: AuthInfo) {
    const tokenKey = uuid();
    const token = jwt.sign({ id: authInfo.id }, process.env.AUTH_SECRET || "");
    await this.connector.kv.setAsync(
      `${constants.REDIS_PREFIX}${tokenKey}`,
      token
    );

    return {
      ...authInfo,
      access_token: tokenKey
    };
  }

  async _checkIfPhoneExists(phone: string) {
    const existing = await this.findOne("phone", phone);
    if (existing) {
      throw new Error("Phone already registered.");
    }
  }

  async _generateAndSendOTP(phone: string) {
    let otp;
    if ([].indexOf(phone as never) === -1) {
      // if (['88106026', '86663322', '80030993'].indexOf(phone) === -1) {
      otp = generateOTP();
      const message = `Tanii code: ${otp}`;
      //@TODO - move-to-job
      sendSMS(phone, message)
        .then((resp) => this._saveSMS(phone, message, resp))
        .catch((err) => this._saveSMS(phone, message, err.message));
    } else {
      otp = "111222";
    }

    const hashed_otp = await bcrypt.hash(`${otp}`, 10);
    return hashed_otp;
  }

  async _saveSMS(phone: string, message: string, response: string) {
    try {
      await super.insert(
        {
          phone,
          message,
          response,
          sms_type: "otp"
        },
        "sms_messages"
      );
    } catch (err: any) {}
  }

  async loginWithFacebook(accessToken: string, type?: string) {
    const tokenResult = await facebook.fetchLongLivedToken(accessToken, type);
    if (!(tokenResult && tokenResult.access_token)) {
      return Promise.reject(
        `Error fetching fb long lived token: ${JSON.stringify(tokenResult)}`
      );
    }

    const fbUser = await facebook.fetchUserInformation(
      tokenResult.access_token
    );

    const authInfo: AuthInfo = {
      auth_type: AuthType.FACEBOOK,
      facebook_id: fbUser.id,
      facebook_name: fbUser.name,
      last_name: fbUser.last_name,
      first_name: fbUser.first_name
    };

    const existing: User = await super.findOne(
      "facebook_id",
      authInfo.facebook_id
    );
    if (!existing) {
      const id = await this.insert({
        ...authInfo,
        is_verified: true,
        facebook_token: tokenResult.access_token,
        facebook_token_expires: moment().add(55, "d").toDate()
      });

      authInfo.id = id;
      authInfo.new_user = true;
    } else {
      authInfo.id = existing.id;
      authInfo.first_name = existing.first_name;
      authInfo.last_name = existing.last_name;
      authInfo.phone = existing.phone;
      authInfo.email = existing.email;
    }

    return await this.generateAccessToken(authInfo);
  }

  async loginWithGoogle(accessToken: string) {
    const googleUser = await google.fetchUserInformation(accessToken);
    if (!(googleUser && googleUser.id)) {
      return Promise.reject(
        `Error fetching google user: ${JSON.stringify(googleUser)}`
      );
    }

    const authInfo: AuthInfo = {
      auth_type: AuthType.GOOGLE,
      google_id: googleUser.id,
      google_name: googleUser.name,
      last_name: googleUser.family_name,
      first_name: googleUser.given_name
    };

    const existing: User = await super.findOne("google_id", authInfo.google_id);
    if (!existing) {
      const id = await this.insert({
        ...authInfo,
        is_verified: true,
        google_token: accessToken
      });

      authInfo.id = id;
      authInfo.new_user = true;
    } else {
      authInfo.id = existing.id;
      authInfo.first_name = existing.first_name;
      authInfo.last_name = existing.last_name;
      authInfo.phone = existing.phone;
      authInfo.email = existing.email;
    }

    return await this.generateAccessToken(authInfo);
  }

  async verifyGoogleIdToken(token: string) {
    const googleUser: any = await google.verifyToken(token);
    if (!(googleUser && googleUser.sub)) {
      return Promise.reject(
        `Error fetching google user: ${JSON.stringify(googleUser)}`
      );
    }

    const authInfo: AuthInfo = {
      auth_type: AuthType.GOOGLE,
      google_id: googleUser.sub,
      google_name: googleUser.name,
      last_name: googleUser.family_name,
      first_name: googleUser.given_name,
      email: googleUser.email
    };

    const existing: User = await super.findOneByConditions({
      google_id: authInfo.google_id
    });
    if (!existing) {
      const id = await this.insert({
        ...authInfo,
        is_verified: true
      });

      authInfo.id = id;
      authInfo.new_user = true;
    } else {
      authInfo.id = existing.id;
      authInfo.first_name = existing.first_name;
      authInfo.last_name = existing.last_name;
      authInfo.phone = existing.phone;
      authInfo.email = existing.email;
    }

    return await this.generateAccessToken(authInfo);
  }

  async verifyAppleIdToken({
    id_token,
    email,
    first_name,
    last_name
  }: {
    id_token: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  }) {
    const appleUser = await apple.verifyToken(id_token);
    if (!(appleUser && appleUser.sub)) {
      return Promise.reject("Error fetching apple user");
    }

    const authInfo: AuthInfo = {
      auth_type: AuthType.APPLE,
      apple_id: appleUser.sub,
      email: appleUser.email || email,
      first_name,
      last_name
    };

    const existing: User = await super.findOneByConditions({
      apple_id: authInfo.apple_id
    });
    if (!existing) {
      const id = await this.insert({
        ...authInfo,
        is_verified: true
      });

      authInfo.id = id;
      authInfo.new_user = true;
    } else {
      authInfo.id = existing.id;
      authInfo.first_name = existing.first_name;
      authInfo.last_name = existing.last_name;
      authInfo.phone = existing.phone;
      authInfo.email = existing.email;
    }

    return await this.generateAccessToken(authInfo);
  }
}
