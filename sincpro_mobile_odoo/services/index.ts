/**
 * Odoo's use cases, ready to execute: importing this registers each one on
 * `odooBoundedContext` (its decorator runs when its module loads). What the module and an app
 * import — never `infrastructure/framework.ts` alone, which has none registered yet.
 */
export { odooBoundedContext } from "@sincpro/mobile-odoo/infrastructure/framework";
export {
  CommandDeleteServer,
  CommandSaveServer,
  CommandServerParams,
  DeleteServer,
  SaveServer,
  ServerParams,
} from "@sincpro/mobile-odoo/services/server/server.feature";
export { ForgetOdooUser } from "@sincpro/mobile-odoo/services/session/forget_odoo_user.feature";
export {
  CommandLogin,
  Login,
} from "@sincpro/mobile-odoo/services/session/login.feature";
export {
  CommandLogout,
  Logout,
} from "@sincpro/mobile-odoo/services/session/logout.feature";
export {
  CommandRestoreSession,
  RestoreSession,
} from "@sincpro/mobile-odoo/services/session/restore_session.feature";
