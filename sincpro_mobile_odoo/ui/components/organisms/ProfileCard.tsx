import { getUserInitials } from "@sincpro/mobile/tools/utils/Initials";
import type { OdooSession } from "@sincpro/mobile-odoo/domain/auth";
import { Display } from "@sincpro/mobile-ui";
import BoxIcon from "@sincpro/mobile-ui/icons/BoxIcon";
import SettingsIcon from "@sincpro/mobile-ui/icons/SettingsIcon";
import ToggleOffIcon from "@sincpro/mobile-ui/icons/ToggleOffIcon";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { ReactNode, useRef, useState } from "react";
import { Switch, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

interface ProfileCardProps {
  session: OdooSession | null;
  isDebug: boolean;
  onActivateDebug: () => void;
  onToggleDebug: (val: boolean) => void;
  onSettings: () => void;
  onDatabase: () => void;
  onLogout: () => void;
}

export function ProfileCard({
  session,
  isDebug,
  onActivateDebug,
  onToggleDebug,
  onSettings,
  onDatabase,
  onLogout,
}: ProfileCardProps) {
  const initials = getUserInitials(session?.name || "U");

  return (
    <View className="bg-white rounded-2xl overflow-hidden mx-4">
      <DevModeActivator onActivate={onActivateDebug}>
        <View className="flex-row items-center p-4 gap-3">
          <Display.Avatar initials={initials} size={48} />
          <View className="flex-1 gap-0.5">
            <Typography.Text semibold variant="subtitle">
              {session?.name || "Usuario"}
            </Typography.Text>
            {session?.email && (
              <Typography.Text className="text-gray-400" variant="bodySmall">
                {session.email}
              </Typography.Text>
            )}
            {session?.vat && (
              <Typography.Text className="text-gray-400" variant="bodySmall">
                VAT: {session.vat}
              </Typography.Text>
            )}
          </View>
        </View>
      </DevModeActivator>

      {(session?.phone || session?.mobile || session?.city) && (
        <>
          <Display.Divider spacing={"md"} />
          <View className="px-4 py-3 gap-2">
            {session?.phone && (
              <View className="flex-row items-center gap-2">
                <Typography.Text
                  className="text-gray-600 w-20"
                  variant="bodySmall"
                >
                  Teléfono:
                </Typography.Text>
                <Typography.Text variant="bodySmall">
                  {session.phone}
                </Typography.Text>
              </View>
            )}
            {session?.mobile && (
              <View className="flex-row items-center gap-2">
                <Typography.Text
                  className="text-gray-600 w-20"
                  variant="bodySmall"
                >
                  Celular:
                </Typography.Text>
                <Typography.Text variant="bodySmall">
                  {session.mobile}
                </Typography.Text>
              </View>
            )}
            {session?.city && (
              <View className="flex-row items-center gap-2">
                <Typography.Text
                  className="text-gray-600 w-20"
                  variant="bodySmall"
                >
                  Ciudad:
                </Typography.Text>
                <Typography.Text variant="bodySmall">
                  {session.city}
                </Typography.Text>
              </View>
            )}
          </View>
        </>
      )}

      <Display.Divider spacing={"md"} />

      <View className="pt-1">
        <Display.MenuButton
          description="Configuración de la aplicación"
          icon={SettingsIcon}
          label="Ajustes"
          onPress={onSettings}
        />
        {isDebug && (
          <Display.MenuButton
            icon={SettingsIcon}
            label="Modo Debug"
            rightComponent={
              <Switch
                onValueChange={onToggleDebug}
                style={{ transform: [{ scale: 0.85 }] }}
                thumbColor="#ffffff"
                trackColor={{
                  false: "#d1d5db",
                  true: "#f97316",
                }}
                value={isDebug}
              />
            }
          />
        )}
        {isDebug && (
          <Display.MenuButton
            description="Explorar datos locales"
            icon={BoxIcon}
            label="Ver base de datos"
            onPress={onDatabase}
          />
        )}
        <Display.MenuButton
          icon={ToggleOffIcon}
          label="Cerrar Sesión"
          onPress={onLogout}
          showDivider={false}
          variant="danger"
        />
      </View>
    </View>
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
        Toast.hide();
        Toast.show({
          type: "success",
          text1: "Modo desarrollador activado",
        });
      } else {
        setTapCount(newCount);
        const remaining = tapsRequired - newCount;
        if (remaining <= 3) {
          Toast.hide();
          Toast.show({
            type: "info",
            text1: `Presiona ${remaining} ${remaining === 1 ? "vez" : "veces"} más`,
            text2: "para activar el modo desarrollador",
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
