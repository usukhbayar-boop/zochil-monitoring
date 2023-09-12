import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, DBConnection, ID } from "core/types";

export default class CrowdfundCampaignsMonitoringService extends APIService {
  constructor(db: DBConnection) {
    super(db, "crowdfund_campaigns");
  }

  async list(filter: ApiFilter, options: ApiOptions) {
    const theFilter = pickBy(
      {
        campaign_type: filter.campaign_type
      },
      (v) => v
    );

    if (filter.name) {
      theFilter.name = [
        `lower(title) like :query`,
        { query: `%${filter.name.toLowerCase()}%` }
      ];
    }

    const { list: campaigns, totalCount } = await this.findForList(
      theFilter,
      options
    );

    return {
      data: campaigns,
      total: totalCount
    };
  }

  async detail(id: ID) {
    const campaign = await super.findOneByConditions({ id });

    return { data: campaign };
  }

  async create({
    title,
    goal,
    image,
    category_id,
    description,
    category_name,
    due_date,
    summary,
    mission,
    risk,
    gallery,
    status,
    address,
    lat_lng,
    zoom,
    finance,
    plant_types,
    campaign_type,
    google_map_data
  }: {
    title: string;
    goal: number;
    image: string;
    category_id: ID;
    description: string;
    category_name: string;
    due_date: Date;
    summary: string;
    mission: string;
    risk: string;
    gallery: any;
    status: string;
    address: string;
    lat_lng: any;
    zoom: number;
    plant_types: any;
    finance: any;
    campaign_type: string;
    google_map_data: string;
  }) {
    await super.insert({
      title,
      goal,
      image,
      risk,
      zoom,
      summary,
      due_date,
      mission,
      gallery,
      address,
      lat_lng,
      category_id,
      description,
      category_name,
      campaign_type,
      status,
      plant_types: JSON.stringify(plant_types || []),
      google_map_data: JSON.stringify(google_map_data)
    });
  }

  async update({
    id,
    title,
    goal,
    image,
    category_id,
    description,
    category_name,
    due_date,
    summary,
    mission,
    risk,
    finance,
    gallery,
    status,
    address,
    lat_lng,
    zoom,
    plant_types,
    campaign_type,
    google_map_data
  }: {
    id: ID;
    title: string;
    goal: number;
    image: string;
    category_id: ID;
    description: string;
    category_name: string;
    due_date: Date;
    summary: string;
    mission: string;
    risk: string;
    gallery: any;
    status: string;
    address: string;
    lat_lng: any;
    zoom: number;
    plant_types: any;
    finance: any;
    campaign_type: string;
    google_map_data: string;
  }) {
    await super.update(
      pickBy(
        {
          title,
          goal,
          image,
          category_id,
          description,
          category_name,
          due_date,
          summary,
          mission,
          risk,
          gallery,
          status,
          address,
          lat_lng,
          zoom,
          campaign_type,
          finance: JSON.stringify(finance),
          plant_types: JSON.stringify(plant_types || []),
          google_map_data: JSON.stringify(google_map_data)
        },
        (v) => v
      ),
      { id }
    );
  }

  async remove(id: ID) {
    await super.removeByConditions({ id });
  }
}
