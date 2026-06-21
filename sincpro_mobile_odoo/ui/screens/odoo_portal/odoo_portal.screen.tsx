import { WebViewAdapter } from "@sincpro/mobile/adapters/webview.adapter";
import { WebViewMessageReceivedEvent } from "@sincpro/mobile/domain/webview/events";
import { loggerUseCases } from "@sincpro/mobile/infrastructure/logger";
import { UI_NOTIFICATION_EVENT } from "@sincpro/mobile/infrastructure/ui/events";
import { UIEventBus } from "@sincpro/mobile/infrastructure/ui/UIEventBus";
import { EventBus } from "@sincpro/mobile/infrastructure/workers";
import { InjectableWebView } from "@sincpro/mobile/ui/components/organisms";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import { Typography } from "@sincpro/mobile-ui/Typography";
import { FormViewV2 } from "@sincpro/mobile-ui/views/FormViewV2";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { WebViewMessageEvent } from "react-native-webview";

export function OdooPortalScreen() {
  const { serverParams } = useOdoo();
  const [hardRefreshKey, setHardRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setHardRefreshKey((prev) => prev + 1);
    UIEventBus.on("tickets:odoo:reload", handler);
    return () => UIEventBus.off("tickets:odoo:reload", handler);
  }, []);

  if (!serverParams?.server) {
    return (
      <FormViewV2.Root isLoading={false} item={null} name="Portal Odoo">
        <FormViewV2.Content>
          <FormViewV2.Content.Groups>
            <FormViewV2.Content.Group>
              <Typography.Text className="text-gray-600">
                No hay servidor configurado. Por favor, inicia sesión primero.
              </Typography.Text>
            </FormViewV2.Content.Group>
          </FormViewV2.Content.Groups>
        </FormViewV2.Content>
      </FormViewV2.Root>
    );
  }

  const url = serverParams.server.startsWith("http")
    ? serverParams.server
    : `https://${serverParams.server}`;

  function handleWebViewMessage(event: WebViewMessageEvent) {
    const rawData = event.nativeEvent.data;

    EventBus.publish(
      WebViewMessageReceivedEvent.create({
        raw: rawData,
        source: url,
      }),
    );
  }

  function handleError(error: unknown) {
    loggerUseCases.error("Error al cargar Odoo Portal:", error);
    UIEventBus.emit(UI_NOTIFICATION_EVENT, {
      type: "error",
      text1: "Error al cargar página",
      text2: "Reintentando automáticamente...",
    });
  }

  return (
    <View className="flex-1">
      <InjectableWebView
        hardRefreshKey={hardRefreshKey}
        maxRetries={3}
        onError={handleError}
        onMessage={handleWebViewMessage}
        scripts={[WebViewAdapter.printInterceptor]}
        url={url}
        useDefaultCache={false}
      />
    </View>
  );
}
