import { ResetAccount } from "@sincpro/mobile-odoo/ui/components/organisms";
import AuthFormView from "@sincpro/mobile-ui/views/AuthFormView";

export function ResetAccountScreen() {
  return <AuthFormView FormNode={<ResetAccount />} />;
}
