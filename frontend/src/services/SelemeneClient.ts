/**
 * SelemeneClient — TypeScript API client for Selemene API
 * Mirrors the Rust noesis-sdk interface
 * See: .plan/phases/PHASE-1-multi-engine.md for API contract
 */
import {
  FALLBACK_SELEMENE_ENGINES,
  FALLBACK_SELEMENE_WORKFLOWS,
} from '../data/selemeneCatalog';
import { isTauriRuntime } from '../utils/runtimeApi';
import type {
  EngineInput,
  EngineOutput,
  EngineInfo,
  WorkflowInfo,
  WorkflowResult,
  ValidationResult,
  ReadingRecord,
  SelemeneAuthResponse,
  SelemeneRegisterResponse,
  SelemeneError,
  SelemeneUserProfile,
  SelemeneProfileUpdate,
} from '../types/selemene';

type EngineCatalogResponse = EngineInfo[] | { engines?: Array<string | Partial<EngineInfo>> };
type WorkflowCatalogResponse =
  | WorkflowInfo[]
  | {
      workflows?: Array<
        | Partial<WorkflowInfo>
        | {
            id?: string;
            name?: string;
            description?: string;
            engine_count?: number;
          }
      >;
    };
type ReadingHistoryResponse = ReadingRecord[] | { readings?: ReadingRecord[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toDisplayName(identifier: string): string {
  return identifier
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeEngineInfo(entry: string | Partial<EngineInfo>): EngineInfo {
  if (typeof entry === 'string') {
    const fallback = FALLBACK_SELEMENE_ENGINES.find((engine) => engine.engine_id === entry);
    return fallback ?? {
      engine_id: entry,
      engine_name: toDisplayName(entry),
      required_phase: 0,
    };
  }

  const engineId = entry.engine_id?.trim();
  if (!engineId) {
    throw new Error('Engine catalog entry missing engine_id');
  }

  const fallback = FALLBACK_SELEMENE_ENGINES.find((engine) => engine.engine_id === engineId);
  return {
    engine_id: engineId,
    engine_name: entry.engine_name?.trim() || fallback?.engine_name || toDisplayName(engineId),
    required_phase: entry.required_phase ?? fallback?.required_phase ?? 0,
    description: entry.description ?? fallback?.description,
  };
}

function normalizeWorkflowInfo(entry: Partial<WorkflowInfo> | Record<string, unknown>): WorkflowInfo {
  const entryRecord = entry as Record<string, unknown>;
  const workflowId =
    (typeof entry.workflow_id === 'string' && entry.workflow_id.trim())
    || (typeof entryRecord.id === 'string' && entryRecord.id.trim());

  if (!workflowId) {
    throw new Error('Workflow catalog entry missing workflow_id');
  }

  const fallback = FALLBACK_SELEMENE_WORKFLOWS.find((workflow) => workflow.workflow_id === workflowId);
  const engines = Array.isArray(entry.engines)
    ? entry.engines.filter((engine): engine is string => typeof engine === 'string' && engine.length > 0)
    : fallback?.engines ?? [];

  return {
    workflow_id: workflowId,
    name:
      (typeof entry.name === 'string' && entry.name.trim())
      || fallback?.name
      || toDisplayName(workflowId),
    required_phase:
      typeof entry.required_phase === 'number'
        ? entry.required_phase
        : fallback?.required_phase ?? 0,
    engines,
    description:
      (typeof entry.description === 'string' && entry.description.trim())
      || fallback?.description,
  };
}

function normalizeEngineCatalog(payload: EngineCatalogResponse): EngineInfo[] {
  if (Array.isArray(payload)) {
    return payload.map((entry) => normalizeEngineInfo(entry));
  }

  if (isObject(payload) && Array.isArray(payload.engines)) {
    return payload.engines.map((entry) => normalizeEngineInfo(entry));
  }

  return [];
}

function normalizeWorkflowCatalog(payload: WorkflowCatalogResponse): WorkflowInfo[] {
  if (Array.isArray(payload)) {
    return payload.map((entry) => normalizeWorkflowInfo(entry));
  }

  if (isObject(payload) && Array.isArray(payload.workflows)) {
    return payload.workflows
      .filter((entry): entry is Record<string, unknown> => isObject(entry))
      .map((entry) => normalizeWorkflowInfo(entry));
  }

  return [];
}

function normalizeReadingHistory(payload: ReadingHistoryResponse): ReadingRecord[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isObject(payload) && Array.isArray(payload.readings)) {
    return payload.readings as ReadingRecord[];
  }

  return [];
}

export class SelemeneClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string, token?: string) {
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token ?? null;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  // --- Private helpers ---

  private headers(hasBody: boolean): HeadersInit {
    const h: Record<string, string> = {
      Accept: 'application/json',
    };
    if (hasBody) {
      h['Content-Type'] = 'application/json';
    }
    if (this.token) {
      if (this.token.startsWith('nk_')) {
        h['X-API-Key'] = this.token;
      } else {
        h.Authorization = `Bearer ${this.token}`;
      }
    }
    return h;
  }

  private isCrossOrigin(url: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  private async send(url: string, options: RequestInit): Promise<Response> {
    if (isTauriRuntime()) {
      const { fetch: nativeFetch } = await import('@tauri-apps/plugin-http');
      return nativeFetch(url, options);
    }

    return fetch(url, options);
  }

  private transportError(url: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);

    if (this.isCrossOrigin(url)) {
      return new Error(
        'Selemene API request was blocked before reaching the server. Browser access is currently blocked by CORS; use the FMRL desktop runtime or a backend proxy for live Selemene data.',
      );
    }

    return new Error(`Selemene transport error: ${message}`);
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const hasBody = options?.body !== undefined && options.body !== null;
    let res: Response;

    try {
      res = await this.send(url, {
        ...options,
        headers: {
          ...this.headers(hasBody),
          ...(options?.headers ?? {}),
        },
      });
    } catch (error) {
      throw this.transportError(url, error);
    }

    if (!res.ok) {
      let errorBody: SelemeneError;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = {
          error: `HTTP ${res.status}: ${res.statusText}`,
          error_code: 'HTTP_ERROR',
        };
      }
      throw new SelemeneApiError(errorBody, res.status);
    }

    return res.json();
  }

  // --- Auth ---

  async login(email: string, password: string): Promise<SelemeneAuthResponse> {
    const resp = await this.request<SelemeneAuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = resp.token;
    return resp;
  }

  async register(email: string, password: string, fullName?: string): Promise<SelemeneRegisterResponse> {
    return this.request<SelemeneRegisterResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async discordAuthorizeUrl(): Promise<string> {
    const resp = await this.request<{ url: string }>('/api/v1/auth/discord/authorize');
    return resp.url;
  }

  async discordCallback(code: string): Promise<SelemeneAuthResponse> {
    const resp = await this.request<SelemeneAuthResponse>('/api/v1/auth/discord/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    this.token = resp.token;
    return resp;
  }

  // --- Engines ---

  async listEngines(): Promise<EngineInfo[]> {
    const resp = await this.request<EngineCatalogResponse>('/api/v1/engines');
    return normalizeEngineCatalog(resp);
  }

  async calculate(engineId: string, input: EngineInput): Promise<EngineOutput> {
    return this.request<EngineOutput>(`/api/v1/engines/${encodeURIComponent(engineId)}/calculate`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async validate(engineId: string, output: EngineOutput): Promise<ValidationResult> {
    return this.request<ValidationResult>(`/api/v1/engines/${encodeURIComponent(engineId)}/validate`, {
      method: 'POST',
      body: JSON.stringify(output),
    });
  }

  // --- Workflows ---

  async listWorkflows(): Promise<WorkflowInfo[]> {
    const resp = await this.request<WorkflowCatalogResponse>('/api/v1/workflows');
    return normalizeWorkflowCatalog(resp);
  }

  async executeWorkflow(workflowId: string, input: EngineInput): Promise<WorkflowResult> {
    return this.request<WorkflowResult>(`/api/v1/workflows/${encodeURIComponent(workflowId)}/execute`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // --- Readings ---

  async listReadings(limit = 20): Promise<ReadingRecord[]> {
    const resp = await this.request<ReadingHistoryResponse>(`/api/v1/readings?limit=${limit}`);
    return normalizeReadingHistory(resp);
  }

  async getReading(readingId: string): Promise<ReadingRecord> {
    return this.request<ReadingRecord>(`/api/v1/readings/${encodeURIComponent(readingId)}`);
  }

  // --- User ---

  async getMe(): Promise<SelemeneUserProfile> {
    return this.request<SelemeneUserProfile>('/api/v1/users/me');
  }

  async updateMe(updates: SelemeneProfileUpdate): Promise<SelemeneUserProfile> {
    return this.request<SelemeneUserProfile>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // --- Health ---

  async health(): Promise<boolean> {
    try {
      await this.request<unknown>('/health');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Typed error class for Selemene API errors
 */
export class SelemeneApiError extends Error {
  public readonly errorCode: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(body: SelemeneError, statusCode: number) {
    super(body.error);
    this.name = 'SelemeneApiError';
    this.errorCode = body.error_code;
    this.statusCode = statusCode;
    this.details = body.details;
  }

  get isPhaseAccessDenied(): boolean {
    return this.errorCode === 'PHASE_ACCESS_DENIED';
  }

  get isAuthRequired(): boolean {
    return this.errorCode === 'AUTH_REQUIRED';
  }

  get isRateLimited(): boolean {
    return this.errorCode === 'RATE_LIMITED';
  }
}

/**
 * Default client instance — reads base URL from environment
 */
export const selemeneClient = new SelemeneClient(
  import.meta.env.VITE_SELEMENE_API_URL ?? 'https://selemene.tryambakam.space'
);
