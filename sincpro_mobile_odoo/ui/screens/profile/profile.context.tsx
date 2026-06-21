import { OdooScreen } from "@sincpro/mobile-odoo/entrypoints/ui/AppScreen";
import { useOdoo } from "@sincpro/mobile-odoo/entrypoints/ui/context";
import { useConfirmationContext } from "@sincpro/mobile-ui/Dialog/Confirmation.context";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-native";

interface IProfileContext {
  session: ReturnType<typeof useOdoo>["session"];
  authIsLoading: boolean;
  debugMode: boolean;
  handleLogout: () => void;
  handleSettings: () => void;
  handleDatabase: () => void;
  handleAssignedEquipment: () => void;
  handleBack: () => void;
  toggleDebugMode: () => void;
}

const ProfileContext = createContext<IProfileContext | null>(null);

interface ProfileProviderProps {
  children: ReactNode;
  mainRoute?: string;
}

export function ProfileProvider({
  children,
  mainRoute = "/",
}: ProfileProviderProps) {
  const navigate = useNavigate();
  const { show, hide } = useConfirmationContext();
  const { session, authIsLoading, logout } = useOdoo();
  const [debugMode, setDebugMode] = useState(false);

  const toggleDebugMode = useCallback(() => {
    setDebugMode((value) => !value);
  }, []);

  const handleLogout = useCallback(() => {
    show({
      title: "Cerrar sesión",
      message:
        "¿Estás seguro de que quieres cerrar sesión?\nAl cerrar sesión, los datos de tu sesión se perderán",
      confirmText: "Cerrar sesión",
      cancelText: "Cancelar",
      onConfirm: async () => {
        hide();
        await logout();
        navigate(OdooScreen.LOGIN);
      },
      onCancel: () => hide(),
    });
  }, [show, hide, logout, navigate]);

  const handleSettings = useCallback(() => {
    navigate(OdooScreen.SETTINGS);
  }, [navigate]);

  const handleDatabase = useCallback(() => {
    navigate(OdooScreen.DATABASE_LIST);
  }, [navigate]);

  const handleAssignedEquipment = useCallback(() => {
    console.log("Navigate to assigned equipment");
  }, []);

  const handleBack = useCallback(() => {
    navigate(mainRoute);
  }, [navigate, mainRoute]);

  const value = useMemo<IProfileContext>(
    () => ({
      session,
      authIsLoading,
      debugMode,
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
