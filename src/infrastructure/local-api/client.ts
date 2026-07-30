import * as secureStorage from '@/src/infrastructure/local-api/secure-storage';
import { API_URL, WEBSOCKET_URL } from '@/src/shared/config/environment';
import type { AppSession, AppUser } from '@/src/domain/models';

const SESSION_STORAGE_KEY = 'book-exchange.local-session.v1';

export type { AppSession as Session, AppUser as User };

export interface ClientError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface ClientResult<T> {
  data: T;
  error: ClientError | null;
}

interface Filter {
  column: string;
  operator: 'eq' | 'neq' | 'ilike' | 'in';
  value: unknown;
}

type MutationOperation = 'insert' | 'update' | 'delete';
type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED';
type AuthListener = (event: AuthEvent, session: AppSession | null) => void;

let currentSession: AppSession | null = null;
let hydrationPromise: Promise<AppSession | null> | null = null;
const authListeners = new Set<AuthListener>();
const uploadedUrls = new Map<string, string>();

function toClientError(error: unknown): ClientError {
  if (error instanceof Error) return { message: error.message };
  return { message: 'An unexpected request error occurred' };
}

function emitAuth(event: AuthEvent, session: AppSession | null) {
  currentSession = session;
  authListeners.forEach((listener) => listener(event, session));
}

async function persistSession(session: AppSession | null) {
  currentSession = session;
  if (session) await secureStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  else await secureStorage.removeItem(SESSION_STORAGE_KEY);
}

async function hydrateSession() {
  if (currentSession) return currentSession;
  if (!hydrationPromise) {
    hydrationPromise = secureStorage
      .getItem(SESSION_STORAGE_KEY)
      .then((value) => {
        if (!value) return null;
        try {
          currentSession = JSON.parse(value) as AppSession;
          return currentSession;
        } catch {
          return secureStorage.removeItem(SESSION_STORAGE_KEY).then(() => null);
        }
      })
      .finally(() => {
        hydrationPromise = null;
      });
  }
  return hydrationPromise;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const session = authenticated ? await hydrateSession() : null;
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('content-type', 'application/json');
  if (session?.access_token) headers.set('authorization', `Bearer ${session.access_token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const serverError = body?.error;
    throw Object.assign(
      new Error(serverError?.message ?? `Request failed with status ${response.status}`),
      { code: serverError?.code },
    );
  }
  return body as T;
}

class QueryBuilder<T = any>
  implements PromiseLike<ClientResult<any>>
{
  private selectedColumns = '*';
  private filters: Filter[] = [];
  private orderBy?: { column: string; ascending: boolean };
  private resultLimit?: number;
  private resultOffset = 0;
  private operation?: MutationOperation;
  private values?: Record<string, unknown>;
  private returnMode: 'many' | 'single' | 'maybeSingle' = 'many';

  constructor(private readonly table: string) {}

  select(columns = '*') {
    this.selectedColumns = columns;
    return this;
  }

  insert(values: Record<string, unknown>) {
    this.operation = 'insert';
    this.values = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.operation = 'update';
    this.values = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, operator: 'ilike', value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, operator: 'in', value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { column, ascending: options.ascending ?? true };
    return this;
  }

  limit(value: number) {
    this.resultLimit = value;
    return this;
  }

  range(from: number, to: number) {
    this.resultOffset = from;
    this.resultLimit = Math.max(to - from + 1, 1);
    return this;
  }

  single() {
    this.returnMode = 'single';
    return this;
  }

  maybeSingle() {
    this.returnMode = 'maybeSingle';
    return this;
  }

  private async execute(): Promise<ClientResult<any>> {
    try {
      let rows: T[];
      if (this.operation) {
        const response = await apiRequest<{ data: T[] }>(`/api/data/${this.table}`, {
          method: 'POST',
          body: JSON.stringify({
            operation: this.operation,
            values: this.values,
            filters: this.filters,
          }),
        });
        rows = response.data ?? [];
      } else {
        const params = new URLSearchParams({
          select: this.selectedColumns,
          filters: JSON.stringify(this.filters),
          limit: String(this.resultLimit ?? 100),
          offset: String(this.resultOffset),
        });
        if (this.orderBy) {
          params.set('order', this.orderBy.column);
          params.set('ascending', String(this.orderBy.ascending));
        }
        const response = await apiRequest<{ data: T[] }>(
          `/api/data/${this.table}?${params.toString()}`,
        );
        rows = response.data ?? [];
      }

      if (this.returnMode === 'single') {
        if (rows.length !== 1) {
          return {
            data: null,
            error: {
              message: rows.length
                ? 'The request returned more than one record'
                : 'The requested record was not found',
              code: 'ROW_NOT_SINGLE',
            },
          };
        }
        return { data: rows[0], error: null };
      }
      if (this.returnMode === 'maybeSingle') {
        if (rows.length > 1) {
          return {
            data: null,
            error: {
              message: 'The request returned more than one record',
              code: 'ROW_NOT_SINGLE',
            },
          };
        }
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: toClientError(error) };
    }
  }

  then<TResult1 = ClientResult<any>, TResult2 = never>(
    onfulfilled?:
      | ((value: ClientResult<any>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

interface ChannelListener {
  type: string;
  config: Record<string, any>;
  callback: (payload: any) => void;
}

class LocalRealtimeChannel {
  private listeners: ChannelListener[] = [];
  private socket: WebSocket | null = null;
  private statusCallback?: (status: string) => void;
  private presence: Record<string, unknown> = {};

  constructor(
    private readonly name: string,
    private readonly options?: Record<string, any>,
  ) {}

  on(
    type: string,
    config: Record<string, any>,
    callback: (payload: any) => void,
  ) {
    this.listeners.push({ type, config, callback });
    return this;
  }

  subscribe(callback?: (status: string) => void) {
    this.statusCallback = callback;
    void this.connect();
    return this;
  }

  private async connect() {
    const session = await hydrateSession();
    const query = session?.access_token
      ? `?token=${encodeURIComponent(session.access_token)}`
      : '';
    this.socket = new WebSocket(`${WEBSOCKET_URL}/ws${query}`);
    this.socket.onopen = () => this.statusCallback?.('SUBSCRIBED');
    this.socket.onerror = () => this.statusCallback?.('CHANNEL_ERROR');
    this.socket.onmessage = (message) => {
      try {
        const payload = JSON.parse(String(message.data));
        if (payload.type === 'presence') {
          this.presence[String(payload.userId ?? 'anonymous')] = payload.state;
          this.listeners
            .filter(
              (listener) =>
                listener.type === 'presence' && listener.config.event === 'sync',
            )
            .forEach((listener) => listener.callback(payload));
          return;
        }
        this.listeners
          .filter((listener) => {
            if (listener.type !== 'postgres_changes') return false;
            if (
              listener.config.table &&
              listener.config.table !== payload.table
            )
              return false;
            return (
              !listener.config.event ||
              listener.config.event === '*' ||
              listener.config.event === payload.eventType
            );
          })
          .forEach((listener) => listener.callback(payload));
      } catch {
        // Ignore malformed realtime frames.
      }
    };
  }

  async track(state: Record<string, unknown>) {
    this.presence = { ...this.presence, ...state };
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({ type: 'presence', channel: this.name, state }),
      );
    }
  }

  presenceState() {
    return this.presence;
  }

  unsubscribe() {
    this.socket?.close();
    this.socket = null;
    this.statusCallback?.('CLOSED');
  }
}

const auth = {
  async getSession(): Promise<ClientResult<{ session: AppSession | null }>> {
    try {
      return { data: { session: await hydrateSession() }, error: null };
    } catch (error) {
      return { data: { session: null }, error: toClientError(error) };
    }
  },

  async signInWithPassword(credentials: { email: string; password: string }) {
    try {
      const response = await apiRequest<{
        data: { user: AppUser; session: AppSession };
      }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify(credentials) },
        false,
      );
      await persistSession(response.data.session);
      emitAuth('SIGNED_IN', response.data.session);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: toClientError(error) };
    }
  },

  async signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown> };
  }) {
    try {
      const response = await apiRequest<{
        data: { user: AppUser; session: AppSession };
      }>(
        '/api/auth/signup',
        {
          method: 'POST',
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            metadata: input.options?.data ?? {},
          }),
        },
        false,
      );
      await persistSession(response.data.session);
      emitAuth('SIGNED_IN', response.data.session);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: toClientError(error) };
    }
  },

  async signOut() {
    await persistSession(null);
    emitAuth('SIGNED_OUT', null);
    return { error: null };
  },

  async getUser(): Promise<ClientResult<{ user: AppUser | null }>> {
    const session = await hydrateSession();
    if (!session) return { data: { user: null }, error: null };
    try {
      const response = await apiRequest<{ data: { user: AppUser } }>(
        '/api/auth/me',
      );
      return { data: response.data, error: null };
    } catch (error) {
      return { data: { user: null }, error: toClientError(error) };
    }
  },

  async updateUser(values: { password?: string }) {
    try {
      const response = await apiRequest<{ data: { user: AppUser } }>(
        '/api/auth/password',
        { method: 'PATCH', body: JSON.stringify(values) },
      );
      emitAuth('USER_UPDATED', currentSession);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: { user: null }, error: toClientError(error) };
    }
  },

  async deleteAccount() {
    try {
      await apiRequest<null>('/api/auth/account', { method: 'DELETE' });
      await persistSession(null);
      emitAuth('SIGNED_OUT', null);
      return { error: null };
    } catch (error) {
      return { error: toClientError(error) };
    }
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.add(callback);
    void hydrateSession().then((session) => callback('INITIAL_SESSION', session));
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    };
  },
};

export const dataClient = {
  auth,

  from<T = any>(table: string) {
    return new QueryBuilder<T>(table);
  },

  async rpc<T = any>(
    name: string,
    parameters: Record<string, unknown> = {},
  ): Promise<ClientResult<T | null>> {
    try {
      const response = await apiRequest<{ data: T }>(`/api/rpc/${name}`, {
        method: 'POST',
        body: JSON.stringify(parameters),
      });
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: toClientError(error) };
    }
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(
          filePath: string,
          file: Blob,
          options: { contentType?: string; upsert?: boolean } = {},
        ) {
          try {
            const formData = new FormData();
            formData.append('file', file, filePath.split('/').pop() ?? 'image.jpg');
            const response = await apiRequest<{ data: { publicUrl: string } }>(
              `/api/uploads/${encodeURIComponent(bucket)}`,
              { method: 'POST', body: formData },
            );
            uploadedUrls.set(`${bucket}/${filePath}`, response.data.publicUrl);
            return { data: response.data, error: null };
          } catch (error) {
            return { data: null, error: toClientError(error) };
          }
        },
        getPublicUrl(filePath: string) {
          return {
            data: {
              publicUrl:
                uploadedUrls.get(`${bucket}/${filePath}`) ??
                `${API_URL}/uploads/${bucket}/${filePath}`,
            },
          };
        },
      };
    },
  },

  channel(name: string, options?: Record<string, any>) {
    return new LocalRealtimeChannel(name, options);
  },

  removeChannel(channel: LocalRealtimeChannel) {
    channel.unsubscribe();
  },
};

export async function checkAuth() {
  const { data } = await auth.getSession();
  return Boolean(data.session);
}
