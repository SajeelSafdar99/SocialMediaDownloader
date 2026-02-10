type AppConfig = {
  appName: string;
  supportEmail: string;
};

export function getAppConfig(): AppConfig {
  return {
    appName: import.meta.env.VITE_APP_NAME || "VidGrabber",
    supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "support@example.com",
  };
}

// In development, use empty string to leverage Vite proxy
// In production, set VITE_API_BASE_URL to your API URL
// If VITE_API_BASE_URL contains localhost, ignore it when accessing from production domain
export const config = {
  apiBaseUrl: (() => {
    const envApiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";

    // If we're accessing from a production domain (not localhost)
    // and the API URL is set to localhost, use empty string (same origin)
    const currentHost = window.location.host;
    const isProductionAccess = !currentHost.includes('localhost') && !currentHost.includes('127.0.0.1');
    const isLocalhostApi = envApiUrl.includes('localhost') || envApiUrl.includes('127.0.0.1');

    if (isProductionAccess && isLocalhostApi) {
      // Use same origin for API calls (no base URL needed)
      return "";
    }

    return envApiUrl;
  })(),
};
