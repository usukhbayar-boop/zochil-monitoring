import APIService from "core/base/service";
import { DBConnection, ID } from "core/types";
export default class PaymentIntegrationService extends APIService {
  constructor(db: DBConnection) {
    super(db, "payment_integrations");
  }

  async create({
    partner_id,
    api_url,
    auth_params,
    create_params,
    create_success_conditions,
    create_selectors,
    check_params,
    check_success_conditions,
    check_selectors,
    return_params,
    return_selectors,
    return_success_conditions,
    metadata,
    options,
    webhook_field,
    webhook_method,
    uid,
    checkout_url
  }: {
    partner_id: ID;
    api_url: string;
    auth_params: any;
    create_params: any;
    create_success_conditions: any;
    create_selectors: any;
    check_params: any;
    check_success_conditions: any;
    check_selectors: any;
    return_params: any;
    return_selectors: any;
    return_success_conditions: any;
    metadata: any;
    options: any;
    webhook_field: string;
    webhook_method: string;
    uid: string;
    checkout_url: string;
  }) {
    const id = await super.insert({
      partner_id,
      api_url,
      auth_params,
      create_params,
      create_success_conditions,
      create_selectors,
      check_params,
      check_success_conditions,
      check_selectors,
      return_params,
      return_selectors,
      return_success_conditions,
      metadata,
      options,
      webhook_field,
      webhook_method,
      uid,
      checkout_url
    });
    return { id };
  }

  async update({
    id,
    partner_id,
    api_url,
    auth_params,
    create_params,
    create_success_conditions,
    create_selectors,
    check_params,
    check_success_conditions,
    check_selectors,
    return_params,
    return_selectors,
    return_success_conditions,
    metadata,
    options,
    webhook_field,
    webhook_method,
    uid,
    checkout_url
  }: {
    id: ID;
    partner_id: ID;
    api_url: string;
    auth_params: any;
    create_params: any;
    create_success_conditions: any;
    create_selectors: any;
    check_params: any;
    check_success_conditions: any;
    check_selectors: any;
    return_params: any;
    return_selectors: any;
    return_success_conditions: any;
    metadata: any;
    options: any;
    webhook_field: string;
    webhook_method: string;
    uid: string;
    checkout_url: string;
  }) {
    await super.update(
      {
        partner_id,
        api_url,
        auth_params,
        create_params,
        create_success_conditions,
        create_selectors,
        check_params,
        check_success_conditions,
        check_selectors,
        return_params,
        return_selectors,
        return_success_conditions,
        metadata,
        options,
        webhook_field,
        webhook_method,
        uid,
        checkout_url
      },
      { id }
    );
  }
}
