import APIService from 'core/base/service';

import { incAlphanum } from 'lib/utils';
import { DBConnection } from "core/types";

export default class SequenceService extends APIService {
  constructor(db: DBConnection) {
    super(db, "sequences");
  }

  async _generate(key: string, options: any = {}) {
    const seq = await super.findOne('key', key);

    if (seq) {
      const nextCode = incAlphanum(seq.value, options);

      await super.update({
        value: nextCode
      }, {
        key,
      });

      return nextCode.toUpperCase();;
    }
  }

  async generateOrderCode(shopCode?: string) {
    return await this._generate('order_code');
  }

  async generateShopCode() {
    return await this._generate('shop_code', { digits: false });
  }

  async generateTicketCode(shopCode?: string) {
    return await this._generate('ticket_code');
  }
}
