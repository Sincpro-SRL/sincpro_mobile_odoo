import { LoginForm } from "@sincpro/mobile-odoo/ui/components/organisms";
import type { AppBarBackground } from "@sincpro/mobile-ui/Navigation/Navigation.AppBar";
import AuthFormView from "@sincpro/mobile-ui/views/AuthFormView";
import type { ImageSourcePropType } from "react-native";

import { LoginProvider, useLogin } from "./login.context";

function LoginScreenContent({
  logoSource,
  background,
}: {
  logoSource?: ImageSourcePropType;
  background?: AppBarBackground;
}) {
  const {
    authIsLoading,
    errorMessage,
    handleLogin,
    handleGoToResetPassword,
    handleGoToConfigureServer,
    isServerConfigured,
  } = useLogin();

  return (
    <AuthFormView
      background={background}
      description="Agrega tu acceso de usuario."
      FormNode={
        <LoginForm
          configureServer={handleGoToConfigureServer}
          disabled={!isServerConfigured}
          error={errorMessage}
          isLoading={authIsLoading}
          onLogin={handleLogin}
          onResetAccount={handleGoToResetPassword}
        />
      }
      logoSource={logoSource}
      title="Ingresa a tu cuenta"
    />
  );
}

export function LoginScreen({
  logoSource,
  background,
}: { logoSource?: ImageSourcePropType; background?: AppBarBackground } = {}) {
  return (
    <LoginProvider>
      <LoginScreenContent background={background} logoSource={logoSource} />
    </LoginProvider>
  );
}
