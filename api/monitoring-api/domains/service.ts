import { parse as parse_domain } from "psl";
import APIService from "core/base/service";
import { resolveAndCheckIP } from "lib/utils/dns";
import { DBConnection, ID } from "core/types";
const DomainRegex =
  /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;

export default class AdminDomainService extends APIService {
  constructor(db: DBConnection) {
    super(db, "domains");
  }

  async list() {
    const { list: domains, totalCount } = await super.findForList();

    return {
      data: domains,
      total: totalCount
    };
  }

  async linkDomain(merchant_id: ID, domain: string, theme: string) {
    let success = true;
    let description = "";

    let duplicateMerchant = null;
    const validDomain = DomainRegex.test(domain);
    const existing = await super.findOneByConditions({ name: domain });

    const shop = await super.findOneByConditions({ id: merchant_id }, "shops");
    const merchantLinked = !!(shop && shop.custom_domain);

    if (shop && validDomain) {
      const host: any = parse_domain(domain);
      let uid = (host.domain || "").replace(`.${host.tld}`, "");

      if (host.subdomain) {
        uid = `${host.subdomain}.${uid}`;
      }

      if (uid !== shop.uid) {
        duplicateMerchant = await super.findOneByConditions({ uid }, "shops");
      }
    }

    if (!existing && !merchantLinked && !duplicateMerchant && validDomain) {
      let ip_valid: boolean = false;

      try {
        ip_valid = await resolveAndCheckIP(domain);
      } catch (err: any) {
        ip_valid = false;
      }

      await super.insert({
        merchant_id,
        name: domain,
        ip_valid,
        theme,
      });

      await super.update({ theme }, { id: merchant_id }, "shops");
    } else {
      success = false;
      description = "Алдаа гарлаа.";
      if (!validDomain) {
        description = "Домэйн нэрээ зөв бичнэ үү.";
      } else if (duplicateMerchant) {
        description =
          "Ашиглах боломжгүй домэйн нэр. Энэ домэйныг өөр дэлгүүр ашиглаж байна.";
      } else if (existing) {
        description = "Бүртгэлтэй домэйн хаяг байна.";
      } else if (merchantLinked) {
        description = "Энэ дэлгүүр өөр домэйн тохируулсан байна.";
      }
    }

    return { success, description };
  }

  async checkDomain(merchant_id: ID, domain: string) {
    const domain_record = await super.findOneByConditions({
      merchant_id,
      name: domain,
      ip_valid: false,
      configured: false
    });

    if (domain_record) {
      try {
        const valid = await resolveAndCheckIP(domain);
        if (valid) {
          await super.update({ ip_valid: true }, { id: domain_record.id });
        }
      } catch (err: any) {}
    }
  }

  async removeDomain(id: ID) {
    const domain_record = await super.findOneByConditions({
      id
    });

    if (domain_record) {
      if (domain_record.status === "pending" && !domain_record.ip_valid) {
        await super.removeById(id);
      } else {
        await super.update({ configured: false, status: "pending-removal" }, { id: domain_record.id });
      }
    }
  }

}
