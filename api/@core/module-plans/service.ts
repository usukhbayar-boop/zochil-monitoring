import APIService from "core/base/service";
import { DBConnection, ID } from "core/types";
export default class ModulePlanService extends APIService {
  constructor(db: DBConnection) {
    super(db, "module_plans");
  }
  async list() {
    const plans = await super.findAll({});
    return { plans };
  }

  async detail(uid: string) {
    const plan = await super.findOne("uid", uid);
    plan.modules = await this.connector.db_readonly
      .select("*")
      .from("modules")
      .where("uid", "in", plan.modules)
      .orderBy([
        {
          column: "created_at",
          order: "asc"
        }
      ]);
    return { plan };
  }

  async create({
    name,
    description,
    short_description,
    modules,
    rules
  }: {
    name: string;
    description: string;
    short_description: string;
    modules: any;
    rules: any;
  }) {
    const id = await super.insert({
      status: "enabled",
      name,
      description,
      short_description,
      modules,
      rules
    });
    return { id };
  }

  async update({
    id,
    status,
    name,
    description,
    short_description,
    modules,
    rules
  }: {
    id: ID;
    status: string;
    name: string;
    description: string;
    short_description: string;
    modules: any;
    rules: any;
  }) {
    await super.update(
      { status, name, description, short_description, modules, rules },
      { id }
    );
  }
}
