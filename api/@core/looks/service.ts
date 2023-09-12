import APIService from "core/base/service";
import { User, DBConnection, ID } from "core/types";
import { replaceWithThumbnail } from "lib/utils";
import MerchantService from "core/merchants/service";

export default class LookService extends APIService {
  private _merchantService: MerchantService;
  constructor(db: DBConnection) {
    super(db, "looks");
    this._merchantService = new MerchantService(db, "shops");
  }

  async _fetchProducts(look: any) {
    try {
      if (look && look.products) {
        const products = await this.connector
          .db_readonly("products")
          .select("id", "price", "images", "name")
          .whereRaw(
            `id in (${(look.products || []).map((p: any) => p.id).join(",")})`,
            {}
          );
        look.products = (products || []).map((product) => ({
          ...(look.products.filter(
            (p: any) => parseInt(p.id) === product.id
          )[0] || {}),
          ...product,
          price: parseInt(product.price),
          sale_price: product.sale_price && parseInt(product.sale_price)
        }));
      }
    } catch (error) {}
  }

  async _fetchBanner(look: any) {
    try {
      look.shop_banner = await super.findOneByConditions(
        {
          shop_id: look.shop_id
        },
        "banners"
      );
    } catch (error) {}
  }

  async _fetchLookSaves(look: any) {
    if (look) {
      const save_count: any = await this.connector
        .db_readonly("look_saves")
        .select("look_id")
        .where({ look_id: look.id })
        .count("id as save_count")
        .groupBy("look_id");

      look.save_count =
        save_count && save_count[0] && save_count[0].save_count
          ? parseInt(save_count[0].save_count)
          : 0;
    }
  }

  async _fetchIsLiked(look: any, currentAccount: User) {
    look.is_liked = false;
    try {
      const like = await super.findOneByConditions(
        {
          look_id: look.id,
          account_id: currentAccount.id
        },
        "look_likes"
      );
      if (like && like.id) {
        look.is_liked = true;
      }


    } catch (error) {
      console.error(error);
    }
  }

  async _fetchIsSaved(look: any, currentAccount: User) {
    look.is_saved = false;
    try {
      const save = await super.findOneByConditions(
        {
          look_id: look.id,
          account_id: currentAccount.id
        },
        "look_saves"
      );
      if (save && save.id) {
        look.is_saved = true;
      }
    } catch (error) {}
  }

  async _fetchLookShop(look: any, currentAccount?: User) {
    try {
      look.shop = await this._merchantService.getMerchant(look.shop_id, "id");

      look.shop.is_following = false;
      if (currentAccount) {
        const following = await super.findOneByConditions(
          { account_id: currentAccount.id, shop_id: look.shop_id  },
          "shops_followers"
        );

        look.shop.is_following = !!following;
      }
    } catch (error) {}
  }

  async _fetchLookCategories(look: any) {
    try {
      look.categories = await this.connector
        .db_readonly("look_categories")
        .select("id", "name")
        .whereRaw(
          `id in (${(look.category_ids || [])
            .map((c: string) => c)
            .join(",")})`,
          {}
        );
    } catch (error) {}
  }

  async detail(id: ID, currentAccount?: User) {
    const look = await super.findOneByConditions({ id });
    await this._fetchProducts(look);
    await this._fetchLookSaves(look);
    await this._fetchLookShop(look, currentAccount);
    await this._fetchSimiliarLooks(look);
    await this._fetchLookCategories(look);
    if (currentAccount) {
      await this._fetchIsLiked(look, currentAccount);
      await this._fetchIsSaved(look, currentAccount);
    }
    look.image = replaceWithThumbnail(look.image, "_t500");

    try {
      look.like_count = await this.connector.db("look_likes")
        .count("id")
        .where({ look_id: look.id })
        .then(
          (result: any) => parseInt(result[0]?.count || "0", 10)
        );
    } catch {}

    return { data: look };
  }

  async _fetchSimiliarLooks(look: any) {
    try {
      const ids = look.category_ids.join(",");
      const { list : similiar_looks } = await super.findForList({
        similiar : [
          ` category_ids <@ '[${ids}]'::jsonb and category_ids->>0 is not null`,
          { id: look.id },
        ],
      }, {
        limit: 10
      }, "looks")

      look.similiar_looks = similiar_looks;
    } catch(err: any) {
      console.error(err);
    }
  }
}
