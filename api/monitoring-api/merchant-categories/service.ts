import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ID } from "core/types";

export default class MerchantCategoryService extends APIService {
  async list(filter = {}, options = {}) {
    const { list: data, totalCount: total } = await super.findForList(
      filter,
      options
    );
    return { data, total };
  }

  async detail(id: ID) {
    const category = await super.findOne("id", id);

    return { data: category };
  }
  async create({
    name,
    code,
    ordering,
    level,
    parent_id
  }: {
    name: string;
    code: string;
    ordering: number;
    level: number;
    parent_id: ID;
  }) {
    await super.insert(
      pickBy(
        {
          name,
          code,
          ordering,
          level,
          parent_id
        },
        (v) => v !== undefined
      )
    );
  }
  async update({
    id,
    name,
    code,
    ordering,
    level,
    parent_id
  }: {
    id: ID;
    name: string;
    code: string;
    ordering: number;
    level: number;
    parent_id: ID;
  }) {
    await super.update(
      pickBy(
        {
          name,
          code,
          ordering,
          level,
          parent_id
        },
        (v) => v !== undefined
      ),
      { id }
    );
  }
}
