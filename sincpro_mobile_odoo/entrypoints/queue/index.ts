/**
 * Odoo's event handlers — the entrypoints the queue delivers its events to: each translates an
 * event into a Command of `odooBoundedContext`. Importing this registers them.
 */
export { OnOdooLoggedOut } from "@sincpro/mobile-odoo/entrypoints/queue/logged_out.handler";
