
export interface MarketplacePost {
  id: string | number;
  marketplace_uid :string | number;
  merchant_id: string | number;
  user_id: string | number;
  title: string;
  status: string;
  body: string;
  image: string;
  summary: string;
  video_url: string;
  sale_channels: string;
  created_at: Date;
  updated_at: Date;
}

export interface MarketplaceBanner {
  id: string | number;
  shop_id: string | number;
  image: string;
  status: string;
  position: string;
  type: string;
  created_at: Date;
  updated_at: Date;
  title: string;
  url: string;
  video_url: string;
}
