import pickBy from "lodash/pickBy";
import moment from "moment";

import APIService from "core/base/service";

import { DBConnection, ID } from "core/types";

export default class DeviceService extends APIService {
  constructor(db: DBConnection) {
    super(db, "devices");
  }

  async saveDevice({
    user_id,
    udid,
    token_key,
    jwt_token,
    device_name
  }: {
    user_id: ID;
    udid: string;
    token_key: string;
    jwt_token: string;
    device_name?: string;
  }) {
    const values = pickBy(
      {
        udid,
        device_name,
        user_id,
        jwt_token,
        token_key,
        is_logged: true,
        expire_at: moment().add(14, "day").toDate()
      },
      (v) => v !== undefined
    );
    const existingDevice = await super.findOneByConditions({
      udid,
      user_id
    });

    if (existingDevice) {
      await super.update(values, { udid, user_id });
    } else {
      await super.insert(values);
    }
  }

  async logoutDevice({ user_id, udid }: { user_id: ID; udid: string }) {
    await super.update({ is_logged: false }, { user_id, udid });
  }

  async logoutAllDevice({ user_id }: { user_id: ID }) {
    await super.update({ is_logged: false }, { user_id });
  }

  async removeDevice({ user_id, udid }: { user_id: ID; udid: string }) {
    await super.removeByConditions({ user_id, udid });
  }

  async removeAllDevice({
    user_id,
    current_udid
  }: {
    user_id: ID;
    current_udid: string;
  }) {
    await this.connector.db.raw(
      `DELETE FROM devices WHERE user_id = :user_id and udid != :current_udid`,
      { user_id, current_udid }
    );
  }

  async list(user_id: ID) {
    const { list: devices, totalCount } = await super.findForList(
      { user_id },
      {
        fields: ["udid", "is_logged", "device_name", "expire_at"]
      }
    );
    return { devices, totalCount };
  }
}
