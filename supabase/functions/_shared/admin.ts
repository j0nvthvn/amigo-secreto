import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/** Cliente con service role: salta RLS y puede ejecutar commit_draw. Solo en el servidor. */
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Usuario del JWT de la petición, o null si no hay sesión válida. */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export type ApiResponse = { ok: true } | { ok: false; code: string; message?: string };

export function json(body: ApiResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Código de un error de RPC lanzado con `raise exception using errcode = 'P0001'`. */
export function rpcErrorCode(error: { code?: string; message?: string } | null): string | null {
  return error?.code === "P0001" && error.message ? error.message : null;
}
