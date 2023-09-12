import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";

import APIService from "core/base/service";
import MerchantService from "core/merchants/service";

import { User, DBConnection, ID, ApiOptions } from "core/types";
import pickBy from "lodash/pickBy";

export default class ApiKeyService extends APIService {
  _merchantService: MerchantService;
  constructor(db: DBConnection) {
    super(db, "api_keys");
    this._merchantService = new MerchantService(db, "shops");
  }
  async list(user: User, merchant_id: ID, options: ApiOptions) {
    await this._merchantService.checkOwnership(user.id, merchant_id);

    const { list: data, totalCount: total } = await super.findForList(
      {
        merchant_id
      },
      {
        page: options.page,
        limit: options.limit,
        fields: [
          "id",
          "merchant_id",
          "name",
          "status",
          "expire_at",
          "scopes",
          "token_type"
        ]
      }
    );
    return { data, total };
  }

  async generate({
    user,
    merchant_id,
    name,
    status,
    expire_at,
    scopes,
    token_type
  }: {
    user: User;
    merchant_id: ID;
    name: string;
    status: string;
    expire_at: Date;
    scopes: any;
    token_type: string;
  }) {
    await this._merchantService.checkOwnership(user.id, merchant_id);
    const access_token = uuid();
    const jwt_token = jwt.sign(
      { merchant_id: merchant_id },
      process.env.API_KEY_SECRET || ""
    );

    const params = pickBy(
      {
        merchant_id,
        name,
        status,
        expire_at,
        scopes: JSON.stringify(scopes),
        jwt_token,
        access_token,
        token_type
      },
      (v) => v
    );

    await super.insert(params);

    return { access_token, name, status, expire_at, scopes, token_type };
  }

  async remove(user: User, merchant_id: ID, id: ID) {
    await this._merchantService.checkOwnership(user.id, merchant_id);
    const apiKey = await super.findOneByConditions({ merchant_id, id });
    if (apiKey) {
      await super.removeById(id);
    }
  }
}
