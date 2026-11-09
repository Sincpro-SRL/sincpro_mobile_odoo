import { UIEventBus } from "@sincpro/mobile/infrastructure/ui/UIEventBus";

export const ODOO_PORTAL_RELOAD_EVENT = "odoo.portal.reload";

export interface OdooPortalReloadRequest {
  clearCache: boolean;
}

/**
 * Reloads the mounted Odoo portal from anywhere in the host (its tab button, a menu) with a
 * toast that follows the reload. The HTTP cache serves the assets that did not change;
 * `clearCache` downloads the whole client again. Without a mounted portal it does nothing.
 */
export function reloadOdooPortal(options: { clearCache?: boolean } = {}): void {
  UIEventBus.emit<OdooPortalReloadRequest>(ODOO_PORTAL_RELOAD_EVENT, {
    clearCache: options.clearCache ?? false,
  });
}
