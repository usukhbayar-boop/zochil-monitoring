
import help_helpers from './help';
import main_helpers from './main';
import posts_helpers from './posts';
import admin_main_menu from './admin';
import orders_helpers from './orders';
import contact_helpers from './contact';
import products_helpers from './products';

export default {
  ...help_helpers,
  ...main_helpers,
  ...posts_helpers,
  ...orders_helpers,
  ...contact_helpers,
  ...products_helpers,
  ...admin_main_menu,
};
