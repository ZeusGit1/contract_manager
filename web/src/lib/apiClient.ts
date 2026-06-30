import type { IPublicClientApplication } from '@azure/msal-browser';
import { apiTokenRequest } from '@/auth/msalConfig';

let msalInstance: IPublicClientApplication | null = null;

export function setMsalInstance(instance: IPublicClientApplication): void {
  msalInstance = instance;
}

/** Returns the API access token. Tries silent first; falls back to redirect interactive flow. */
async function getAccessToken(): Promise<string | null> {
  if (!msalInstance) return null;
  if (apiTokenRequest.scopes.length === 0) return null;

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) return null;

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...apiTokenRequest,
      account: accounts[0],
    });
    return result.accessToken;
  } catch {
    await msalInstance.acquireTokenRedirect(apiTokenRequest);
    return null;
  }
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly problem?: unknown;
  constructor(message: string, status: number, problem?: unknown) {
    super(message);
    this.status = status;
    this.problem = problem;
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  asFormData?: FormData;
}

/** Thin wrapper around fetch that attaches the bearer token and parses JSON or returns Response. */
export async function api(path: string, options: ApiOptions = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.asFormData) {
    body = options.asFormData;
  } else if (options.body !== undefined && options.body !== null) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    let problem: unknown = null;
    try {
      problem = await response.clone().json();
    } catch {
      /* no body */
    }
    throw new ApiError(buildErrorMessage(path, response.status, problem), response.status, problem);
  }
  return response;
}

function buildErrorMessage(path: string, status: number, problem: unknown): string {
  const detail = extractProblemDetail(problem);
  if (detail) return detail;
  return `API ${path} failed with status ${status}.`;
}

function extractProblemDetail(problem: unknown): string | null {
  if (!problem || typeof problem !== 'object') return null;
  const record = problem as Record<string, unknown>;
  if (typeof record.detail === 'string' && record.detail.trim()) return record.detail.trim();
  if (typeof record.title === 'string' && record.title.trim()) return record.title.trim();
  const errors = record.errors;
  if (errors && typeof errors === 'object') {
    const messages: string[] = [];
    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const message of value) {
          if (typeof message === 'string' && message.trim()) messages.push(message.trim());
        }
      }
    }
    if (messages.length > 0) return messages.join(' ');
  }
  return null;
}

export async function apiJson<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await api(path, options);
  return (await response.json()) as T;
}
