
export interface Merchant {
  id: string | number;
  name: string;
  uid: string;
  logo: string;
  phone: string;
  code: string;
  source: string;
  email?: string;
  address?: string;
  description?: string;
  custom_domain?: string;
  created_at: Date;
  update_at: Date;
  sale_channles: Array<string>;

  [key: string]: any;
}

export interface IMerchantService {
  checkOwnership(
    user_id: number | string,
    shop_id: number | string,
    message: string,
    status: string,
  ): Promise<any>;

  getMerchant(
    id: number | string,
    field:string,
    all_options?: boolean
  ): Promise<Merchant>;

  updateOption(
    merchant_id: string | number,
    key: string,
    value: string,
    sensitive:boolean,
    is_json:boolean): Promise<void>;

  removeOption(merchant_id: string | number, key: string): Promise<void>;
  checkUid(uid: string): void;
  getURL(merchant: Merchant, miniapp?: boolean, provider?: string): string;
}
