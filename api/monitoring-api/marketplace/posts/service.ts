import pick from "lodash/pick";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";

export default class PostsService extends APIService {
  constructor(db: DBConnection, tablename: string) {
    super(db, tablename);
  }

  async list(user: User, filter: ApiFilter, options: ApiOptions) {
    const theFilter = this._buildFilter(filter, user);

    const posts = await super.findForList(theFilter, options);
    return { data: posts };
  }

  async create({
    user_id,
    title,
    marketplace_uid,
    body,
    image,
    summary,
    video_url
  }: {
    user_id: ID;
    marketplace_uid: string;
    title: string;
    body: string;
    image?: string;
    summary?: string;
    video_url?: string;
  }) {
    await super.insert({
      body,
      image,
      title,
      summary,
      user_id,
      video_url,
      marketplace_uid
    });
  }

  async update({
    id,
    title,
    body,
    image,
    summary,
    video_url,
    user
  }: {
    id: ID;
    title: string;
    body: string;
    image: string;
    summary: string;
    video_url: string;
    user: User;
  }) {
    await super.update(
      {
        title,
        body,
        image,
        summary,
        video_url
      },
      {
        id,
        marketplace_uid: user.marketplace_uid
      }
    );
  }

  async remove(id: ID, user: User) {
    await super.removeByConditions({
      id,
      marketplace_uid: user.marketplace_uid || "none"
    });
  }

  async detail(user: User, id: ID) {
    const conditions: { [key: string]: any } = { id };
    if (user.admin_type === "marketplace_admin") {
      conditions.marketplace_uid = user.marketplace_uid || "none";
    }

    const post = await super.findOneByConditions(conditions);

    return { data: post };
  }

  _buildFilter(filter: ApiFilter, user: User) {
    const theFilter: ApiFilter = {
      ...pick(filter, []),
      marketplace_uid: [
        "marketplace_posts.marketplace_uid = :marketplace_uid",
        { marketplace_uid: `${filter.marketplace_uid}` }
      ]
    };

    if (user.admin_type === "marketplace_admin") {
      theFilter.marketplace_uid = user.marketplace_uid || "none";
    }

    return theFilter;
  }
}
