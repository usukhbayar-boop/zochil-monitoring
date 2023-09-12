import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ApiOptions, ID } from "core/types";

export default class CMSAgentService extends APIService {
  async list(_: any, options: ApiOptions) {
    const agents = await super.findForList({}, options);

    return { data: agents };
  }

  async detail(id: ID) {
    const agent = await super.findOneByConditions({ id });

    return { data: agent };
  }

  async create({
    image,
    phone,
    full_name,
    description,
    facebook_url,
    instagram_url,
    linkedin_url
  }: {
    image: string;
    phone: string;
    full_name: string;
    description?: string;
    facebook_url?: string;
    instagram_url?: string;
    linkedin_url?: string;
  }) {
    await super.insert({
      full_name,
      description,
      image,
      phone,
      facebook_url,
      instagram_url,
      linkedin_url
    });
  }

  async update({
    id,
    image,
    phone,
    full_name,
    description,
    facebook_url,
    instagram_url,
    linkedin_url
  }: {
    id: ID;
    phone: string;
    image: string;
    full_name: string;
    description?: string;
    facebook_url?: string;
    instagram_url?: string;
    linkedin_url?: string;
  }) {
    await super.update(
      pickBy(
        {
          image,
          phone,
          full_name,
          description,
          facebook_url,
          instagram_url,
          linkedin_url
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
