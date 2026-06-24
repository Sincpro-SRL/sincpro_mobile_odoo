import { useNavigation } from "@react-navigation/native";
import { useCommon } from "@sincpro/mobile";
import {
  type TimezoneLocale,
  TimeZoneSelectorModal,
} from "@sincpro/mobile/ui/components/molecules";
import { BluetoothPrinterSelector } from "@sincpro/mobile/ui/components/organisms";
import { Display } from "@sincpro/mobile-ui/Display";
import BoxTimeIcon from "@sincpro/mobile-ui/icons/BoxTimeIcon";
import PinIcon from "@sincpro/mobile-ui/icons/PinIcon";
import ToggleOffIcon from "@sincpro/mobile-ui/icons/ToggleOffIcon";
import { useTheme } from "@sincpro/mobile-ui/theme";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { FormViewV2 } from "@sincpro/mobile-ui/views/FormViewV2";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";

function PermissionBadge({ granted }: { granted: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: granted ? theme.successLight : theme.warningLight,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          backgroundColor: granted ? theme.success : theme.warning,
        }}
      />
      <Typography.Text
        semibold
        style={{ color: granted ? theme.success : theme.warning }}
        variant="caption"
      >
        {granted ? "Activo" : "Sin permiso"}
      </Typography.Text>
    </View>
  );
}

const SCHEME_OPTIONS: { value: "light" | "dark" | "system"; label: string }[] =
  [
    { value: "light", label: "Claro" },
    { value: "system", label: "Auto" },
    { value: "dark", label: "Oscuro" },
  ];

function SchemeSelector({
  value,
  onChange,
}: {
  value: "light" | "dark" | "system";
  onChange: (v: "light" | "dark" | "system") => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {SCHEME_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active ? theme.accent : theme.bg.hover,
              borderWidth: 1,
              borderColor: active ? theme.accent : theme.border.light,
            }}
          >
            <Typography.Text
              semibold={active}
              style={{
                color: active ? theme.text.onAccent : theme.text.secondary,
              }}
              variant="caption"
            >
              {opt.label}
            </Typography.Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation();
  const {
    hasGeoPermission,
    timezone,
    updateTimezone,
    requestGeoPermission,
    colorScheme,
    setColorScheme,
  } = useCommon();
  const [tzModalVisible, setTzModalVisible] = useState(false);

  function handleBack() {
    navigation.goBack();
  }

  async function handleRequestGeoPermission() {
    const granted = await requestGeoPermission();
    if (!granted) {
      // Ya denegado previamente → iOS no muestra el popup de nuevo, hay que ir a Settings
      Linking.openURL("app-settings:");
    }
  }

  const displayTimezone = timezone
    ? timezone.replace(/_/g, " ").replace("America/", "")
    : "No configurada";

  function handleTimezoneSelected(tz: TimezoneLocale) {
    updateTimezone(tz);
    setTzModalVisible(false);
  }

  return (
    <FormViewV2.Root
      description="Configuraciones de la aplicación"
      item={{}}
      name="Ajustes"
      onBack={handleBack}
    >
      <FormViewV2.Header variant="large" />

      <FormViewV2.Content>
        <FormViewV2.Content.Section title="Ubicación">
          <Display.MenuButton
            icon={PinIcon}
            label="Permiso de Ubicación"
            onPress={!hasGeoPermission ? handleRequestGeoPermission : undefined}
            rightComponent={<PermissionBadge granted={hasGeoPermission} />}
            showDivider={false}
          />
        </FormViewV2.Content.Section>

        <FormViewV2.Content.Section title="Apariencia">
          <Display.MenuButton
            icon={ToggleOffIcon}
            label="Tema"
            rightComponent={
              <SchemeSelector onChange={setColorScheme} value={colorScheme} />
            }
            showDivider={false}
          />
        </FormViewV2.Content.Section>

        <FormViewV2.Content.Section title="Zona Horaria">
          <Display.MenuButton
            description={displayTimezone}
            icon={BoxTimeIcon}
            label="Zona Horaria"
            onPress={() => setTzModalVisible(true)}
            showDivider={false}
          />
          <TimeZoneSelectorModal
            currentTimezone={timezone ?? null}
            onClose={() => setTzModalVisible(false)}
            onSelect={handleTimezoneSelected}
            visible={tzModalVisible}
          />
        </FormViewV2.Content.Section>

        <FormViewV2.Content.Section title="Impresora">
          <BluetoothPrinterSelector compact />
        </FormViewV2.Content.Section>
      </FormViewV2.Content>
    </FormViewV2.Root>
  );
}
