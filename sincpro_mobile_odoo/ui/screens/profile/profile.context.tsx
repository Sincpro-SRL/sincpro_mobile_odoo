import { useNavigation } from "@react-navigation/native";
import type { LogLayer } from "@sincpro/client-framework";
import { useCommon } from "@sincpro/mobile/entrypoints/ui/common_provider";
import { OdooScreen } from "@sincpro/mobile-odoo/entrypoints/ui/AppScreen";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import { useConfirmationContext } from "@sincpro/mobile-ui/Dialog/Confirmation.context";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";

interface IProfileContext {
  session: ReturnType<typeof useOdoo>["session"];
  authIsLoading: boolean;
  debugMode: boolean;
  logLayers: Record<LogLayer, boolean>;
  setLogLayerEnabled: (layer: LogLayer, enabled: boolean) => Promise<void>;
  resetLogLayers: () => Promise<void>;
  handleLogout: () => void;
  handleSettings: () => void;
  handleDatabase: () => void;
  handleAssignedEquipment: () => void;
  handleBack: () => void;
  toggleDebugMode: () => Promise<void>;
}

const ProfileContext = createContext<IProfileContext | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
  mainRoute?: string;
}

export function ProfileProvider({
  children,
  mainRoute = "Main",
}: ProfileProviderProps) {
  const navigation = useNavigation();
  const { show } = useConfirmationContext();
  const { session, authIsLoading, logout } = useOdoo();
  const {
    debugMode,
    toggleDebugMode,
    logLayers,
    setLogLayerEnabled,
    resetLogLayers,
  } = useCommon();

  const handleLogout = useCallback(() => {
    show({
      title: "Cerrar sesión",
      message:
        "¿Estás seguro de que quieres cerrar sesión?\nAl cerrar sesión, los datos de tu sesión se perderán",
      confirmText: "Cerrar sesión",
      cancelText: "Cancelar",
      destructive: true,
      onConfirm: async () => {
        await logout();
      },
    });
  }, [show, logout]);

  const handleSettings = useCallback(() => {
    navigation.navigate(OdooScreen.SETTINGS as never);
  }, [navigation]);

  const handleDatabase = useCallback(() => {
    navigation.navigate(OdooScreen.DATABASE_LIST as never);
  }, [navigation]);

  const handleAssignedEquipment = useCallback(() => {
    // equipment navigation not yet implemented
  }, []);

  const handleBack = useCallback(() => {
    navigation.navigate(mainRoute as never);
  }, [navigation, mainRoute]);

  const value = useMemo<IProfileContext>(
    () => ({
      session,
      authIsLoading,
      debugMode,
      logLayers,
      setLogLayerEnabled,
      resetLogLayers,
      handleLogout,
      handleSettings,
      handleDatabase,
      handleAssignedEquipment,
      handleBack,
      toggleDebugMode,
    }),
    [
      session,
      authIsLoading,
      debugMode,
      logLayers,
      setLogLayerEnabled,
      resetLogLayers,
      handleLogout,
      handleSettings,
      handleDatabase,
      handleAssignedEquipment,
      handleBack,
      toggleDebugMode,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): IProfileContext {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return context;
}
