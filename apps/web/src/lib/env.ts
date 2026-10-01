function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Falta ${name} en apps/web/.env`);
  return value;
}

export const env = {
  supabaseUrl: required(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL'),
  supabaseAnonKey: required(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY'),
  contactEmail: required(import.meta.env.VITE_CONTACT_EMAIL, 'VITE_CONTACT_EMAIL'),
};
