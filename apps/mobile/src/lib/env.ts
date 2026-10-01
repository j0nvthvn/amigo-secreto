function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Falta ${name} en apps/mobile/.env`);
  return value;
}

// Expo reemplaza estas variables al empaquetar: el acceso tiene que ser literal
export const env = {
  supabaseUrl: required(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  webOrigin: required(process.env.EXPO_PUBLIC_WEB_ORIGIN, 'EXPO_PUBLIC_WEB_ORIGIN'),
};
