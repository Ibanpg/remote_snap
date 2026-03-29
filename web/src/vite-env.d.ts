/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SNAP_API_TOKEN: string;
  readonly VITE_LENS_ID: string;
  readonly VITE_LENS_GROUP_ID: string;
  readonly VITE_SIGNAL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
