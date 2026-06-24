import { useNavigation } from "@react-navigation/native";
import { LoginFormValues } from "@sincpro/mobile-odoo/domain/auth";
import { OdooScreen } from "@sincpro/mobile-odoo/entrypoints/ui/AppScreen";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { Alert } from "react-native";

interface ILoginContext {
  session: ReturnType<typeof useOdoo>["session"];
  authIsLoading: boolean;
  errorMessage: string;
  handleLogin: (data: LoginFormValues) => void;
  handleGoToResetPassword: () => void;
  handleGoToConfigureServer: () => void;
  isServerConfigured: boolean;
}

const LoginContext = createContext<ILoginContext | null>(null);

interface LoginProviderProps {
  children: ReactNode;
}

export function LoginProvider({ children }: LoginProviderProps) {
  const navigation = useNavigation();
  const { session, login, authIsLoading, authError, serverParams } = useOdoo();

  const isServerConfigured = !!serverParams;

  const errorMessage = useMemo(() => {
    return (
      authError ||
      (isServerConfigured
        ? ""
        : "Debe configurar el servidor antes de iniciar sesión.")
    );
  }, [authError, isServerConfigured]);

  const handleLogin = useCallback(
    (data: LoginFormValues) => {
      if (!serverParams) {
        Alert.alert(
          "Error",
          "Debe configurar el servidor antes de iniciar sesión.",
        );
        return;
      }
      login(data.email, data.password);
    },
    [serverParams, login],
  );

  const handleGoToResetPassword = useCallback(() => {
    navigation.navigate(OdooScreen.RESET_ACCOUNT as never);
  }, [navigation]);

  const handleGoToConfigureServer = useCallback(() => {
    navigation.navigate(OdooScreen.SERVER as never);
  }, [navigation]);

  const value = useMemo<ILoginContext>(
    () => ({
      session,
      authIsLoading,
      errorMessage,
      handleLogin,
      handleGoToResetPassword,
      handleGoToConfigureServer,
      isServerConfigured,
    }),
    [
      session,
      authIsLoading,
      errorMessage,
      handleLogin,
      handleGoToResetPassword,
      handleGoToConfigureServer,
      isServerConfigured,
    ],
  );

  return (
    <LoginContext.Provider value={value}>{children}</LoginContext.Provider>
  );
}

export function useLogin(): ILoginContext {
  const context = useContext(LoginContext);
  if (!context) {
    throw new Error("useLogin must be used within LoginProvider");
  }
  return context;
}
