/**
 * Odoo's use cases, ready to execute: importing this registers each one on
 * `odooBoundedContext` (its decorator runs when its module loads). What the module and an app
 * import — never `infrastructure/framework.ts` alone, which has none registered yet.
 * One file per use case; what several of one folder share is in its `common.ts`.
 */
export { odooBoundedContext } from "@sincpro/mobile-odoo/infrastructure/framework";
export {
  CommandDeleteServer,
  DeleteServer,
} from "@sincpro/mobile-odoo/services/server/delete_server.feature";
export {
  CommandSaveServer,
  SaveServer,
} from "@sincpro/mobile-odoo/services/server/save_server.feature";
export {
  CommandServerParams,
  ServerParams,
} from "@sincpro/mobile-odoo/services/server/server_params.feature";
export {
  CommandForgetOdooUser,
  ForgetOdooUser,
} from "@sincpro/mobile-odoo/services/session/forget_odoo_user.feature";
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
