import { getUserInitials } from "@sincpro/mobile/tools/utils/Initials";
import { Display } from "@sincpro/mobile-ui/Display";
import { useToast } from "@sincpro/mobile-ui/Feedback";
import BoxIcon from "@sincpro/mobile-ui/icons/BoxIcon";
import SettingsIcon from "@sincpro/mobile-ui/icons/SettingsIcon";
import ToggleOffIcon from "@sincpro/mobile-ui/icons/ToggleOffIcon";
import { useTheme } from "@sincpro/mobile-ui/theme";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { FormViewV2 } from "@sincpro/mobile-ui/views/FormViewV2";
import { type ReactNode, useRef, useState } from "react";
import { Switch, TouchableOpacity, View } from "react-native";

import { ProfileProvider, useProfile } from "./profile.context";

function ProfileScreenContent() {
  const theme = useTheme();
  const {
    session,
    authIsLoading,
    debugMode,
    handleLogout,
    handleSettings,
    handleDatabase,
    toggleDebugMode,
  } = useProfile();

  const initials = getUserInitials(session?.name || "U");
  const hasContactFields = !!(
    session?.phone ||
    session?.mobile ||
    session?.vat ||
    session?.city
  );

  return (
    <FormViewV2.Root
      description="Información de tu cuenta"
      isLoading={authIsLoading}
      item={session}
      name="Perfil"
      withContainer={true}
    >
      <FormViewV2.Header
        actions={
          debugMode ? <Display.Chip label="DEV" tone="warning" /> : undefined
        }
        variant="large"
      />

      <FormViewV2.Content>
        {/*
         * Profile card — hero + contact fields in a single card with Divider,
         * matching the canonical FullProfile storybook pattern exactly.
         */}
        <Display.Card
          className="mx-4 mt-2 overflow-hidden"
          elevation="none"
          padding="none"
        >
          {/* Hero: avatar + name + email + role. DevModeActivator wraps only this zone. */}
          <DevModeActivator onActivate={toggleDebugMode}>
            <View className="flex-row items-center p-4 gap-3">
              <Display.Avatar initials={initials} size={52} />
              <View className="flex-1 gap-0.5">
                <Typography.Text semibold variant="h5">
                  {session?.name || "Usuario"}
                </Typography.Text>
                {session?.email && (
                  <Typography.Text
                    className="text-text-secondary"
                    variant="caption"
                  >
                    {session.email}
                  </Typography.Text>
                )}
                {session?.user && (
                  <Typography.Text
                    className="text-text-tertiary"
                    variant="captionSmall"
                  >
                    {session.user}
                  </Typography.Text>
                )}
              </View>
            </View>
          </DevModeActivator>

          {/* Contact fields — same card, below a Divider */}
          {hasContactFields && (
            <>
              <Display.Divider spacing="sm" />
              <View className="px-4 py-3 gap-2.5">
                {session?.phone && (
                  <View className="flex-row items-center">
                    <Typography.Text
                      className="text-text-secondary"
                      style={{ width: 88 }}
                      variant="caption"
                    >
                      Teléfono
                    </Typography.Text>
                    <Typography.Text
                      className="flex-1 text-right"
                      variant="data"
                    >
                      {session.phone}
                    </Typography.Text>
                  </View>
                )}
                {session?.mobile && (
                  <View className="flex-row items-center">
                    <Typography.Text
                      className="text-text-secondary"
                      style={{ width: 88 }}
                      variant="caption"
                    >
                      Celular
                    </Typography.Text>
                    <Typography.Text
                      className="flex-1 text-right"
                      variant="data"
                    >
                      {session.mobile}
                    </Typography.Text>
                  </View>
                )}
                {session?.vat && (
                  <View className="flex-row items-center">
                    <Typography.Text
                      className="text-text-secondary"
                      style={{ width: 88 }}
                      variant="caption"
                    >
                      VAT
                    </Typography.Text>
                    <Typography.Text
                      className="flex-1 text-right"
                      variant="data"
                    >
                      {session.vat}
                    </Typography.Text>
                  </View>
                )}
                {session?.city && (
                  <View className="flex-row items-center">
                    <Typography.Text
                      className="text-text-secondary"
                      style={{ width: 88 }}
                      variant="caption"
                    >
                      Ciudad
                    </Typography.Text>
                    <Typography.Text
                      className="flex-1 text-right"
                      variant="caption"
                    >
                      {session.city}
                    </Typography.Text>
                  </View>
                )}
              </View>
            </>
          )}
        </Display.Card>

        {/* "Cuenta" section — settings + optional debug items */}
        <FormViewV2.Content.Section title="Cuenta">
          <Display.MenuButton
            description="Configuración de la aplicación"
            icon={SettingsIcon}
            label="Ajustes"
            onPress={handleSettings}
            showDivider={!!debugMode}
          />
          {debugMode && (
            <Display.MenuButton
              icon={SettingsIcon}
              label="Modo Debug"
              rightComponent={
                <Switch
                  onValueChange={toggleDebugMode}
                  style={{ transform: [{ scale: 0.85 }] }}
                  thumbColor={theme.bg.card}
                  trackColor={{ false: theme.bg.muted, true: theme.accent }}
                  value={debugMode}
                />
              }
            />
          )}
          {debugMode && (
            <Display.MenuButton
              description="Explorar datos locales"
              icon={BoxIcon}
              label="Ver base de datos"
              onPress={handleDatabase}
              showDivider={false}
            />
          )}
        </FormViewV2.Content.Section>

        {/* Logout — always at the bottom, always separate */}
        <Display.Card className="mx-4" elevation="none" padding="none">
          <Display.MenuButton
            icon={ToggleOffIcon}
            label="Cerrar Sesión"
            onPress={handleLogout}
            showDivider={false}
            variant="danger"
          />
        </Display.Card>
      </FormViewV2.Content>
    </FormViewV2.Root>
  );
}

export function ProfileScreen({ mainRoute }: { mainRoute?: string }) {
  return (
    <ProfileProvider mainRoute={mainRoute}>
      <ProfileScreenContent />
    </ProfileProvider>
  );
}

interface DevModeActivatorProps {
  children: ReactNode;
  onActivate: () => void;
  tapsRequired?: number;
  tapTimeoutMs?: number;
}

function DevModeActivator({
  children,
  onActivate,
  tapsRequired = 6,
  tapTimeoutMs = 1000,
}: DevModeActivatorProps) {
  const [tapCount, setTapCount] = useState(0);
  const lastTapTimeRef = useRef(0);
  const toast = useToast();

  function handleTap() {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    if (timeSinceLastTap > tapTimeoutMs) {
      setTapCount(1);
    } else {
      const newCount = tapCount + 1;
      if (newCount >= tapsRequired) {
        setTapCount(0);
        onActivate();
        toast.success("Modo desarrollador activado", { id: "dev-mode" });
      } else {
        setTapCount(newCount);
        const remaining = tapsRequired - newCount;
        if (remaining <= 3) {
          toast.info("para activar el modo desarrollador", {
            id: "dev-mode",
            title: `Presiona ${remaining} ${remaining === 1 ? "vez" : "veces"} más`,
          });
        }
      }
    }

    lastTapTimeRef.current = now;
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handleTap}>
      {children}
    </TouchableOpacity>
  );
}
