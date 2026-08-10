// ─── Przydział siatek do procesów MPI ────────────────────────────────────────
//
// FDS nie rozdziela siatek sam. Uruchomiony z mniejszą liczbą procesów niż
// siatek przerywa pracę:
//
//   ERROR(115): Number of meshes exceeds number of MPI processes.
//   Set MPI_PROCESS on each MESH line...
//
// (zweryfikowane biegiem na FDS 6.10.1 — 48 siatek na 4 procesach, exit 1)
//
// Żeby duży model dało się policzyć na mniejszej maszynie, przydział trzeba
// więc dopisać do pliku samemu. Obowiązują przy tym dwie reguły FDS:
//
//   1. numery procesów muszą rosnąć wzdłuż listy siatek (nie mogą się cofać),
//      więc każdy proces dostaje SPÓJNY blok kolejnych siatek,
//   2. żaden proces nie może zostać bez siatki.
//
// Blokowy podział jest przez to nieco gorzej wyważony niż dowolne upakowanie,
// ale to jedyny układ, który FDS przyjmie — i dokładnie ten sam algorytm
// wyznacza obciążenie w planerze, żeby prognoza czasu odpowiadała temu,
// co naprawdę pojedzie.

/**
 * Dzieli listę siatek na `procs` spójnych bloków tak, by najcięższy blok był
 * możliwie lekki. Wyszukiwanie binarne po dopuszczalnym obciążeniu bloku.
 *
 * @returns indeks procesu dla każdej siatki (w kolejności z pliku)
 */
export function assignMeshesToProcs(meshCells: number[], procs: number): number[] {
  const n = meshCells.length;
  if (n === 0) return [];
  if (procs <= 1) return new Array(n).fill(0);
  if (procs >= n) return meshCells.map((_, i) => i);

  const cells = meshCells.map((c) => (Number.isFinite(c) && c > 0 ? c : 1));

  // Ile bloków potrzeba, gdy żaden nie może przekroczyć `limit`.
  const blocksNeeded = (limit: number): number => {
    let blocks = 1;
    let load = 0;
    for (const c of cells) {
      if (load + c > limit && load > 0) {
        blocks++;
        load = c;
      } else {
        load += c;
      }
    }
    return blocks;
  };

  let lo = Math.max(...cells);
  let hi = cells.reduce((a, b) => a + b, 0);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (blocksNeeded(mid) <= procs) hi = mid;
    else lo = mid + 1;
  }

  // Podział przy znalezionym limicie
  const bounds: number[] = [];   // indeks pierwszej siatki każdego bloku
  let load = 0;
  for (let i = 0; i < n; i++) {
    if (bounds.length === 0) bounds.push(0);
    else if (load + cells[i] > lo) {
      bounds.push(i);
      load = 0;
    }
    load += cells[i];
  }

  // Zachłanny podział może zejść poniżej `procs` bloków, a każdy proces musi
  // dostać siatkę — rozcinamy więc najcięższe bloki, aż będzie ich dokładnie tyle.
  while (bounds.length < procs) {
    let heaviest = -1;
    let heaviestLoad = -1;
    for (let b = 0; b < bounds.length; b++) {
      const start = bounds[b];
      const end = b + 1 < bounds.length ? bounds[b + 1] : n;
      if (end - start < 2) continue; // bloku z jedną siatką nie da się rozciąć
      let sum = 0;
      for (let i = start; i < end; i++) sum += cells[i];
      if (sum > heaviestLoad) {
        heaviestLoad = sum;
        heaviest = b;
      }
    }
    if (heaviest < 0) break; // same bloki jednosiatkowe — nie da się podzielić drobniej

    const start = bounds[heaviest];
    const end = heaviest + 1 < bounds.length ? bounds[heaviest + 1] : n;
    let half = 0;
    let split = start + 1;
    for (let i = start; i < end - 1; i++) {
      half += cells[i];
      if (half >= heaviestLoad / 2) {
        split = i + 1;
        break;
      }
      split = i + 2;
    }
    bounds.splice(heaviest + 1, 0, split);
    bounds.sort((a, b) => a - b);
  }

  const assignment = new Array<number>(n).fill(0);
  for (let b = 0; b < bounds.length; b++) {
    const start = bounds[b];
    const end = b + 1 < bounds.length ? bounds[b + 1] : n;
    for (let i = start; i < end; i++) assignment[i] = b;
  }
  return assignment;
}

export interface MeshLoad {
  /** Komórki na najbardziej obciążonym procesie. */
  maxLoad: number;
  /** Najwięcej siatek przypadających na jeden proces. */
  maxMeshes: number;
  /** Liczba procesów, które faktycznie dostały siatkę. */
  usedProcs: number;
}

/** Obciążenie procesów wynikające z przydziału. */
export function meshLoadFor(meshCells: number[], procs: number): MeshLoad {
  const assignment = assignMeshesToProcs(meshCells, procs);
  if (assignment.length === 0) return { maxLoad: 0, maxMeshes: 0, usedProcs: 0 };

  const loads = new Map<number, { cells: number; meshes: number }>();
  assignment.forEach((proc, i) => {
    const entry = loads.get(proc) ?? { cells: 0, meshes: 0 };
    entry.cells += meshCells[i];
    entry.meshes += 1;
    loads.set(proc, entry);
  });

  const entries = Array.from(loads.values());
  return {
    maxLoad: Math.max(...entries.map((l) => l.cells)),
    maxMeshes: Math.max(...entries.map((l) => l.meshes)),
    usedProcs: loads.size,
  };
}

// ─── Dopisanie MPI_PROCESS do pliku ──────────────────────────────────────────

/** Namelisty &MESH w kolejności występowania, z pozycjami w tekście. */
function findMeshNamelists(content: string): Array<{ start: number; end: number; body: string }> {
  const out: Array<{ start: number; end: number; body: string }> = [];
  // Ten sam kształt dopasowania co w parserze: od &MESH do zamykającego ukośnika.
  const rx = /&\s*MESH\b([\s\S]*?)\//gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(content)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, body: m[1] });
  }
  return out;
}

export interface InjectResult {
  content: string;
  /** Ile siatek dostało dopisany numer procesu. */
  injected: number;
  /** Największa liczba siatek na jednym procesie. */
  maxMeshesPerProc: number;
}

/**
 * Dopisuje `MPI_PROCESS=n` do każdej linii &MESH zgodnie z przydziałem.
 *
 * Komentarze FDS zaczynają się od znaku `!`, ale wewnątrz namelisty &MESH
 * praktycznie nie występują — a nawet gdyby, dopisujemy PRZED zamykającym
 * ukośnikiem, więc wstawka trafia w obszar parametrów.
 *
 * Plik, który przysłał klient, zostaje nietknięty — modyfikujemy kopię
 * uruchomieniową.
 */
export function injectMpiProcess(content: string, meshCells: number[], procs: number): InjectResult {
  const meshes = findMeshNamelists(content);
  if (meshes.length === 0 || procs < 1) {
    return { content, injected: 0, maxMeshesPerProc: 0 };
  }

  // Przydział liczymy na komórkach z parsera, ale kotwiczymy w tylu siatkach,
  // ile faktycznie widać w pliku — gdyby liczby się rozjechały, równy podział
  // jest bezpieczniejszy niż przydział nie do tych siatek.
  const cells = meshCells.length === meshes.length ? meshCells : meshes.map(() => 1);
  const assignment = assignMeshesToProcs(cells, procs);

  let out = "";
  let cursor = 0;
  let injected = 0;

  meshes.forEach((mesh, i) => {
    out += content.slice(cursor, mesh.start);
    const original = content.slice(mesh.start, mesh.end);

    if (/\bMPI_PROCESS\s*=/i.test(mesh.body)) {
      out += original; // plik już przypisuje ten mesh — nie dotykamy
    } else {
      // Wstaw przed zamykającym ukośnikiem, zachowując to, co było przed nim.
      const slash = original.lastIndexOf("/");
      const head = original.slice(0, slash).replace(/\s+$/, "");
      const needsComma = /[^,\s]$/.test(head);
      out += `${head}${needsComma ? "," : ""} MPI_PROCESS=${assignment[i]} /`;
      injected++;
    }
    cursor = mesh.end;
  });

  out += content.slice(cursor);

  const counts = new Map<number, number>();
  for (const proc of assignment) counts.set(proc, (counts.get(proc) ?? 0) + 1);

  return { content: out, injected, maxMeshesPerProc: Math.max(...Array.from(counts.values())) };
}
