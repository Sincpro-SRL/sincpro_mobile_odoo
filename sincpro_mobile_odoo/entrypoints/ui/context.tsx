import { OdooSession } from "@sincpro/mobile-odoo/domain/auth";
import { IServer } from "@sincpro/mobile-odoo/domain/server";
import { odooAuthService } from "@sincpro/mobile-odoo/services/auth.service";
import { serverUseCase } from "@sincpro/mobile-odoo/services/server.service";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface IOdooContext {
  reset: () => void;
  session: OdooSession | null;
  authIsLoading: boolean;
  authError: string | null;
  login: (user: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  serverParams: IServer | null;
  serverIsLoading: boolean;
  loadServerParams: () => Promise<void>;
  setServerParams: (server: IServer) => Promise<void>;
  deleteServerParams: () => Promise<void>;
}

const OdooContext = createContext<IOdooContext | null>(null);

interface OdooProviderProps {
  children: ReactNode;
}

export function OdooProvider({ children }: OdooProviderProps) {
  const [session, setSession] = useState<OdooSession | null>(null);
  const [authIsLoading, setAuthIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [serverParams, setServerParamsState] = useState<IServer | null>(null);
  const [serverIsLoading, setServerIsLoading] = useState(false);

  const login = useCallback(async (user: string, pass: string) => {
    setAuthIsLoading(true);
    setAuthError(null);
    try {
      const result = await odooAuthService.login(user, pass);
      setSession(result);
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setAuthIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthIsLoading(true);
    try {
      await odooAuthService.logout();
      setSession(null);
      setAuthError(null);
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setAuthIsLoading(false);
    }
  }, []);

  const loadSession = useCallback(async () => {
    setAuthIsLoading(true);
    setAuthError(null);
    try {
      const result = await odooAuthService.loadSession();
      setSession(result);
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setAuthIsLoading(false);
    }
  }, []);

  const loadServerParams = useCallback(async () => {
    setServerIsLoading(true);
    try {
      const server = await serverUseCase.getServerParams();
      setServerParamsState(server);
    } catch {
      setServerParamsState(null);
    } finally {
      setServerIsLoading(false);
    }
  }, []);

  const setServerParams = useCallback(async (server: IServer) => {
    setServerIsLoading(true);
    try {
      try {
        await serverUseCase.update(server);
      } catch {
        await serverUseCase.save(server);
      }
      setServerParamsState(server);
    } finally {
      setServerIsLoading(false);
    }
  }, []);

  const deleteServerParams = useCallback(async () => {
    setServerIsLoading(true);
    try {
      await serverUseCase.delete();
      setServerParamsState(null);
    } finally {
      setServerIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSession(null);
    setAuthIsLoading(false);
    setAuthError(null);
    setServerParamsState(null);
    setServerIsLoading(false);
  }, []);

  const value = useMemo<IOdooContext>(
    () => ({
      reset,
      session,
      authIsLoading,
      authError,
      login,
      logout,
      loadSession,
      serverParams,
      serverIsLoading,
      loadServerParams,
      setServerParams,
      deleteServerParams,
    }),
    [
      reset,
      session,
      authIsLoading,
      authError,
      login,
      logout,
      loadSession,
      serverParams,
      serverIsLoading,
      loadServerParams,
      setServerParams,
      deleteServerParams,
    ],
  );

  return <OdooContext.Provider value={value}>{children}</OdooContext.Provider>;
}

export function useOdoo(): IOdooContext {
  const ctx = useContext(OdooContext);
  if (!ctx) throw new Error("useOdoo must be used within OdooProvider");
  return ctx;
}
