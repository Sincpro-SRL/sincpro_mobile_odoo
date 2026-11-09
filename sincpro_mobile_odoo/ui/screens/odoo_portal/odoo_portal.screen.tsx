import { WebViewAdapter } from "@sincpro/mobile/adapters/webview.adapter";
import { loggerUseCases } from "@sincpro/mobile/infrastructure/logger";
import { UIEventBus } from "@sincpro/mobile/infrastructure/ui/UIEventBus";
import { printerService } from "@sincpro/mobile/services/printer.service";
import { webViewService } from "@sincpro/mobile/services/webview.service";
import { InjectableWebView } from "@sincpro/mobile/ui/components/organisms";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import { Feedback, useToast } from "@sincpro/mobile-ui/Feedback";
import { FormViewV2 } from "@sincpro/mobile-ui/views/FormViewV2";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { WebViewMessageEvent } from "react-native-webview";

export function OdooPortalScreen() {
  const { serverParams } = useOdoo();
  const toast = useToast();
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
              <Feedback.EmptyState
                description="Por favor, inicia sesión primero."
                title="No hay servidor configurado"
              />
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
    const parsed = webViewService.parseMessage(rawData);
    if (!parsed || !webViewService.isPrintImage(parsed)) return;

    void printerService.enqueuePrintImage({
      imageBase64: parsed.image,
      width: parsed.width,
      height: parsed.height,
      title: parsed.metadata.title,
    });
  }

  function handleError(error: unknown) {
    loggerUseCases.error("Error al cargar Odoo Portal:", error);
    toast.danger("Reintentando automáticamente...", {
      title: "Error al cargar página",
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
