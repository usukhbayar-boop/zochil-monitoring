import APIService from "core/base/service";

import { User, DBConnection, ID, ApiOptions, ApiFilter } from "core/types";
import CustomError from "lib/errors/custom_error";
import pickBy from "lodash/pickBy";

export default class ModuleService extends APIService {
  constructor(db: DBConnection) {
    super(db, "modules");
  }

  async list(filter: ApiFilter, options: ApiOptions) {
    const { list: modules, totalCount } = await super.findForList(
      {
        filter
      },
      {
        page: options.page,
        limit: options.limit
      }
    );
    return { modules, totalCount };
  }

  async detailByUid({ uid }: { uid: string }) {
    const module = await super.findOneByConditions({
      uid
    });

    if (!module) {
      throw new CustomError("module_not_found", "module_not_found");
    }

    return { module };
  }

  async create({
    status,
    name,
    uid,
    module_type,
    description,
    short_description,
    terms,
    image,
    rules,
    require_contract,
    website
  }: {
    user: User;
    status: string;
    name: string;
    uid: string;
    module_type: string;
    description: string;
    short_description: string;
    terms: string;
    image: string;
    rules: any;
    require_contract: boolean;
    website: string;
  }) {
    const params = pickBy(
      {
        status,
        name,
        uid,
        module_type,
        description,
        short_description,
        terms,
        image,
        rules,
        require_contract,
        website
      },
      (v) => v
    );

    const id = await super.insert(params);

    return { id, ...params };
  }

  async update({
    id,
    status,
    name,
    uid,
    module_type,
    description,
    short_description,
    terms,
    image,
    rules,
    require_contract,
    website
  }: {
    id: ID;
    status: string;
    name: string;
    uid: string;
    module_type: string;
    description: string;
    short_description: string;
    terms: string;
    image: string;
    rules: any;
    require_contract: boolean;
    website: string;
  }) {
    const params = pickBy(
      {
        status,
        name,
        uid,
        module_type,
        description,
        short_description,
        terms,
        image,
        rules,
        require_contract,
        website
      },
      (v) => v
    );

    await super.update(params, { id });
  }

  async remove(id: ID) {
    await super.removeById(id);
  }
}
