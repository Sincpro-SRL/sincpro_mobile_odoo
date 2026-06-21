import { ProfileCard } from "@sincpro/mobile-odoo/ui/components/organisms";
import { FormViewV2 } from "@sincpro/mobile-ui/views/FormViewV2";
import { EVariantScreenHeader } from "@sincpro/mobile-ui/widgets/ScreenHeader";
import type { ImageSourcePropType } from "react-native";

import { ProfileProvider, useProfile } from "./profile.context";

function ProfileScreenContent({
  logoSource,
}: {
  logoSource?: ImageSourcePropType;
}) {
  const {
    session,
    authIsLoading,
    debugMode,
    handleLogout,
    handleSettings,
    handleDatabase,
    handleBack,
    toggleDebugMode,
  } = useProfile();

  return (
    <FormViewV2.Root
      description="Información de tu cuenta"
      isLoading={authIsLoading}
      item={session}
      name="Perfil"
      onBack={handleBack}
      withContainer={false}
    >
      <FormViewV2.Header
        logoSource={logoSource}
        variant={EVariantScreenHeader.LOGO_WITH_BACK_BUTTON}
      />

      <FormViewV2.Content withMargin={false}>
        <ProfileCard
          isDebug={debugMode}
          onActivateDebug={toggleDebugMode}
          onDatabase={handleDatabase}
          onLogout={handleLogout}
          onSettings={handleSettings}
          onToggleDebug={toggleDebugMode}
          session={session}
        />
      </FormViewV2.Content>
    </FormViewV2.Root>
  );
}

export function ProfileScreen({
  mainRoute,
  logoSource,
}: {
  mainRoute?: string;
  logoSource?: ImageSourcePropType;
}) {
  return (
    <ProfileProvider mainRoute={mainRoute}>
      <ProfileScreenContent logoSource={logoSource} />
    </ProfileProvider>
  );
}
