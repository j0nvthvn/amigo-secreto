/**
 * Sorteo de un grupo. Lo llama el dueño desde la app con `{ group_id, dry_run }`.
 * Calcula el sorteo con draw() y, si no es dry_run, lo guarda con commit_draw.
 * Nunca devuelve ni registra las asignaciones.
 */
import { adminClient, json, requireUser, rpcErrorCode } from "../_shared/admin.ts";
import { describeError, draw, type DrawOptions, type Exclusion } from "../_shared/draw.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DrawRequest {
  group_id: string;
  dry_run: boolean;
}

function parseBody(body: unknown): DrawRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { group_id, dry_run } = body as Record<string, unknown>;
  if (typeof group_id !== "string" || !UUID.test(group_id) || typeof dry_run !== "boolean") return null;
  return { group_id, dry_run };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, code: "invalid_input" }, 405);

  const admin = adminClient();

  // 1. Usuario no anónimo y dueño del grupo
  const user = await requireUser(req, admin);
  if (!user) return json({ ok: false, code: "not_authenticated" }, 401);

  const input = parseBody(await req.json().catch(() => null));
  if (!input) return json({ ok: false, code: "invalid_input" }, 400);

  // 2. Grupo, miembros y exclusiones con service role
  const { data: group, error: groupError } = await admin
    .from("groups")
    .select("id, owner_id, status, avoid_mutual, single_cycle")
    .eq("id", input.group_id)
    .maybeSingle();
  if (groupError) throw groupError;
  if (!group || group.owner_id !== user.id || user.is_anonymous) {
    return json({ ok: false, code: "not_owner" });
  }
  if (group.status !== "open") return json({ ok: false, code: "group_not_open" });

  const [membersResult, exclusionsResult] = await Promise.all([
    admin
      .from("members")
      .select("id, display_name")
      .eq("group_id", group.id)
      .order("created_at")
      .order("id"),
    admin
      .from("exclusions")
      .select("giver_member_id, receiver_member_id")
      .eq("group_id", group.id),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (exclusionsResult.error) throw exclusionsResult.error;

  const members: { id: string; display_name: string }[] = membersResult.data;
  const exclusions: Exclusion[] = exclusionsResult.data.map((e) => ({
    giver: e.giver_member_id,
    receiver: e.receiver_member_id,
  }));

  // 3. Sorteo, según las opciones del grupo
  const options: DrawOptions = group.single_cycle
    ? { mode: "singleCycle" }
    : { mode: "free", avoidMutual: group.avoid_mutual };
  const result = draw(members.map((m) => m.id), exclusions, options);

  // 4. Errores del motor, con los nombres reales
  if (!result.ok) {
    const names = new Map(members.map((m) => [m.id, m.display_name]));
    return json({
      ok: false,
      code: result.error.code === "TOO_FEW_MEMBERS" ? "too_few_members" : "draw_impossible",
      message: describeError(result.error, (id) => names.get(id) ?? id),
    });
  }

  // 5. Validación previa: no se escribe nada
  if (input.dry_run) return json({ ok: true });

  // 6. commit_draw vuelve a bloquear y validar: una llamada simultánea recibe group_not_open
  const { error: commitError } = await admin.rpc("commit_draw", {
    p_group_id: group.id,
    p_pairs: result.assignments,
  });
  if (commitError) {
    const code = rpcErrorCode(commitError);
    if (code === "group_not_open") return json({ ok: false, code });
    console.error("commit_draw falló", { group_id: group.id, code: commitError.code });
    return json({ ok: false, code: "internal" }, 500);
  }

  // 7. Nunca devuelve las asignaciones
  return json({ ok: true });
});
