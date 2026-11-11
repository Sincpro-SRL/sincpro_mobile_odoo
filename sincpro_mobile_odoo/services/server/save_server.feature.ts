import { Command } from "@sincpro/client-framework";
import type { IServer } from "@sincpro/mobile-odoo/domain/server";
import {
  Feature,
  odooBoundedContext,
} from "@sincpro/mobile-odoo/infrastructure/framework";

export class CommandSaveServer extends Command<void> {
  constructor(readonly server: IServer) {
    super();
  }
}

/** Keeps the Odoo server the app talks to — replacing the one kept — and points the client at it. */
@odooBoundedContext.feature(CommandSaveServer)
export class SaveServer extends Feature<CommandSaveServer, void> {
  async execute(command: CommandSaveServer): Promise<void> {
    await this.servers.update(command.server);
    this.odoo.setServer(command.server);
    this.span.set({ "odoo.database": command.server.database });
    this.logger.info("Odoo server saved");
  }
}
