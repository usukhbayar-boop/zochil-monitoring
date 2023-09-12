import axios from "axios";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { DBConnection, ID, ApiFilter, ApiOptions } from "core/types";

const { JOB_SERVER_URL } = process.env;

export default class AdminIssueService extends APIService {
  constructor(db: DBConnection) {
    super(db, "broadcasts");
  }

  async list(filter: ApiFilter, options: ApiOptions) {
    const theFilter = pickBy(pick(filter, ["status"]), (v) => v);

    if (filter.title) {
      theFilter.title = [
        "lower(title) like :title",
        { title: `%${filter.title}%` }
      ];
    }

    const { list: broadcasts, totalCount } = await super.findForList(
      theFilter,
      {
        ...options
      }
    );

    return { data: broadcasts, total: totalCount };
  }

  async detail(id: ID) {
    const broadcast = await super.findOneByConditions({ id });

    return { data: broadcast };
  }

  async create({
    body,
    title,
    channels,
    broadcast_type
  }: {
    body: string;
    title: string;
    channels: string[];
    broadcast_type: string;
  }) {
    const id = await super.insert({
      body,
      title,
      broadcast_type,
      status: "pending",
      channels: JSON.stringify(channels)
    });

    return { id };
  }

  async updateBroadcast({
    id,
    body,
    title,
    channels,
    broadcast_type
  }: {
    id: ID;
    body: string;
    title: string;
    channels: string[];
    broadcast_type: string;
  }) {
    await super.update(
      {
        body,
        title,
        broadcast_type,
        channels: JSON.stringify(channels)
      },
      { id }
    );

    return { id };
  }

  async remove(id: ID) {
    await super.removeByConditions({ id });
  }

  async send(id: ID, merchant_ids: ID[]) {
    const broadcast = await super.findOneByConditions({ id });

    if (broadcast) {
      if (broadcast.broadcast_type === "partial") {
        await super.update(
          {
            merchant_ids: JSON.stringify(merchant_ids)
          },
          { id }
        );
      }

      await this._runBroadcastJob(id);
    }
  }

  async _runBroadcastJob(id: ID) {
    try {
      const resp = await axios({
        data: { id },
        method: "post",
        url: `${JOB_SERVER_URL}/notifications/broadcast`,
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("JOB: ", resp.data);
    } catch (err: any) {
      console.log("JOB: ", (err.response || {}).data);
    }
  }
}
