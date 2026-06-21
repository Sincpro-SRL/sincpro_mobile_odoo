import { LoginForm } from "@sincpro/mobile-odoo/ui/components/organisms";
import AuthFormView from "@sincpro/mobile-ui/views/AuthFormView";
import type { ImageSourcePropType } from "react-native";

import { LoginProvider, useLogin } from "./login.context";

function LoginScreenContent({
  logoSource,
}: {
  logoSource?: ImageSourcePropType;
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
      description="Agrega tu acceso de usuario."
      FormNode={
        <LoginForm
          configureServer={handleGoToConfigureServer}
          error={errorMessage}
          isLoading={authIsLoading}
          onLogin={handleLogin}
          onResetAccount={handleGoToResetPassword}
          readonly={!isServerConfigured}
        />
      }
      logoSource={logoSource}
      title="Ingresa a tu cuenta"
    />
  );
}

export function LoginScreen({
  logoSource,
}: { logoSource?: ImageSourcePropType } = {}) {
  return (
    <LoginProvider>
      <LoginScreenContent logoSource={logoSource} />
    </LoginProvider>
  );
}
