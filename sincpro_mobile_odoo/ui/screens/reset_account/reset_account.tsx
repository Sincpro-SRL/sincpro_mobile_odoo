import { ResetAccount } from "@sincpro/mobile-odoo/ui/components/organisms";
import type { AppBarBackground } from "@sincpro/mobile-ui/Navigation/Navigation.AppBar";
import AuthFormView from "@sincpro/mobile-ui/views/AuthFormView";
import type { ImageSourcePropType } from "react-native";

export function ResetAccountScreen({
  logoSource,
  background,
}: {
  logoSource?: ImageSourcePropType;
  background?: AppBarBackground;
}) {
  return (
    <AuthFormView
      background={background}
      FormNode={<ResetAccount />}
      logoSource={logoSource}
    />
  );
}
