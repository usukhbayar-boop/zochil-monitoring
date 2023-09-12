import Knex from "knex";
import { RedisClient } from "redis";
import { Request, Response } from "express";

export type ID = string | number;

export enum RecordStatus {
  ENABLED = "enabled",
  DISABLED = "disabled"
}

export type ApiFilter = {
  [key: string]: any;
};

export type ApiOptions = {
  page?: number;
  limit?: number;
  sortField?: string;
  fields?: Array<string>;
  exceed_limit?: boolean;
  joins?: Array<Array<string>>;
  sortDirection?: "asc" | "desc";

  orderFields?: Array<{
    column: string;
    order: "asc" | "desc";
  }>;
};

export interface ApiRequest extends Request {
  currentUser: User;
  merchant_id?: string | number | null;
}

export interface ApiResponse extends Response {}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<any>;

export type DBQuery = Knex;

export interface RedisClientAsync extends RedisClient {
  getAsync(key: string): any;
  setAsync(key: string, value: any): any;
}

export type DBConnection = {
  kv: RedisClientAsync;
  db: DBQuery;
  db_readonly: DBQuery;
};

export enum AuthType {
  PHONE = "phone",
  EMAIL = "email",
  APPLE = "apple",
  GOOGLE = "google",
  MINIAPP = "miniapp",
  FACEBOOK = "facebook"
}

export interface AuthInfo {
  id?: string | number;
  phone?: string;
  email?: string;
  last_name?: string;
  first_name?: string;
  auth_type?: AuthType;
  full_name?: string;
  facebook_id?: string;
  facebook_name?: string;
  new_user?: boolean;
  is_super?: boolean;
  is_verified?: boolean;
  roles?: string[];
  udid?: string;
  device_name?: string;
  is_registered?: boolean;
  google_id?: string;
  google_name?: string;
  ref_code?: string;
  apple_id?: string;
}

export interface User {
  auth_type: AuthType;
  id: string | number;
  first_name: string;
  last_name: string;
  is_verified: boolean;
  hashed_password?: string;
  hashed_otp?: string;
  full_name?: string;
  phone: string;
  email?: string;
  company_name?: string;
  facebook_name?: string;
  facebook_id?: string;
  invited_by?: string | number;
  otp_expire?: Date;
  chatbot_psid?: string;
  from_monpay?: boolean;
  is_super?: boolean;
  roles?: any[];
  monpay_account_id?: string;
  marketplace_uid?: string;
  admin_type?: string;
  ref_code?: string;
  invite_code?: string;
  monpay_branch_username?: string;
  created_at: Date;
  update_at: Date;
  merchant_id?: string | number;
}

export interface IUserService {
  loginWithPassword(
    username: string,
    password: string,
    selectField: string
  ): Promise<AuthInfo>;

  register({
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
  }): Promise<void>;

  registerWithPhone({
    phone,
    first_name,
    last_name,
    email
  }: {
    phone: string;
    first_name: string;
    last_name: string;
    email: string;
  }): Promise<void>;

  resetPassword(phone: string): Promise<void>;

  setPasswordWithOTP({
    phone,
    otp,
    password
  }: {
    phone: string;
    otp: string;
    password: string;
  }): Promise<AuthInfo>;

  updateProfile({
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
  }): Promise<any>;

  connectFacebook({
    id,
    access_token
  }: {
    id: string;
    access_token: string;
  }): Promise<void>;

  generateAccessToken(authInfo: AuthInfo): Promise<any>;
  loginWithFacebook(accessToken: string): Promise<AuthInfo>;
  changePassword(
    id: string | number,
    currentPassord: string,
    newPassword: string
  ): Promise<void>;
}
