import { Command } from "@sincpro/client-framework";
import type { IServer } from "@sincpro/mobile-odoo/domain/server";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

export class CommandServerParams extends Command<IServer | null> {}

/** The Odoo server kept, or `null` when none is. */
@odooBoundedContext.feature(CommandServerParams)
export class ServerParams extends Feature<CommandServerParams, IServer | null> {
  async execute(): Promise<IServer | null> {
    const server = await this.servers.find();
    this.span.set({ "odoo.server_kept": server !== null });
    return server;
  }
}
