/**
 * Algoritmo de sorteo para Amigo Secreto.
 *
 * Módulo puro (sin dependencias ni I/O): funciona igual en Deno (Edge Functions
 * de Supabase), Node y el navegador. Recibe los IDs de los miembros y las
 * exclusiones, y devuelve quién le regala a quién.
 *
 * Estrategia en tres etapas:
 *   1. Muestreo por rechazo: genera permutaciones al azar hasta encontrar una
 *      válida. Es UNIFORME (todas las combinaciones válidas son igual de
 *      probables) y resuelve casi todos los grupos reales en pocos intentos.
 *   2. Matching bipartito (algoritmo de Kuhn): si el muestreo falla, verifica
 *      en tiempo polinomial si existe alguna solución. Si no existe, el sorteo
 *      es IMPOSIBLE con esas exclusiones. En modo libre sin restricción de
 *      pares mutuos, el matching ya es una solución válida.
 *   3. Búsqueda con backtracking (solo modos con restricciones extra): busca
 *      una solución con presupuesto de nodos. Si recorre todo el espacio sin
 *      éxito, el sorteo es IMPOSIBLE; si se agota el presupuesto, devuelve
 *      SEARCH_LIMIT.
 *
 * Nota: las etapas 2 y 3 son aleatorias pero no estrictamente uniformes. Solo
 * se usan cuando las exclusiones son tan restrictivas que el muestreo no
 * encuentra solución.
 */

export type MemberId = string;

export interface Exclusion {
  /** Quien regala. */
  giver: MemberId;
  /** A quien NO puede regalarle. */
  receiver: MemberId;
}

export interface Assignment {
  giver: MemberId;
  receiver: MemberId;
}

/** Devuelve un entero uniforme en [0, maxExclusive). */
export type Rng = (maxExclusive: number) => number;

/**
 * - "free": cualquier combinación válida (puede haber ciclos cortos).
 * - "singleCycle": un único ciclo A→B→C→…→A que incluye a todos. Evita pares
 *   mutuos y subgrupos cerrados.
 */
export type DrawMode = "free" | "singleCycle";

export interface DrawOptions {
  mode?: DrawMode;
  /** Solo en modo "free": prohíbe pares mutuos (A→B y B→A). La app lo activa por defecto. */
  avoidMutual?: boolean;
  /** Fuente de aleatoriedad. Por defecto usa crypto (seguro). */
  rng?: Rng;
  /** Intentos de la etapa de muestreo. */
  maxSamplingAttempts?: number;
  /** Nodos máximos que puede explorar la búsqueda con backtracking. */
  searchBudget?: number;
}

export type DrawError =
  | { code: "TOO_FEW_MEMBERS"; min: number }
  | { code: "DUPLICATE_MEMBER"; member: MemberId }
  | { code: "UNKNOWN_MEMBER"; member: MemberId }
  /** Las exclusiones no le dejan a nadie a quien regalar. */
  | { code: "CANNOT_GIVE"; member: MemberId }
  /** Las exclusiones impiden que alguien le regale. */
  | { code: "CANNOT_RECEIVE"; member: MemberId }
  /** Demostrado: no existe ningún sorteo válido. */
  | { code: "IMPOSSIBLE" }
  /** Se agotó el presupuesto de búsqueda (probablemente imposible). */
  | { code: "SEARCH_LIMIT" };

export type DrawMethod = "sampling" | "matching" | "search";

export type DrawResult =
  | { ok: true; assignments: Assignment[]; method: DrawMethod }
  | { ok: false; error: DrawError };

/**
 * Mínimo 4: con 3 personas los únicos sorteos válidos son los dos ciclos de 3,
 * así que cada participante deduce el sorteo completo a partir de su propio resultado.
 */
export const MIN_MEMBERS = 4;

// ---------------------------------------------------------------------------
// Aleatoriedad
// ---------------------------------------------------------------------------

const UINT32_RANGE = 2 ** 32;

/** RNG criptográficamente seguro y sin sesgo (rechaza el sobrante del módulo). */
export const cryptoRng: Rng = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new RangeError(`maxExclusive inválido: ${maxExclusive}`);
  }
  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % maxExclusive;
  }
};

/** RNG determinista (mulberry32). SOLO para tests: no usar en producción. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return (maxExclusive) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
    return Math.floor(r * maxExclusive);
  };
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export function draw(
  members: MemberId[],
  exclusions: Exclusion[] = [],
  options: DrawOptions = {},
): DrawResult {
  const {
    mode = "free",
    avoidMutual = false,
    rng = cryptoRng,
    maxSamplingAttempts = 2000,
    searchBudget = 200_000,
  } = options;

  const n = members.length;
  if (n < MIN_MEMBERS) return fail({ code: "TOO_FEW_MEMBERS", min: MIN_MEMBERS });

  // IDs → índices 0..n-1
  const index = new Map<MemberId, number>();
  for (let i = 0; i < n; i++) {
    if (index.has(members[i])) return fail({ code: "DUPLICATE_MEMBER", member: members[i] });
    index.set(members[i], i);
  }

  // allowed[g][r] = g puede regalarle a r
  const allowed: boolean[][] = range(n).map((g) => range(n).map((r) => g !== r));
  for (const ex of exclusions) {
    const g = index.get(ex.giver);
    const r = index.get(ex.receiver);
    if (g === undefined) return fail({ code: "UNKNOWN_MEMBER", member: ex.giver });
    if (r === undefined) return fail({ code: "UNKNOWN_MEMBER", member: ex.receiver });
    allowed[g][r] = false;
  }

  // Chequeos rápidos con mensajes de error específicos
  for (let g = 0; g < n; g++) {
    if (!allowed[g].some(Boolean)) return fail({ code: "CANNOT_GIVE", member: members[g] });
  }
  for (let r = 0; r < n; r++) {
    if (!allowed.some((row) => row[r])) return fail({ code: "CANNOT_RECEIVE", member: members[r] });
  }

  const cycle = mode === "singleCycle";
  // En un ciclo único con n ≥ 3 nunca hay pares mutuos, así que no hace falta revisarlos.
  const checkMutual = !cycle && avoidMutual;

  const success = (perm: number[], method: DrawMethod): DrawResult => ({
    ok: true,
    method,
    // Siempre en el orden de entrada: el orden de las filas no debe revelar el ciclo.
    assignments: members.map((giver, g) => ({ giver, receiver: members[perm[g]] })),
  });

  // 1. Muestreo por rechazo (uniforme)
  for (let attempt = 0; attempt < maxSamplingAttempts; attempt++) {
    const perm = cycle ? randomCycle(n, rng) : shuffle(range(n), rng);
    if (isValid(perm, allowed, checkMutual)) return success(perm, "sampling");
  }

  // 2. Matching: prueba de existencia (cualquier sorteo válido es un matching perfecto)
  const matching = randomMatching(allowed, rng);
  if (!matching) return fail({ code: "IMPOSSIBLE" });
  if (!cycle && !checkMutual) return success(matching, "matching");

  // 3. Búsqueda con backtracking para las restricciones extra
  const outcome = cycle
    ? searchCycle(allowed, rng, searchBudget)
    : searchPermutation(allowed, rng, searchBudget);
  if (outcome.perm) return success(outcome.perm, "search");
  return fail({ code: outcome.exhausted ? "IMPOSSIBLE" : "SEARCH_LIMIT" });
}

/** Mensaje en español para mostrar al organizador. */
export function describeError(error: DrawError, nameOf: (id: MemberId) => string = (id) => id): string {
  switch (error.code) {
    case "TOO_FEW_MEMBERS":
      return `Se necesitan al menos ${error.min} participantes para hacer el sorteo.`;
    case "DUPLICATE_MEMBER":
      return `${nameOf(error.member)} aparece más de una vez en el grupo.`;
    case "UNKNOWN_MEMBER":
      return `Hay una exclusión que menciona a alguien que no está en el grupo.`;
    case "CANNOT_GIVE":
      return `Con las exclusiones actuales, ${nameOf(error.member)} no tiene a quién regalarle.`;
    case "CANNOT_RECEIVE":
      return `Con las exclusiones actuales, nadie puede regalarle a ${nameOf(error.member)}.`;
    case "IMPOSSIBLE":
      return "Con estas exclusiones no existe ningún sorteo posible. Quita alguna exclusión e inténtalo de nuevo.";
    case "SEARCH_LIMIT":
      return "No se encontró un sorteo con estas exclusiones. Prueba quitando alguna.";
  }
}

// ---------------------------------------------------------------------------
// Internos
// ---------------------------------------------------------------------------

function fail(error: DrawError): DrawResult {
  return { ok: false, error };
}

/** Permutación que forma un único ciclo con un orden aleatorio (uniforme sobre los ciclos). */
function randomCycle(n: number, rng: Rng): number[] {
  const order = shuffle(range(n), rng);
  const perm = new Array<number>(n);
  for (let k = 0; k < n; k++) perm[order[k]] = order[(k + 1) % n];
  return perm;
}

function isValid(perm: number[], allowed: boolean[][], checkMutual: boolean): boolean {
  for (let g = 0; g < perm.length; g++) {
    if (!allowed[g][perm[g]]) return false; // incluye auto-asignación (allowed[g][g] = false)
    if (checkMutual && perm[perm[g]] === g) return false;
  }
  return true;
}

/**
 * Matching perfecto aleatorio (algoritmo de Kuhn, O(n³)).
 * Devuelve perm[giver] = receiver, o null si no existe ningún matching perfecto.
 */
function randomMatching(allowed: boolean[][], rng: Rng): number[] | null {
  const n = allowed.length;
  const adj = allowed.map((row) => shuffle(range(n).filter((r) => row[r]), rng));
  const giverOf = new Array<number>(n).fill(-1);

  const augment = (g: number, seen: boolean[]): boolean => {
    for (const r of adj[g]) {
      if (seen[r]) continue;
      seen[r] = true;
      if (giverOf[r] === -1 || augment(giverOf[r], seen)) {
        giverOf[r] = g;
        return true;
      }
    }
    return false;
  };

  for (const g of shuffle(range(n), rng)) {
    if (!augment(g, new Array<boolean>(n).fill(false))) return null;
  }

  const perm = new Array<number>(n);
  for (let r = 0; r < n; r++) perm[giverOf[r]] = r;
  return perm;
}

interface SearchOutcome {
  perm: number[] | null;
  /** true si se recorrió todo el espacio (prueba de imposibilidad). */
  exhausted: boolean;
}

/**
 * Backtracking para el modo libre sin pares mutuos.
 * Heurística MRV: asigna primero a quien le quedan menos opciones.
 */
function searchPermutation(allowed: boolean[][], rng: Rng, budget: number): SearchOutcome {
  const n = allowed.length;
  const assign = new Array<number>(n).fill(-1); // giver → receiver
  const taken = new Array<boolean>(n).fill(false); // receiver ya asignado
  let nodes = 0;
  let exceeded = false;

  const candidates = (g: number): number[] => {
    const out: number[] = [];
    for (let r = 0; r < n; r++) {
      if (allowed[g][r] && !taken[r] && assign[r] !== g) out.push(r);
    }
    return out;
  };

  const solve = (assigned: number): boolean => {
    if (assigned === n) return true;
    if (++nodes > budget) {
      exceeded = true;
      return false;
    }

    // MRV con desempate aleatorio (muestreo de reservorio)
    let best = -1;
    let bestCands: number[] = [];
    let ties = 0;
    for (let g = 0; g < n; g++) {
      if (assign[g] !== -1) continue;
      const c = candidates(g);
      if (c.length === 0) return false;
      if (best === -1 || c.length < bestCands.length) {
        best = g;
        bestCands = c;
        ties = 1;
      } else if (c.length === bestCands.length && rng(++ties) === 0) {
        best = g;
        bestCands = c;
      }
    }

    for (const r of shuffle(bestCands, rng)) {
      assign[best] = r;
      taken[r] = true;
      if (solve(assigned + 1)) return true;
      assign[best] = -1;
      taken[r] = false;
      if (exceeded) return false;
    }
    return false;
  };

  return solve(0) ? { perm: assign, exhausted: false } : { perm: null, exhausted: !exceeded };
}

/**
 * Backtracking para encontrar un ciclo hamiltoniano (modo "singleCycle").
 * Fija un nodo inicial (todo ciclo pasa por él) y extiende el camino, probando
 * primero los nodos con menos salidas (heurística de Warnsdorff).
 */
function searchCycle(allowed: boolean[][], rng: Rng, budget: number): SearchOutcome {
  const n = allowed.length;
  const start = rng(n);
  const next = new Array<number>(n).fill(-1);
  const visited = new Array<boolean>(n).fill(false);
  visited[start] = true;
  let nodes = 0;
  let exceeded = false;

  const onward = (v: number): number => {
    let count = 0;
    for (let u = 0; u < n; u++) if (!visited[u] && u !== v && allowed[v][u]) count++;
    return count;
  };

  const solve = (current: number, count: number): boolean => {
    if (count === n) {
      if (!allowed[current][start]) return false;
      next[current] = start;
      return true;
    }
    if (++nodes > budget) {
      exceeded = true;
      return false;
    }

    // Poda: algún nodo sin visitar debe poder cerrar el ciclo hacia el inicio.
    let canClose = false;
    for (let v = 0; v < n && !canClose; v++) canClose = !visited[v] && allowed[v][start];
    if (!canClose) return false;

    const isLastStep = count + 1 === n;
    const scored: { v: number; score: number }[] = [];
    for (const v of shuffle(range(n), rng)) {
      if (visited[v] || !allowed[current][v]) continue;
      const score = onward(v);
      if (score === 0 && !isLastStep) continue; // callejón sin salida
      scored.push({ v, score });
    }
    scored.sort((a, b) => a.score - b.score); // sort estable: empates quedan en orden aleatorio

    for (const { v } of scored) {
      visited[v] = true;
      next[current] = v;
      if (solve(v, count + 1)) return true;
      visited[v] = false;
      next[current] = -1;
      if (exceeded) return false;
    }
    return false;
  };

  return solve(start, 1) ? { perm: next, exhausted: false } : { perm: null, exhausted: !exceeded };
}
