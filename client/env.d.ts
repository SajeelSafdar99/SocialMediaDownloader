/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_BASE_URL?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_ADSENSE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

