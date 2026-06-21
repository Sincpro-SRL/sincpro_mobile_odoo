import { AuthRepository } from "@sincpro/mobile-odoo/adapters/repositories/auth.repository";
import { ServerRepository } from "@sincpro/mobile-odoo/adapters/repositories/server.repository";
import { EOdooRepository } from "@sincpro/mobile-odoo/domain/repository";

const OdooRepositoryRegistry = {
  [EOdooRepository.AUTH]: AuthRepository,
  [EOdooRepository.SERVER]: ServerRepository,
};

export type OdooRepositoryTypeMap = {
  [EOdooRepository.AUTH]: typeof AuthRepository;
  [EOdooRepository.SERVER]: typeof ServerRepository;
};

export default OdooRepositoryRegistry;
