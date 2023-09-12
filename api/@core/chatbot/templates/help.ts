import { buildTextMessage } from './utils';
const CDN_URL = process.env.CDN_URL;

const help_faq = (faq_items: any) => buildTextMessage(
  faq_items.length === 0 ? "Мэдээлэл оруулаагүй байна." :
    faq_items.map((faq: any) => `${(faq.question || "").toUpperCase()}\n${faq.answer}`)
             .join("\n\n").substr(0, 2000),
);

const help_terms = (data: any, options: any) => buildTextMessage([
  `${options.help_terms_service_title || "Үйлчилгээний нөхцөл"}\n${(data.terms_of_service || '-').trim()}`,
  `${options.help_terms_payment_title || "Төлбөрийн нөхцөл"}\n${(data.payment_rule || '-').trim()}`,
  `${options.help_terms_delivery_title || "Хүргэлтийн нөхцөл"}\n${(data.delivery_rule || '-').trim()}`,
].join("\n\n").substr(0, 2000));

export default {
  help_faq,
  help_terms,
}
