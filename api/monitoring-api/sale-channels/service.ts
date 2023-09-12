import { DBConnection, ID } from "core/types";
import APIService from "core/base/service";

export default class SaleChannelMonitoringService extends APIService {
  constructor(db: DBConnection) {
    super(db, "sale_channels");
  }

  async list() {
    const sale_channels = await super.findAll({}, this.tableName, {
      limit: 100,
      sortDirection: "asc",
      sortField: "ordering"
    });

    return { data: sale_channels };
  }

  async create({
    uid,
    name,
    logo,
    channel_type,
    description,
    terms
  }: {
    uid: string;
    name: string;
    logo: string;
    channel_type: string;
    description: string;
    terms?: string;
  }) {
    const id = await super.insert({
      uid,
      name,
      logo,
      channel_type,
      description,
      terms
    });
    return { id };
  }

  async detail({ uid }: { uid: string }) {
    const conditions: { [key: string]: any } = {
      uid
    };
    const sale_channel = await super.findOneByConditions(conditions);
    return { data: sale_channel };
  }

  async update({
    id,
    uid,
    name,
    logo,
    channel_type,
    description,
    terms
  }: {
    id: ID;
    uid: string;
    name: string;
    channel_type: string;
    logo?: string;
    description?: string;
    terms?: string;
  }) {
    return await super.update(
      {
        uid,
        name,
        logo,
        channel_type,
        description,
        terms
      },
      { id },
      "sale_channels"
    );
  }

  async remove(id: ID) {
    return this.removeById(id);
  }
}
