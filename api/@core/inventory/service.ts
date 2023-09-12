import APIService from 'core/base/service';
import MerchantService from 'core/merchants/service';
import { DBConnection, ID, User } from "core/types";

export default class InventoryPurchaseService extends APIService {
  private _merchantService: MerchantService;
  constructor(db: DBConnection) {
    super(db, "inventory_purchases");
    this._merchantService = new MerchantService(db, "shops");
  }

  async list(user: User, shop_id: ID) {
    await this._merchantService.checkOwnership(user.id, shop_id);
    const purchases = await super.findAll({ shop_id });
    return { purchases };
  }

  async detail(user: User, shop_id: ID, id: ID) {
    await this._merchantService.checkOwnership(user.id, shop_id);
    const result = await super.findAll({ shop_id, id });
    if (result && result.length) {
      return { purchase: result[0] };
    }
  }

  async createPurchase({
    user,
    shop_id,
    product_id,
    quantity,
    price,
    description,
  }: {
    user: User,
    shop_id: ID,
    product_id: ID,
    quantity: number,
    price: number,
    description: string,
  }) {
    await this._merchantService.checkOwnership(user.id, shop_id);
    await this.createPurchaseOrder({
      price,
      shop_id,
      quantity,
      product_id,
      description,
      type: 'in',
    });
  }

  async createPurchaseOrder({
    shop_id,
    product_id,
    variant_id,
    type,
    quantity,
    price,
    description,
  }: {
    shop_id: ID,
    type: string,
    price: number,
    product_id: ID,
    variant_id?: ID,
    quantity: number,
    description: string,
  }) {
    const inventories = await super.findAll({
      shop_id,
      product_id,
      ...(variant_id && { variant_id }),
    }, 'inventory');

    if (inventories.length === 0) {
      throw new Error('Inventory not found.');
    }

    const inventory =  inventories[0];
    let old_stock = inventory.stock;

    let new_stock;
    if (type === 'in' || type === 'reverse') {
      new_stock = old_stock + quantity;
    } else if(type === 'order') {
      new_stock = old_stock - quantity;
    }

    if (new_stock < 0) {
      throw new Error('New stock is lesser than zero.');
    }

    await super.insert({
      shop_id,
      product_id,
      type,
      description,
      new_stock,
      old_stock,
      quantity,
      price,
      inventory_id: inventory.id,
      ...(variant_id && { variant_id }),
    });

    await super.update(
      { stock: new_stock },
      { shop_id, id: inventory.id },
      'inventory'
    );

    return { new_stock, old_stock };
  }

  async remove(user: User, shop_id: ID, id: ID) {
    await this._merchantService.checkOwnership(user.id, shop_id);
    const purchaseOrder = await super.findOneByConditions({ shop_id, id });
    if (purchaseOrder) {
      const { list: purchasesAfter } = await super.findForList({
        created_at: ['created_at >= :created_at', { created_at : purchaseOrder.created_at }]
      });

      if (purchasesAfter.length) {
        throw new Error('Remove all the purchases created after.');
      }

      await super.removeById(id);
    }
  }
}
