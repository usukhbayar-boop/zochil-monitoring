import moment from "moment";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";
import { ApiFilter, ApiOptions, ID } from "core/types";

export default class ModulesListService extends APIService {
  async list(filter: ApiFilter, options: ApiOptions) {
    const { list: orders, totalCount } = await super.findForList(
      this._buildFilter(filter),
      this._buildOptions(options)
    );

    return { data: orders, total: totalCount };
  }

  async detail(id: ID) {
    const order = await super.findOne("id", id);
    return { data: order };
  }

  async update({
    id,
    name,
    description,
    short_description,
    module_type,
    status,
    terms,
    image,
    rules,
    require_contact,
    website,
    billable,
    images,
    require_approval
  }: {
    id: ID;
    name: string;
    description: string,
    short_description: string;
    module_type: string;
    status: string,
    terms: string,
    image: string,
    rules: string[],
    require_contact: string,
    website: string,
    billable: string,
    images: string,
    require_approval: string
  }) {
    await super.update(
      pickBy(
        {
          name,
          description,
          short_description,
          module_type,
          status,
          terms,
          image,
          rules: JSON.stringify(rules || []),
          require_contact,
          website,
          billable,
          images,
          require_approval
        },
        (v) => v !== undefined
      ),
      { id }
    );
  }

  _buildOptions(options: ApiOptions) {
    return {
      ...options,
      fields: [
        "id",
        "uid",
        "name",
        "description",
        "short_description",
        "module_type",
        "status",
        "terms",
        "image",
        "rules",
        "require_contact",
        "website",
        "created_at",
        "updated_at",
        "billable",
        "images",
        "require_approval"
      ]
    };
  }

  _buildFilter(filter: ApiFilter) {
    const theFilter: { [key: string]: any } = pickBy(
      pick(
        filter,
        [
          "module_type",
          "status",
          "require_contract",
          "billable",
          "require_approval"
        ]),
      v => v !== undefined
    );


    if (filter.uid) {
      theFilter.uid = [
        `modules.uid ILIKE :uid`,
        {
          uid: `%${filter.uid}%`
        }
      ];
    }

    if (filter.name) {
      theFilter.name = [
        `lower(modules.name) ILIKE= :name`,
        {
          name: `%${filter.name}%`.toLowerCase()
        }
      ];
    }

    if (filter.website) {
      theFilter.website = [
        `modules.website ILIKE :website`,
        {
          website: `%${filter.website}%`
        }
      ];
    }

    if (filter.start && filter.end) {
      theFilter.created_range = [
        `modules.created_at between :start and :end`,
        {
          end: moment(filter.end).toDate(),
          start: moment(filter.start).toDate()
        }
      ];
    } else if (filter.start) {
      theFilter.created_range = [
        `modules.created_at > :start`,
        { start: moment(filter.start).toDate() }
      ];
    } else if (filter.end) {
      theFilter.created_range = [
        `modules.created_at < :end`,
        { end: moment(filter.end).toDate() }
      ];
    }

    return theFilter;
  }
}
