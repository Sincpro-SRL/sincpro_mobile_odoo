import { NetworkAdapter } from "@sincpro/mobile/adapters/Network.adapter";
import {
  InternetIsDownEvent,
  InternetIsUpEvent,
} from "@sincpro/mobile/domain/events";
import {
  BackendError,
  DomainBackendError,
  DomainNetworkError,
  UserError,
  ValidationError,
} from "@sincpro/mobile/exceptions";
import logger, {
  loggerOdooClient,
} from "@sincpro/mobile/infrastructure/logger";
import { UIEventBus } from "@sincpro/mobile/infrastructure/ui/UIEventBus";
import { IServer } from "@sincpro/mobile-odoo/domain/server";
import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";

export interface IHttpRequestOptions {
  method: Method;
  url: string;
  headers?: Record<string, string>;
  data?: any;
  params?: any;
  timeout?: number;
  useBaseUrl?: boolean;
}

type CommonMethods =
  | {
      service: "common";
      method: "login";
      args: [string, string, string];
      result: number;
    }
  | {
      service: "common";
      method: "version";
      args: [];
      result: {
        server_version: string;
        server_version_info: [number, number, number, string, number];
        server_serie: string;
      };
    };

type ObjectMethods = {
  service: "object";
  method: "execute_kw";
  args: [string, number, string, string, string, any[], object];
  result: any;
};

type RpcMethod = CommonMethods | ObjectMethods;

type JsonRpcParams = {
  service: string;
  method: string;
  args: any[];
};

type JsonRpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
};

interface IOdooContext {
  allowed_company_ids?: number[];
  current_company_id?: number;
}

export interface IQueryOptions {
  limit?: number;
  offset?: number;
  order?: string;
  context?: IOdooContext | object;
}

export interface IRecordResult<T> {
  length: number;
  records: T[];
}

export class OdooClient {
  private baseUrl: string | null;
  private url: string | null;
  private db: string | null;
  private user: string | null;
  private pass: string | null;
  private uid: number | null = null;
  private context: IOdooContext | object = {};

  private sessionExpiresAt: number = 0;
  private static readonly SESSION_TTL_MS = 50000;

  private static readonly REQUEST_TIMEOUT_MS = 35000;
  private static readonly AXIOS_CONFIG = {
    timeout: OdooClient.REQUEST_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/json",
      Connection: "close",
    },
    httpAgent: false,
    httpsAgent: false,
  };

  constructor() {
    this.baseUrl = null;
    this.url = null;
    this.db = null;
    this.user = null;
    this.pass = null;
  }

  private mapOdooErrorToException(error: {
    code: number;
    message: string;
    data?: { name?: string; message?: string };
  }): never {
    const errorType = error.data?.name;
    const message = error.data?.message || error.message;

    if (errorType === "odoo.exceptions.UserError") {
      return UserError(message);
    }

    if (errorType === "odoo.exceptions.ValidationError") {
      return ValidationError(message);
    }

    return BackendError(message);
  }

  private createFreshAxiosInstance() {
    if (!this.url) {
      throw new Error("URL not configured for Odoo client");
    }

    return axios.create({
      baseURL: this.url,
      ...OdooClient.AXIOS_CONFIG,
    });
  }

  async httpRequest<T = any>(
    options: IHttpRequestOptions,
  ): Promise<AxiosResponse<T>> {
    const networkStatus = await NetworkAdapter.getStatus();

    if (!networkStatus.isInternetReachable) {
      loggerOdooClient.warn(
        "Network is not connected. Cannot perform HTTP request.",
      );
      UIEventBus.emit(InternetIsDownEvent.name);
      throw new DomainNetworkError("Sin conexión a Internet");
    }

    UIEventBus.emit(InternetIsUpEvent.name);

    const config: AxiosRequestConfig = {
      ...OdooClient.AXIOS_CONFIG,
      method: options.method,
      url: options.url,
      data: options.data,
      params: options.params,
      headers: {
        ...OdooClient.AXIOS_CONFIG.headers,
        ...options.headers,
      },
      timeout: options.timeout || OdooClient.REQUEST_TIMEOUT_MS,
    };

    try {
      loggerOdooClient.info(
        `HTTP ${options.method} request to: ${options.url}`,
      );

      let response: AxiosResponse<T>;

      if (options.useBaseUrl && this.baseUrl) {
        const axiosInstance = axios.create({
          baseURL: this.baseUrl,
          ...config,
        });
        response = await axiosInstance.request<T>(config);
      } else {
        response = await axios.request<T>(config);
      }

      loggerOdooClient.info(
        `HTTP ${options.method} response from ${options.url}: ${response.status}`,
      );
      return response;
    } catch (error: any) {
      if (
        error?.isAxiosError &&
        ["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT"].includes(error.code)
      ) {
        loggerOdooClient.warn(`HTTP request timeout after ${config.timeout}ms`);
        UIEventBus.emit(InternetIsDownEvent.name);
        throw new DomainNetworkError(
          "Tiempo de espera agotado. Revisa tu conexión o problemas de servidor",
        );
      }
      loggerOdooClient.warn(`HTTP request error:`, error.message);
      throw error;
    }
  }

  async httpRequestToServer<T = any>(
    method: Method,
    path: string,
    data?: any,
    headers?: Record<string, string>,
    timeout?: number,
  ): Promise<AxiosResponse<T>> {
    if (!this.baseUrl) {
      throw new Error(
        "Server not configured. Please set server before making requests.",
      );
    }

    const networkStatus = await NetworkAdapter.getStatus();

    if (!networkStatus.isInternetReachable) {
      loggerOdooClient.warn(
        "Network is not connected. Cannot perform HTTP request.",
      );
      UIEventBus.emit(InternetIsDownEvent.name);
      throw new DomainNetworkError("Sin conexión a Internet");
    }

    UIEventBus.emit(InternetIsUpEvent.name);

    const config: AxiosRequestConfig = {
      ...OdooClient.AXIOS_CONFIG,
      method,
      data,
      headers: {
        ...OdooClient.AXIOS_CONFIG.headers,
        ...headers,
      },
      timeout: timeout || OdooClient.REQUEST_TIMEOUT_MS,
    };

    try {
      const axiosInstance = axios.create({
        baseURL: this.baseUrl,
        ...config,
      });

      const normalizedPath = `${this.baseUrl?.replace(/\/$/, "") || ""}/${path.replace(/^\//, "")}`;
      const url = path;
      loggerOdooClient.info(`HTTP ${method} request to: ${normalizedPath}`);

      const response = await axiosInstance.request<T>({
        ...config,
        url,
      });

      loggerOdooClient.info(
        `HTTP ${method} response from ${normalizedPath}: ${response.status}`,
      );
      return response;
    } catch (error: any) {
      if (
        error?.isAxiosError &&
        ["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT"].includes(error.code)
      ) {
        loggerOdooClient.warn(`HTTP request timeout after ${config.timeout}ms`);
        UIEventBus.emit(InternetIsDownEvent.name);
        throw new DomainNetworkError(
          "Tiempo de espera agotado. Revisa tu conexión o problemas de servidor",
        );
      }
      loggerOdooClient.warn(`HTTP request error:`, error.message);
      throw new DomainBackendError(
        `Error during HTTP request to server to ${path}: ${error.message}`,
      );
    }
  }

  private async jsonRpc<T>(method: string, params: JsonRpcParams): Promise<T> {
    const networkStatus = await NetworkAdapter.getStatus();

    if (!networkStatus.isInternetReachable) {
      loggerOdooClient.warn(
        "Network is not connected. Cannot perform Odoo RPC call.",
      );
      UIEventBus.emit(InternetIsDownEvent.name);
      throw new DomainNetworkError("Sin conexión a Internet");
    }

    UIEventBus.emit(InternetIsUpEvent.name);

    const payload = {
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now(),
    };

    try {
      const axiosInstance = this.createFreshAxiosInstance();
      const { data } = await axiosInstance.post<JsonRpcResponse<T>>(
        "",
        payload,
      );

      if (data.error) {
        logger.warn(`Request payload:`, JSON.stringify(payload, null, 2));
        loggerOdooClient.warn(
          `Odoo error:`,
          data.error.message,
          JSON.stringify(data.error, null, 2),
        );
        return this.mapOdooErrorToException(data.error);
      }
      return data.result as T;
    } catch (error: any) {
      if (
        error?.isAxiosError &&
        ["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT"].includes(error.code)
      ) {
        loggerOdooClient.warn(
          `Request timeout after ${OdooClient.REQUEST_TIMEOUT_MS}ms`,
        );
        UIEventBus.emit(InternetIsDownEvent.name);
        throw new DomainNetworkError(
          "Tiempo de espera agotado. Revisa tu conexión o problemas de servidor",
        );
      }
      throw error;
    }
  }

  get urlOdoo(): string | null {
    return this.url;
  }

  get database(): string | null {
    return this.db;
  }

  get isConfigured(): boolean {
    return (
      this.url !== null &&
      this.db !== null &&
      this.user !== null &&
      this.pass !== null
    );
  }

  get defaultCompanyId(): number | null {
    return this.context && "current_company_id" in this.context
      ? (this.context as IOdooContext).current_company_id || null
      : null;
  }

  setServer(server: IServer) {
    let url = server.server;
    if (
      server.server.includes("http://") ||
      server.server.includes("https://")
    ) {
      url = `${server.server}/jsonrpc`;
    } else {
      // For now always use https
      url = `https://${server.server}/jsonrpc`;
    }
    this.url = url;
    this.db = server.database;
    this.baseUrl = server.server;

    loggerOdooClient.info(
      `Configured Odoo server: ${url} with database: ${server.database}`,
    );
  }

  setUser(user: string, pass: string): void {
    this.user = user;
    this.pass = pass;
  }

  setUserContext(
    defaultCompanyId: number,
    companyIds: number[],
    lang: string | boolean,
  ): void {
    this.context = {
      allowed_company_ids: companyIds,
      current_company_id: defaultCompanyId,
      lang: lang,
    };
  }

  async call<M extends RpcMethod>(
    service: M["service"],
    method: M["method"],
    args: M["args"],
  ): Promise<M["result"]> {
    loggerOdooClient.info(
      `Calling Odoo method ${service}.${method} with args:`,
      JSON.stringify(args, null, 2),
    );
    const result = await this.jsonRpc<M["result"]>("call", {
      service,
      method,
      args,
    });

    loggerOdooClient.info(
      `Result of service ${service}.${method}:`,
      JSON.stringify(result, null, 2),
    );
    return result;
  }

  /**
   * Checks if current session is still valid based on TTL
   */
  private isSessionValid(): boolean {
    return this.uid !== null && Date.now() < this.sessionExpiresAt;
  }

  /**
   * Extends session expiration time when session is actively used
   */
  private extendSession(): void {
    this.sessionExpiresAt = Date.now() + OdooClient.SESSION_TTL_MS;
  }

  /**
   * Invalidates current session
   */
  private invalidateSession(): void {
    this.uid = null;
    this.sessionExpiresAt = 0;
  }

  async authenticate(): Promise<number> {
    // Return cached uid if session is still valid
    if (this.isSessionValid()) {
      loggerOdooClient.debug(
        `Using cached session for user ${this.user}, uid: ${this.uid}`,
      );
      this.extendSession(); // Extend session on active use - keeps user interactive
      return this.uid!;
    }

    // Session expired or doesn't exist - silently create new one
    if (!this.isConfigured) {
      throw new Error(
        "Odoo client is not configured. Please set server and user credentials.",
      );
    }

    // Log session renewal as info only if previous session existed, debug otherwise
    const wasSessionActive = this.uid !== null;
    if (wasSessionActive) {
      loggerOdooClient.info(
        `Renewing session for user ${this.user} (previous session expired)`,
      );
    } else {
      loggerOdooClient.debug(`Creating initial session for user ${this.user}`);
    }

    try {
      const uid = await this.call("common", "login", [
        this.db!,
        this.user!,
        this.pass!,
      ]);

      if (!uid) {
        throw new Error(
          `Invalid credentials for user ${this.user} or database ${this.db}`,
        );
      }

      this.uid = uid;
      this.extendSession();
      loggerOdooClient.debug(
        `Session established for user ${this.user}, uid: ${uid}`,
      );

      return uid;
    } catch (error) {
      this.invalidateSession();
      throw error;
    }
  }

  cleanCredentials(): void {
    // Clean user session data but keep server configuration
    this.invalidateSession();
    this.context = {};
    this.user = null;
    this.pass = null;

    loggerOdooClient.info("Cleaned user credentials and session data");
  }

  async callModel<T>(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: object = {},
    context: IOdooContext | object = {},
  ): Promise<T> {
    try {
      const uid = await this.authenticate();
      const odooContext = {
        ...this.context,
        ...context,
      };

      const result = await this.call("object", "execute_kw", [
        this.db!,
        uid,
        this.pass!,
        model,
        method,
        args,
        { ...kwargs, context: odooContext },
      ]);

      return result as T;
    } catch (error: any) {
      // If authentication failed, silently invalidate session for next retry
      if (
        error.message?.includes("Invalid") ||
        error.message?.includes("credentials")
      ) {
        loggerOdooClient.warn(
          `Authentication error detected for ${model}.${method}, session invalidated silently`,
        );
        this.invalidateSession();
      }
      throw error;
    }
  }

  async queryModel<T>(
    model: string,
    domain: any[] = [],
    fields: object = { id: {} },
    queryOptions: IQueryOptions = {},
  ): Promise<IRecordResult<T>> {
    try {
      const uid = await this.authenticate();
      return this.call("object", "execute_kw", [
        this.db!,
        uid,
        this.pass!,
        model,
        "web_search_read",
        [domain],
        {
          specification: fields,
          ...queryOptions,
          context: {
            ...this.context,
            ...queryOptions.context,
          },
        },
      ]);
    } catch (error: any) {
      // If authentication failed, silently invalidate session for next retry
      // Odoo JSON-RPC error responses include a code field; use it for reliable detection
      const errorCode =
        error?.code ?? error?.response?.data?.error?.code ?? error?.error?.code;
      // Odoo authentication errors typically use code 100 (Access Denied) or 1 (generic)
      if (errorCode === 100 || errorCode === 1) {
        loggerOdooClient.warn(
          `Authentication error detected for ${model} query, session invalidated silently`,
        );
        this.invalidateSession();
      }

      loggerOdooClient.warn(`Error querying model ${model}:`, error);
      return {
        length: 0,
        records: [],
      };
    }
  }
}

let OdooClientInstance: OdooClient | null = null;

export function getOdooClient(): OdooClient {
  if (OdooClientInstance) {
    return OdooClientInstance;
  }
  OdooClientInstance = new OdooClient();
  return OdooClientInstance!;
}
