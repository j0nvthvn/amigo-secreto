/**
 * Tests del algoritmo de sorteo.
 * Correr con:  npx tsx --test draw.test.ts
 * (o en Deno:  deno test draw.test.ts, cambiando los imports de node:test)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { draw, describeError, seededRng, type Assignment, type Exclusion, type DrawResult } from "./draw.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const people = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

/** Verifica que el resultado sea un sorteo válido y devuelve el mapa giver → receiver. */
function assertValid(
  members: string[],
  exclusions: Exclusion[],
  result: DrawResult,
  opts: { avoidMutual?: boolean; singleCycle?: boolean } = {},
): Map<string, string> {
  assert.ok(result.ok, `se esperaba éxito, llegó ${JSON.stringify(!result.ok && result.error)}`);
  const { assignments } = result;
  assert.equal(assignments.length, members.length);

  const map = new Map(assignments.map((a: Assignment) => [a.giver, a.receiver]));
  // Cada miembro regala exactamente una vez, en el orden de entrada
  assert.deepEqual(assignments.map((a) => a.giver), members);
  // Cada miembro recibe exactamente una vez
  assert.deepEqual([...map.values()].sort(), [...members].sort());

  const banned = new Set(exclusions.map((e) => `${e.giver}->${e.receiver}`));
  for (const [g, r] of map) {
    assert.notEqual(g, r, "nadie se regala a sí mismo");
    assert.ok(!banned.has(`${g}->${r}`), `exclusión violada: ${g}->${r}`);
    if (opts.avoidMutual || opts.singleCycle) assert.notEqual(map.get(r), g, `par mutuo: ${g}<->${r}`);
  }

  if (opts.singleCycle) {
    let current = members[0];
    const seen = new Set<string>();
    while (!seen.has(current)) {
      seen.add(current);
      current = map.get(current)!;
    }
    assert.equal(seen.size, members.length, "debe ser un único ciclo");
  }
  return map;
}

/** Excluye a las parejas en ambos sentidos. */
const couples = (pairs: [string, string][]): Exclusion[] =>
  pairs.flatMap(([a, b]) => [
    { giver: a, receiver: b },
    { giver: b, receiver: a },
  ]);

// ---------------------------------------------------------------------------
// Casos válidos
// ---------------------------------------------------------------------------

test("grupo simple sin exclusiones", () => {
  const m = people(5);
  const res = draw(m);
  assertValid(m, [], res);
  assert.ok(res.ok && res.method === "sampling");
});

test("usa crypto por defecto y siempre da resultados válidos", () => {
  const m = people(8);
  for (let i = 0; i < 200; i++) assertValid(m, [], draw(m));
});

test("respeta exclusiones de parejas en muchos sorteos", () => {
  const m = people(8);
  const ex = couples([["p0", "p1"], ["p2", "p3"], ["p4", "p5"]]);
  for (let seed = 0; seed < 500; seed++) {
    assertValid(m, ex, draw(m, ex, { rng: seededRng(seed) }));
  }
});

test("avoidMutual: nunca hay pares A↔B", () => {
  const m = people(6);
  for (let seed = 0; seed < 500; seed++) {
    assertValid(m, [], draw(m, [], { avoidMutual: true, rng: seededRng(seed) }), { avoidMutual: true });
  }
});

test("singleCycle: siempre un único ciclo que incluye a todos", () => {
  const m = people(7);
  const ex = couples([["p0", "p1"], ["p2", "p3"]]);
  for (let seed = 0; seed < 500; seed++) {
    assertValid(m, ex, draw(m, ex, { mode: "singleCycle", rng: seededRng(seed) }), { singleCycle: true });
  }
});

test("grupo mínimo de 4 personas", () => {
  const m = people(4);
  assertValid(m, [], draw(m, [], { mode: "singleCycle" }), { singleCycle: true });
  assertValid(m, [], draw(m, [], { avoidMutual: true }), { avoidMutual: true });
});

test("es determinista con la misma semilla", () => {
  const m = people(10);
  assert.deepEqual(draw(m, [], { rng: seededRng(42) }), draw(m, [], { rng: seededRng(42) }));
});

// ---------------------------------------------------------------------------
// Fallbacks (exclusiones muy restrictivas)
// ---------------------------------------------------------------------------

/** Cada persona solo puede regalarle a las 2 siguientes en círculo: el muestreo casi nunca acierta. */
function narrowGroup(n: number) {
  const m = people(n);
  const ex: Exclusion[] = [];
  for (let g = 0; g < n; g++) {
    for (let r = 0; r < n; r++) {
      const d = (r - g + n) % n;
      if (d !== 0 && d !== 1 && d !== 2) ex.push({ giver: m[g], receiver: m[r] });
    }
  }
  return { m, ex };
}

test("modo libre cae al matching cuando el muestreo no alcanza", () => {
  const { m, ex } = narrowGroup(20);
  const res = draw(m, ex, { rng: seededRng(1), maxSamplingAttempts: 50 });
  assertValid(m, ex, res);
  assert.ok(res.ok && res.method === "matching");
});

test("avoidMutual cae a la búsqueda cuando el muestreo no alcanza", () => {
  const { m, ex } = narrowGroup(20);
  const res = draw(m, ex, { avoidMutual: true, rng: seededRng(2), maxSamplingAttempts: 50 });
  assertValid(m, ex, res, { avoidMutual: true });
  assert.ok(res.ok && res.method === "search");
});

test("singleCycle cae a la búsqueda cuando el muestreo no alcanza", () => {
  const { m, ex } = narrowGroup(20);
  const res = draw(m, ex, { mode: "singleCycle", rng: seededRng(3), maxSamplingAttempts: 50 });
  assertValid(m, ex, res, { singleCycle: true });
  assert.ok(res.ok && res.method === "search");
});

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

test("menos de 4 participantes (con 3 el sorteo se deduce)", () => {
  const res = draw(people(3));
  assert.deepEqual(res, { ok: false, error: { code: "TOO_FEW_MEMBERS", min: 4 } });
});

test("miembro duplicado", () => {
  const res = draw(["a", "b", "c", "a"]);
  assert.deepEqual(res, { ok: false, error: { code: "DUPLICATE_MEMBER", member: "a" } });
});

test("exclusión con miembro desconocido", () => {
  const res = draw(people(4), [{ giver: "p0", receiver: "zzz" }]);
  assert.deepEqual(res, { ok: false, error: { code: "UNKNOWN_MEMBER", member: "zzz" } });
});

test("alguien sin a quién regalar", () => {
  const res = draw(people(4), [
    { giver: "p0", receiver: "p1" },
    { giver: "p0", receiver: "p2" },
    { giver: "p0", receiver: "p3" },
  ]);
  assert.deepEqual(res, { ok: false, error: { code: "CANNOT_GIVE", member: "p0" } });
});

test("alguien a quien nadie puede regalar", () => {
  const res = draw(people(4), [
    { giver: "p0", receiver: "p2" },
    { giver: "p1", receiver: "p2" },
    { giver: "p3", receiver: "p2" },
  ]);
  assert.deepEqual(res, { ok: false, error: { code: "CANNOT_RECEIVE", member: "p2" } });
});

test("imposible aunque cada uno tenga opciones (dos personas solo pueden regalarle a la misma)", () => {
  const m = ["a", "b", "c", "d"];
  const ex = [
    { giver: "a", receiver: "b" },
    { giver: "a", receiver: "d" },
    { giver: "b", receiver: "a" },
    { giver: "b", receiver: "d" },
  ]; // a y b solo pueden regalarle a c
  const res = draw(m, ex, { rng: seededRng(7) });
  assert.deepEqual(res, { ok: false, error: { code: "IMPOSSIBLE" } });
});

/** Solo se permiten a↔b y c↔d: el modo libre funciona, los otros no. */
const twoPairs = {
  m: ["a", "b", "c", "d"],
  ex: [
    { giver: "a", receiver: "c" },
    { giver: "a", receiver: "d" },
    { giver: "b", receiver: "c" },
    { giver: "b", receiver: "d" },
    { giver: "c", receiver: "a" },
    { giver: "c", receiver: "b" },
    { giver: "d", receiver: "a" },
    { giver: "d", receiver: "b" },
  ],
};

test("modo libre acepta la única solución con pares mutuos", () => {
  assertValid(twoPairs.m, twoPairs.ex, draw(twoPairs.m, twoPairs.ex, { rng: seededRng(8) }));
});

test("avoidMutual demuestra imposibilidad (búsqueda exhaustiva)", () => {
  const res = draw(twoPairs.m, twoPairs.ex, { avoidMutual: true, rng: seededRng(9) });
  assert.deepEqual(res, { ok: false, error: { code: "IMPOSSIBLE" } });
});

test("singleCycle demuestra imposibilidad (búsqueda exhaustiva)", () => {
  const res = draw(twoPairs.m, twoPairs.ex, { mode: "singleCycle", rng: seededRng(10) });
  assert.deepEqual(res, { ok: false, error: { code: "IMPOSSIBLE" } });
});

test("SEARCH_LIMIT cuando se agota el presupuesto", () => {
  // 3 bloques cerrados: nadie puede regalarle fuera de su bloque, así que no hay ciclo único.
  // Con presupuesto 1 la búsqueda se corta antes de demostrarlo.
  const m = people(9);
  const ex: Exclusion[] = [];
  for (let g = 0; g < 9; g++)
    for (let r = 0; r < 9; r++) if (Math.floor(g / 3) !== Math.floor(r / 3)) ex.push({ giver: m[g], receiver: m[r] });
  const res = draw(m, ex, { mode: "singleCycle", rng: seededRng(11), maxSamplingAttempts: 10, searchBudget: 1 });
  assert.deepEqual(res, { ok: false, error: { code: "SEARCH_LIMIT" } });
  // Con presupuesto normal demuestra que es imposible
  const full = draw(m, ex, { mode: "singleCycle", rng: seededRng(11), maxSamplingAttempts: 10 });
  assert.deepEqual(full, { ok: false, error: { code: "IMPOSSIBLE" } });
});

test("describeError usa nombres legibles", () => {
  const names: Record<string, string> = { p0: "Ana" };
  const msg = describeError({ code: "CANNOT_GIVE", member: "p0" }, (id) => names[id] ?? id);
  assert.match(msg, /Ana no tiene a quién regalarle/);
});

// ---------------------------------------------------------------------------
// Uniformidad y rendimiento
// ---------------------------------------------------------------------------

test("el muestreo es uniforme: 4 personas tienen 9 sorteos posibles, todos igual de probables", () => {
  const m = people(4);
  const counts = new Map<string, number>();
  const rng = seededRng(123);
  const N = 18_000;
  for (let i = 0; i < N; i++) {
    const res = draw(m, [], { rng });
    assert.ok(res.ok);
    const key = res.assignments.map((a) => a.receiver).join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 9); // desarreglos de 4 elementos
  const expected = N / 9;
  for (const c of counts.values()) assert.ok(Math.abs(c - expected) < expected * 0.1, `conteo ${c} lejos de ${expected}`);
});

test("singleCycle es uniforme: 4 personas tienen 6 ciclos posibles", () => {
  const m = people(4);
  const counts = new Map<string, number>();
  const rng = seededRng(456);
  const N = 12_000;
  for (let i = 0; i < N; i++) {
    const res = draw(m, [], { mode: "singleCycle", rng });
    assert.ok(res.ok);
    const key = res.assignments.map((a) => a.receiver).join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 6); // (4-1)! ciclos
  const expected = N / 6;
  for (const c of counts.values()) assert.ok(Math.abs(c - expected) < expected * 0.1, `conteo ${c} lejos de ${expected}`);
});

test("grupo grande (100 personas, 50 parejas) en todos los modos, rápido", () => {
  const m = people(100);
  const ex = couples(Array.from({ length: 50 }, (_, i) => [m[2 * i], m[2 * i + 1]] as [string, string]));
  const t0 = performance.now();
  assertValid(m, ex, draw(m, ex));
  assertValid(m, ex, draw(m, ex, { avoidMutual: true }), { avoidMutual: true });
  assertValid(m, ex, draw(m, ex, { mode: "singleCycle" }), { singleCycle: true });
  assert.ok(performance.now() - t0 < 1000, "debería tardar menos de 1 s");
});
