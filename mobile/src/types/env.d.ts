declare module '@env' {
  export const EXPO_PUBLIC_API_URL: string;
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  export const EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN: string;
}

// Extend ProcessEnv interface
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL: string;
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN: string;
    }
  }
}
