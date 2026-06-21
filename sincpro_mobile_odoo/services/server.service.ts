import { repos } from "@sincpro/mobile/entrypoints/db";
import { loggerUseCases } from "@sincpro/mobile/infrastructure/logger";
import { EOdooRepository } from "@sincpro/mobile-odoo/domain/repository";
import { IServer } from "@sincpro/mobile-odoo/domain/server";
import { getOdooClient } from "@sincpro/mobile-odoo/infrastructure/OdooClient";

class ServerUseCase {
  private get repository() {
    return repos.get(EOdooRepository.SERVER);
  }
  /**
   * Saves the server configuration to the repository.
   */
  async save(server: IServer): Promise<void> {
    loggerUseCases.info("Saving server configuration");
    await this.repository.save(server);
    const odooClient = getOdooClient();
    odooClient.setServer(server);
  }

  /**
   * Retrieves the server configuration from the repository.
   */
  async getServerParams(): Promise<IServer | null> {
    loggerUseCases.info("Retrieving server configuration");
    const server = await this.repository.find();
    if (!server) {
      throw new Error("Server not found");
    }
    return server;
  }

  /**
   * Updates the server configuration in the repository.
   */
  async update(server: IServer): Promise<void> {
    await this.repository.update(server);
  }

  /**
   * Deletes the server configuration from the repository.
   */
  async delete(): Promise<void> {
    loggerUseCases.info("Deleting server configuration");
    await this.repository.delete();
  }
}

export const serverUseCase = new ServerUseCase();
