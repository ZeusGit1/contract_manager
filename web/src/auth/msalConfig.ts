import { Configuration, LogLevel } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID ?? '';
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID ?? '';
const apiClientId = import.meta.env.VITE_API_CLIENT_ID ?? '';

/** MSAL config per api-client-auth.md — SPA platform, sessionStorage cache, no client secret. */
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: () => undefined,
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
    },
  },
};

/** Scope set requested when calling our API. */
export const apiTokenRequest = {
  scopes: apiClientId ? [`api://${apiClientId}/.default`] : [],
};
