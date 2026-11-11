import { logger } from "@sincpro/client-framework";
import { WebViewAdapter } from "@sincpro/mobile/adapters/webview.adapter";
import { errorAttributes } from "@sincpro/mobile/infrastructure/logger";
import { UIEventBus } from "@sincpro/mobile/infrastructure/ui/UIEventBus";
import { webViewService } from "@sincpro/mobile/services/webview.service";
import {
  InjectableWebView,
  type InjectableWebViewHandle,
} from "@sincpro/mobile/ui/components/organisms";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import { Feedback } from "@sincpro/mobile-ui/Feedback";
import { FormViewV2 } from "@sincpro/mobile-ui/views/FormViewV2";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { WebViewMessageEvent } from "react-native-webview";

import {
  ODOO_PORTAL_RELOAD_EVENT,
  type OdooPortalReloadRequest,
} from "./odoo_portal.reload";

/**
 * Odoo inside the app. It keeps the WebView's HTTP cache: Odoo fingerprints its assets, so a
 * visit only downloads what changed. The host reloads it with `reloadOdooPortal()`.
 */
export function OdooPortalScreen() {
  const { serverParams } = useOdoo();
  const webViewRef = useRef<InjectableWebViewHandle>(null);

  useEffect(
    () =>
      UIEventBus.on<OdooPortalReloadRequest>(
        ODOO_PORTAL_RELOAD_EVENT,
        (request) => {
          if (request?.clearCache) {
            webViewRef.current?.clearCacheAndReload();
            return;
          }
          webViewRef.current?.reload();
        },
        { debounce: false },
      ),
    [],
  );

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

  // The framework owns the whole print cycle (started, image, failed), so a print from the
  // portal always shows as a process or as an error with a way to the printer screen.
  function handleWebViewMessage(event: WebViewMessageEvent) {
    webViewService
      .handleMessage(event.nativeEvent.data)
      .catch((error: unknown) =>
        logger.error(
          "The portal's print message could not be handled",
          errorAttributes(error),
        ),
      );
  }

  // The WebView tells the user when the portal does not load: here it is only logged.
  function handleError(error: unknown) {
    logger.error("Odoo portal did not load", errorAttributes(error));
  }

  return (
    <View className="flex-1">
      <InjectableWebView
        label="Odoo"
        maxRetries={3}
        onError={handleError}
        onMessage={handleWebViewMessage}
        ref={webViewRef}
        scripts={[WebViewAdapter.printInterceptor]}
        url={url}
      />
    </View>
  );
}
