import { useCommon } from "@sincpro/mobile";
import { BluetoothPrinterSelector } from "@sincpro/mobile/ui/components/organisms";
import { OdooScreen } from "@sincpro/mobile-odoo/entrypoints/ui/AppScreen";
import { FormViewV2 } from "@sincpro/mobile-ui/views/FormViewV2";
import {
  GeoPermissionCard,
  TimeZoneSelector,
} from "@sincpro/mobile-ui/widgets";
import { EVariantScreenHeader } from "@sincpro/mobile-ui/widgets/ScreenHeader";
import { ActivityAction, startActivityAsync } from "expo-intent-launcher";
import { useNavigate } from "react-router-native";

export function SettingsScreen() {
  const navigate = useNavigate();
  const { hasGeoPermission, geoIsLoading, timezone, updateTimezone } =
    useCommon();

  function handleBack() {
    navigate(OdooScreen.PROFILE);
  }

  function handleRequestGeoPermission() {
    startActivityAsync(ActivityAction.LOCATION_SOURCE_SETTINGS);
  }

  return (
    <FormViewV2.Root
      description="Configuraciones de la aplicación"
      item={{}}
      name="Ajustes"
      onBack={handleBack}
    >
      <FormViewV2.Header variant={EVariantScreenHeader.FLAT_HEADER} />

      <FormViewV2.Content>
        <FormViewV2.Content.Group>
          <GeoPermissionCard
            handleRequestPermission={handleRequestGeoPermission}
            hasPermission={hasGeoPermission}
            loading={geoIsLoading}
            title="Permiso de ubicación"
          />
        </FormViewV2.Content.Group>

        <FormViewV2.Content.Group>
          <BluetoothPrinterSelector />
        </FormViewV2.Content.Group>

        <FormViewV2.Content.Group>
          <TimeZoneSelector onSelect={updateTimezone} timezone={timezone} />
        </FormViewV2.Content.Group>
      </FormViewV2.Content>
    </FormViewV2.Root>
  );
}
