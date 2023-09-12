import moment from 'moment';
import { buildReceiptTemplate } from './utils';

export const PM_MAP: { [key:string]: string } = {
  qpay: "QPay",
  lend: "LendMN",
  card: "Карт",
  monpay: "MonPay",
  socialpay: "SocialPay",
  mostmoney: "Most Money",
  khan: "Хаан банк",
  golomt: "Голомт банк",
  state: "Төрийн банк",
  tdb: "ХХБ",
  xac: "Хас Банк",
  ubcity: "Улаанбаатар хотын банк",
  capitron: "Капитрон банк",
  arig: "Ариг банк",
  storepay: "StorePay",
  bank: "Дансаар шилжүүлэх",
}

const order_receipt = (order: any, options: any) => buildReceiptTemplate({
  "currency":"MNT",
  "template_type":"receipt",
  "order_number": order.code,
  "recipient_name": order.customer_full_name,
  "payment_method": PM_MAP[order.payment_type],
  "timestamp": moment(order.created_at).unix(),
  "order_url": `${options.base_url}/order/${order.id}`,
  "address":{
    "postal_code": "976",
    "city":"Ulaanbaatar",
    "country":"Mongolia",
    "state":"Ulaanbaatar",
    "street_1": order.customer_address,
  },
  "summary":{
    "total_cost": order.total_price
  },
  elements: order.elements || [],
});

export default {
  order_receipt,
};
