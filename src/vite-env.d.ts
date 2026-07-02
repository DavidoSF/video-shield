/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STREAMIX_HLS_URL?: string;
  readonly VITE_STREAMIX_AUTH_LOGIN_URL?: string;
  readonly VITE_STREAMIX_TOKEN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
