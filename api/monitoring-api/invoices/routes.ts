import { Router } from 'express';

import InvoiceService from './service';
import { DBConnection } from 'core/types';

export default (db: DBConnection) => {
  const routes: any = Router();
  const service = new InvoiceService(db, 'invoices');
  return routes;
};
