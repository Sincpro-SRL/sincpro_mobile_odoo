import {
  CircuitBreaker,
  countedByDefault,
  type DeclaredFailure,
  failureOf,
  kindOfHttpStatus,
  kindOfJsonRpcCode,
  loggerAdapter,
} from "@sincpro/client-framework";
import { NetworkAdapter } from "@sincpro/mobile/adapters/Network.adapter";
import {
  InternetIsDownEvent,
  InternetIsUpEvent,
} from "@sincpro/mobile/domain/events";
import {
  DomainBackendError,
  DomainException,
  DomainNetworkError,
  DomainUserError,
  DomainValidationError,
  RepeatableFailure,
} from "@sincpro/mobile/exceptions";
import { errorAttributes } from "@sincpro/mobile/infrastructure/logger";
import { UIEventBus } from "@sincpro/mobile/infrastructure/ui/UIEventBus";
import { IServer } from "@sincpro/mobile-odoo/domain/server";
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  isAxiosError,
  Method,
} from "axios";

type FailureKind = NonNullable<DeclaredFailure["failureKind"]>;

/** Odoo's exceptions that say their kind by name; any other is read from its JSON-RPC code. */
const KIND_OF_ODOO_EXCEPTION: Readonly<Record<string, FailureKind>> = {
  "odoo.exceptions.AccessDenied": "unauthenticated",
  "odoo.exceptions.AccessError": "permission_denied",
  "odoo.exceptions.MissingError": "not_found",
};

/**
 * An error Odoo answered over JSON-RPC that is neither a `UserError` (`domain`) nor a
 * `ValidationError` (`invalid`): its kind is the one its exception names, else the one its
 * JSON-RPC code stands for (`kindOfJsonRpcCode`) — an Odoo server error (`200`) is `internal`.
 */
export class OdooRpcError extends DomainBackendError {
  constructor(
    readonly code: number,
    readonly odooException: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "OdooRpcError";
  }

  get failureKind(): FailureKind {
    return (
      (this.odooException && KIND_OF_ODOO_EXCEPTION[this.odooException]) ||
      kindOfJsonRpcCode(this.code)
    );
  }
}

/** An HTTP request to the Odoo server that it answered with an error status: the status's kind. */
export class OdooHttpError extends DomainBackendError {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "OdooHttpError";
  }

  get failureKind(): FailureKind {
    return kindOfHttpStatus(this.status);
  }
}

/** Odoo did not accept the user and password: signing in again is the way on. */
export class OdooCredentialsRejected extends DomainException {
  static readonly failureKind = "unauthenticated";
  constructor(message: string) {
    super(message);
    this.name = "OdooCredentialsRejected";
  }
}

/**
 * The circuit of the Odoo server, in this process's memory — the adapter's, never a Feature's:
 * after five calls in a row it did not answer (unreachable, a timeout) it stops calling for
 * thirty seconds, and every call fails at once with `CircuitOpen` (`unavailable`, with its wait),
 * which the stored queue retries after that wait. An error Odoo answered over JSON-RPC is an
 * answer and never counts, nor a refusal over HTTP (4xx); a phone with no connection is not the
 * server failing either.
 */
export const odooCircuit = new CircuitBreaker("odoo", {
  counts: (error) =>
    countedByDefault(error) &&
    !(error instanceof DomainNetworkError) &&
    !(error instanceof OdooRpcError),
});

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

  /**
   * Odoo's answer as the error it is: a `UserError` is the business refusing (`domain`), a
   * `ValidationError` a wrong input (`invalid`), anything else an `OdooRpcError` whose kind its
   * exception or its code says.
   */
  private mapOdooErrorToException(error: {
    code: number;
    message: string;
    data?: { name?: string; message?: string };
  }): never {
    const errorType = error.data?.name;
    const message = error.data?.message || error.message;

    if (errorType === "odoo.exceptions.UserError") {
      throw new DomainUserError(message);
    }

    if (errorType === "odoo.exceptions.ValidationError") {
      throw new DomainValidationError(message);
    }

    throw new OdooRpcError(error.code, errorType, message);
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

  private async checkConnectivity(): Promise<void> {
    let networkStatus;
    try {
      networkStatus = await NetworkAdapter.getStatus();
    } catch (error) {
      loggerAdapter.warn(
        "Could not determine Internet connectivity",
        errorAttributes(error),
      );
      return;
    }

    if (
      networkStatus.isInternetReachable === false ||
      (networkStatus.isConnected === false && networkStatus.type !== "UNKNOWN")
    ) {
      loggerAdapter.warn("Network adapter confirmed no Internet connection");
      UIEventBus.emit(InternetIsDownEvent.eventName);
      throw new DomainNetworkError("Sin conexión a Internet");
    }

    if (networkStatus.isInternetReachable === true) {
      UIEventBus.emit(InternetIsUpEvent.eventName);
    }
  }

  private async handleTransportError(
    error: unknown,
    timeout: number,
  ): Promise<void> {
    if (
      !isAxiosError(error) ||
      error.response ||
      !["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT"].includes(error.code ?? "")
    ) {
      return;
    }

    const isTimeout =
      error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    loggerAdapter.warn(
      isTimeout
        ? "Odoo request timed out"
        : "Odoo server unreachable: check the URL, TLS or its availability",
      { timeout_ms: timeout, code: error.code ?? "" },
    );

    await this.checkConnectivity();

    throw Object.assign(
      new RepeatableFailure(
        isTimeout
          ? "Tiempo de espera agotado. Revisa tu conexión o problemas de servidor"
          : "No se pudo conectar al servidor. Revisa la URL, TLS o la disponibilidad del servidor.",
      ),
      { cause: error, code: error.code },
    );
  }

  async httpRequest<T = any>(
    options: IHttpRequestOptions,
  ): Promise<AxiosResponse<T>> {
    await this.checkConnectivity();

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

    return odooCircuit.call(async () => {
      try {
        loggerAdapter.debug("Odoo HTTP request", { method: options.method });
        const response =
          options.useBaseUrl && this.baseUrl
            ? await axios
                .create({ baseURL: this.baseUrl, ...config })
                .request<T>(config)
            : await axios.request<T>(config);
        loggerAdapter.debug("Odoo HTTP response", { status: response.status });
        return response;
      } catch (error: unknown) {
        await this.handleTransportError(error, config.timeout!);
        loggerAdapter.warn("Odoo HTTP request failed", errorAttributes(error));
        throw error;
      }
    });
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

    await this.checkConnectivity();

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

    const baseUrl = this.baseUrl;
    return odooCircuit.call(async () => {
      try {
        loggerAdapter.debug("Odoo HTTP request", { method, path });
        const response = await axios
          .create({ baseURL: baseUrl, ...config })
          .request<T>({ ...config, url: path });
        loggerAdapter.debug("Odoo HTTP response", {
          path,
          status: response.status,
        });
        return response;
      } catch (error: unknown) {
        await this.handleTransportError(error, config.timeout!);
        loggerAdapter.warn("Odoo HTTP request failed", {
          path,
          ...errorAttributes(error),
        });
        if (isAxiosError(error) && error.response) {
          throw new OdooHttpError(
            error.response.status,
            `Odoo answered ${error.response.status} to ${path}`,
          );
        }
        throw error;
      }
    });
  }

  private async jsonRpc<T>(method: string, params: JsonRpcParams): Promise<T> {
    await this.checkConnectivity();

    const payload = {
      jsonrpc: "2.0",
      method,
      params,
      id: Date.now(),
    };

    const axiosInstance = this.createFreshAxiosInstance();
    const data = await odooCircuit.call(async () => {
      try {
        return (await axiosInstance.post<JsonRpcResponse<T>>("", payload)).data;
      } catch (error: unknown) {
        await this.handleTransportError(error, OdooClient.REQUEST_TIMEOUT_MS);
        loggerAdapter.warn(
          "Odoo JSON-RPC request failed",
          errorAttributes(error),
        );
        throw error;
      }
    });
    if (data.error) {
      // Never the payload: it carries the password.
      loggerAdapter.warn("Odoo answered an error", {
        code: data.error.code,
        exception: data.error.data?.name ?? "",
      });
      return this.mapOdooErrorToException(data.error);
    }
    return data.result as T;
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

    loggerAdapter.info("Odoo server configured", {
      url,
      database: server.database,
    });
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
    // Never the arguments nor the result: `login` and `execute_kw` carry the password.
    loggerAdapter.debug("Calling Odoo", { service, method });
    return this.jsonRpc<M["result"]>("call", {
      service,
      method,
      args,
    });
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
      loggerAdapter.debug("Using the cached Odoo session", { uid: this.uid! });
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
      loggerAdapter.info("Renewing the expired Odoo session", {
        uid: this.uid!,
      });
    } else {
      loggerAdapter.debug("Creating the Odoo session");
    }

    try {
      const uid = await this.call("common", "login", [
        this.db!,
        this.user!,
        this.pass!,
      ]);

      if (!uid) {
        throw new OdooCredentialsRejected(
          `Odoo rejected the user or the password for database ${this.db}`,
        );
      }

      this.uid = uid;
      this.extendSession();
      loggerAdapter.debug("Odoo session established", { uid });

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

    loggerAdapter.info("Odoo credentials and session forgotten");
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
    } catch (error: unknown) {
      this.forgetSessionWhenRejected(error, model);
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
    } catch (error: unknown) {
      this.forgetSessionWhenRejected(error, model);
      throw error;
    }
  }

  /**
   * A call Odoo refused for the session (`unauthenticated`: an expired or revoked session, or
   * the session code 100): the next call signs in again. The failure itself goes on, with its kind.
   */
  private forgetSessionWhenRejected(error: unknown, model: string): void {
    const code = (error as { code?: unknown } | null)?.code;
    if (failureOf(error).kind !== "unauthenticated" && code !== 100) return;
    loggerAdapter.warn(
      "Odoo refused the session: it signs in again on the next call",
      {
        model,
      },
    );
    this.invalidateSession();
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
