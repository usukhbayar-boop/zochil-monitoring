import pick from "lodash/pick";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, DBConnection, ID, User } from "core/types";

export default class MarketPlaceBannerService extends APIService {
  constructor(db: DBConnection) {
    super(db, "marketplace_banners");
  }
  async list(user: User, filter: ApiFilter) {
    const theFilter = this._buildFilter(user, filter);

    const banners = await super.findForList(theFilter);
    return { data: banners };
  }

  async findByShop(shop_id: ID) {
    const banners = await super.findAll({
      shop_id,
      status: "enabled"
    });
    return { data: banners };
  }

  async create({
    marketplace_uid,
    status,
    image,
    position,
    banner_type,
    video_url
  }: {
    marketplace_uid: string;
    status: string;
    banner_type: string;
    position: string;
    image?: string;
    video_url?: string;
  }) {
    await super.insert({
      marketplace_uid,
      status,
      image,
      position,
      banner_type,
      video_url
    });
  }

  _buildFilter(user: User, filter: ApiFilter) {
    const theFilter: ApiFilter = {
      ...pick(filter, []),
      marketplace_uid: [
        "marketplace_banners.marketplace_uid = :marketplace_uid",
        { marketplace_uid: `${filter.marketplace_uid}` }
      ]
    };

    if (user.admin_type === "marketplace_admin") {
      theFilter.marketplace_uid = user.marketplace_uid || "none";
    }
    return theFilter;
  }

  async update({
    id,
    user,
    status,
    image,
    position,
    banner_type,
    video_url
  }: {
    status: string;
    position: string;
    banner_type: string;
    video_url: string;
    image: string;
    user: User;
    id: ID;
  }) {
    await super.update(
      { status, position, banner_type, video_url },
      {
        id,
        marketplace_uid: user.marketplace_uid || "none"
      }
    );
  }

  async detail(user: User, id: ID) {
    const conditions: { [key: string]: any } = { id };
    if (user.admin_type === "marketplace_admin") {
      conditions.marketplace_uid = user.marketplace_uid || "none";
    }
    const banner = await super.findOneByConditions(conditions);
    return { data: banner };
  }

  async remove(id: ID, user: User) {
    await super.removeByConditions({
      id,
      marketplace_uid: user.marketplace_uid || "none"
    });
  }
}
