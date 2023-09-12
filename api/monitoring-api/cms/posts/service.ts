import APIService from "core/base/service";
import { ApiOptions, ID } from "core/types";

export default class CMSPostService extends APIService {
  async list(_: any, options: ApiOptions) {
    const posts = await super.findForList({}, options);

    return { data: posts };
  }

  async detail(id: ID) {
    const post = await super.findOneByConditions({ id });

    return { data: post };
  }

  async create({
    title,
    summary,
    image,
    body
  }: {
    title: string;
    summary?: string;
    image: string;
    body: string;
  }) {
    await super.insert({
      title,
      summary,
      image,
      body
    });
  }

  async update({
    id,
    title,
    summary,
    image,
    body
  }: {
    id: ID;
    title: string;
    summary: string;
    image: string;
    body: string;
  }) {
    await super.update(
      {
        title,
        summary,
        image,
        body
      },
      { id }
    );
  }

  async remove(id: ID) {
    await super.removeByConditions({ id });
  }
}
