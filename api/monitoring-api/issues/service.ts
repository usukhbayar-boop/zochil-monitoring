import numeral from "numeral";
import pick from "lodash/pick";
import pickBy from "lodash/pickBy";
import APIService from "core/base/service";

import logger from "lib/utils/logger";
import MerchantService from "core/merchants/service";
import PaymentServiceFactory from "lib/payment-services/factory";

import { sendMail } from "lib/mailers/mailgun";
import { sendMonpayMerchantRequest } from "lib/external-apis/monpay";
import { DBConnection, ID, ApiFilter, ApiOptions, Merchant } from "core/types";

const { QPAY_REQUEST_MAILS } = process.env;

export default class AdminIssueService extends APIService {
  private _merchantService: MerchantService;
  constructor(db: DBConnection) {
    super(db, "issues");
    this._merchantService = new MerchantService(db, "shops");
  }

  async list(filter: ApiFilter, options: ApiOptions) {
    const theFilter = pickBy(pick(filter, ["status", "merchant_id"]), (v) => v);

    if (filter.code) {
      theFilter.code = ["code like :code", { code: `%${filter.code}%` }];
    }

    const { list: issues, totalCount } = await super.findForList(theFilter, {
      ...options
    });

    return { data: issues, total: totalCount };
  }

  async detail(id: ID) {
    const issue = await super.findOneByConditions({ id });

    return { data: issue };
  }

  async create({
    owner_id,
    issue_type,
    merchant_id,
    title,
    description,
    qpay_account_bank,
    qpay_account_number,
    qpay_account_holder,
    monpay_english_name,
    monpay_branch_username
  }: {
    owner_id: ID;
    issue_type: string;
    merchant_id: string;
    title: string;
    description: string;
    qpay_account_bank: string;
    qpay_account_number: string;
    qpay_account_holder: string;
    monpay_english_name: string;
    monpay_branch_username: string;
  }) {
    const merchant = await this._merchantService.getMerchant(merchant_id);

    if (!merchant) {
      throw new Error(`Merchant not found. MID: ${merchant_id}`);
    }

    const metadata = pickBy(
      {
        qpay_account_bank,
        qpay_account_number,
        qpay_account_holder,
        monpay_english_name,
        monpay_branch_username
      },
      (v) => v
    );

    const id = await super.insert({
      status: "pending",
      owner_id,
      issue_type,
      merchant_id,
      merchant_name: merchant.name,
      title,
      description,
      metadata: JSON.stringify(metadata)
    });

    await super.update({ code: numeral(id).format("00000") }, { id });
    await this._process({
      ...metadata,
      id,
      merchant,
      issue_type
    });
  }

  async update({
    id,
    title,
    description,
    qpay_account_bank,
    qpay_account_number,
    qpay_account_holder,
    monpay_english_name,
    monpay_branch_username
  }: {
    id: ID;
    title: string;
    description: string;
    qpay_account_bank: string;
    qpay_account_number: string;
    qpay_account_holder: string;
    monpay_english_name: string;
    monpay_branch_username: string;
  }) {
    const issue = await super.findOneByConditions({ id });

    if (issue) {
      const merchant = await this._merchantService.getMerchant(
        issue.merchant_id
      );

      let metadata = pickBy(
        {
          qpay_account_bank,
          qpay_account_number,
          qpay_account_holder,
          monpay_english_name,
          monpay_branch_username
        },
        (v) => v
      );

      await super.update(
        {
          title,
          description,
          merchant_name: merchant.name,
          metadata: JSON.stringify(metadata)
        },
        { id }
      );

      if (issue.status !== "resolved") {
        await this._process({
          ...metadata,
          id,
          merchant,
          issue_type: issue.issue_type
        });
      }
    }
  }
  async changeStatus(id: ID, status: string) {
    await super.update({ status }, { id });
  }

  async remove(id: ID) {
    await super.removeByConditions({ id });
  }

  async _process({
    id,
    merchant,
    issue_type,
    qpay_account_bank,
    qpay_account_number,
    qpay_account_holder,
    monpay_english_name,
    monpay_branch_username
  }: {
    id: ID;
    merchant: Merchant;
    issue_type: string;
    qpay_account_bank?: string;
    qpay_account_number?: string;
    qpay_account_holder?: string;
    monpay_english_name?: string;
    monpay_branch_username?: string;
  }) {
    let status = "pending";
    let response = "";

    if (issue_type === "monpay") {
      if (!monpay_branch_username || !monpay_english_name) {
        response = `Invalid metadata: ${monpay_branch_username}, ${monpay_english_name}`;
        status = "error";
      }

      const result = await sendMonpayMerchantRequest({
        name: merchant.name,
        iconPath: merchant.logo,
        nameEn: monpay_english_name,
        branchUsername: monpay_branch_username,
        redirectUri: this._merchantService.getURL(merchant, true)
      });

      if (result && result.clientId && result.clientSecret) {
        await this._merchantService.updateOption(
          merchant.id,
          "monpay_branch_username",
          monpay_branch_username || ""
        );

        await this._merchantService.updateOption(
          merchant.id,
          "monpay_request_id",
          result.id
        );

        await this._merchantService.updateOption(
          merchant.id,
          "monpay_client_id",
          result.clientId,
          true
        );

        await this._merchantService.updateOption(
          merchant.id,
          "monpay_client_secret",
          result.clientSecret,
          true
        );

        const access_token = await PaymentServiceFactory.getAccessToken(
          "monpay",
          {
            client_id: result.clientId,
            grant_type: "client_credentials",
            client_secret: result.clientSecret,
            redirect_uri: process.env.MONPAY_WEBHOOK_URL || "",
          }
        );

        await this._merchantService.updateOption(
          merchant.id,
          "monpay_payment_token",
          access_token,
          true
        );
      } else {
        status = "error";
      }

      if (result) {
        response = JSON.stringify(result);
      }
    }

    if (issue_type === "qpay") {
      if (!qpay_account_number || !qpay_account_holder || !qpay_account_bank) {
        response = `Invalid metadata: ${qpay_account_number}, ${qpay_account_holder}, ${qpay_account_bank}`;
        status = "error";
      }

      try {
        const toEmails = JSON.parse(QPAY_REQUEST_MAILS || "");

        await sendMail({
          to: toEmails,
          subject: "Zochil Platform - Мерчантад QPay холбох хүсэлт",
          template: "qpay",
          sender: "support@zochil.mn",
          params: {
            "v:merchant_name": merchant.name,
            "v:account_bank": qpay_account_bank,
            "v:account_number": qpay_account_number,
            "v:account_holder": qpay_account_holder,
            "v:webhook_url": process.env.QPAY_WEBHOOK_URL || "",
          }
        });
      } catch (error: any) {
        logger.error({
          message: error.stack || error.message,
          module: "monitoring/issues/process"
        });

        status = "error";
        response = error.message;
      }
    }

    await super.update(
      {
        status,
        response
      },
      { id }
    );
  }
}
