import { describe, expect, it } from "vitest";
import { assignMeshesToProcs, injectMpiProcess, meshLoadFor } from "@/lib/fds/mpi";

// FDS nie rozdziela siatek między procesy sam z siebie: gdy procesów jest mniej
// niż siatek, przypisanie trzeba dopisać do pliku jako MPI_PROCESS. Te testy
// pilnują dwóch rzeczy naraz — że podział jest sensowny (najcięższy blok możliwie
// lekki) i że numery procesów idą BLOKAMI ROSNĄCO, bo inaczej FDS odmówi startu.

/** Numery procesów muszą tworzyć spójne, niemalejące bloki. */
function jestNiemalejacy(assignment: number[]): boolean {
  return assignment.every((p, i) => i === 0 || p >= assignment[i - 1]);
}

describe("assignMeshesToProcs", () => {
  it("przypisuje siatki blokami rosnąco", () => {
    const a = assignMeshesToProcs([10, 10, 10, 10, 10, 10], 3);
    expect(jestNiemalejacy(a)).toBe(true);
    expect(a).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("zachowuje rosnące bloki także przy siatkach różnej wielkości", () => {
    const a = assignMeshesToProcs([100, 1, 1, 100, 1, 1, 100], 4);
    expect(jestNiemalejacy(a)).toBe(true);
    expect(new Set(a).size).toBeLessThanOrEqual(4);
  });

  it("każdej siatce nadaje własny proces, gdy procesów jest dość", () => {
    expect(assignMeshesToProcs([5, 5, 5], 3)).toEqual([0, 1, 2]);
    expect(assignMeshesToProcs([5, 5, 5], 8)).toEqual([0, 1, 2]);
  });

  it("zsypuje wszystko na proces 0 przy pojedynczym procesie", () => {
    expect(assignMeshesToProcs([1, 2, 3], 1)).toEqual([0, 0, 0]);
    expect(assignMeshesToProcs([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });

  it("radzi sobie z pustą listą i z niepoprawnymi liczbami komórek", () => {
    expect(assignMeshesToProcs([], 4)).toEqual([]);
    const a = assignMeshesToProcs([NaN, -5, 0, 10], 2);
    expect(a).toHaveLength(4);
    expect(jestNiemalejacy(a)).toBe(true);
  });

  it("minimalizuje najcięższy blok, a nie liczbę siatek w bloku", () => {
    // Podział po równo „na sztuki" dałby bloki 200 i 20 — dobry podział
    // stawia dużą siatkę samotnie.
    const a = assignMeshesToProcs([100, 100, 10, 10], 2);
    expect(jestNiemalejacy(a)).toBe(true);
    const { maxLoad } = meshLoadFor([100, 100, 10, 10], 2);
    expect(maxLoad).toBeLessThanOrEqual(120);
  });
});

describe("meshLoadFor", () => {
  it("podaje obciążenie najcięższego procesu i liczbę siatek na nim", () => {
    const load = meshLoadFor([10, 10, 10, 10], 2);
    expect(load.maxLoad).toBe(20);
    expect(load.maxMeshes).toBe(2);
    expect(load.usedProcs).toBe(2);
  });

  it("liczy tylko procesy, które faktycznie coś dostały", () => {
    expect(meshLoadFor([10, 10], 8).usedProcs).toBe(2);
  });

  it("dla pustego modelu oddaje zera zamiast rzucać", () => {
    expect(meshLoadFor([], 4)).toEqual({ maxLoad: 0, maxMeshes: 0, usedProcs: 0 });
  });
});

describe("injectMpiProcess", () => {
  const plik = `&HEAD CHID='test' /
&MESH IJK=10,10,10, XB=0,1,0,1,0,1 /
&MESH IJK=10,10,10, XB=1,2,0,1,0,1 /
&MESH IJK=10,10,10, XB=2,3,0,1,0,1 /
&TAIL /`;

  it("dopisuje numer procesu do każdej siatki", () => {
    const wynik = injectMpiProcess(plik, [100, 100, 100], 2);
    expect(wynik.injected).toBe(3);
    expect(wynik.content).toMatch(/MPI_PROCESS=0/);
    expect(wynik.content).toMatch(/MPI_PROCESS=1/);
    expect(wynik.maxMeshesPerProc).toBe(2);
  });

  it("dopisane numery rosną w kolejności siatek w pliku", () => {
    const wynik = injectMpiProcess(plik, [100, 100, 100], 3);
    const numery = Array.from(wynik.content.matchAll(/MPI_PROCESS=(\d+)/g)).map((m) => Number(m[1]));
    expect(numery).toEqual([0, 1, 2]);
  });

  it("nie rusza siatki, która ma już własne MPI_PROCESS", () => {
    const zRecznym = `&MESH IJK=10,10,10, XB=0,1,0,1,0,1, MPI_PROCESS=7 /
&MESH IJK=10,10,10, XB=1,2,0,1,0,1 /`;
    const wynik = injectMpiProcess(zRecznym, [100, 100], 2);
    expect(wynik.injected).toBe(1);
    expect(wynik.content).toContain("MPI_PROCESS=7");
  });

  it("zostawia resztę pliku bez zmian", () => {
    const wynik = injectMpiProcess(plik, [100, 100, 100], 2);
    expect(wynik.content).toContain("&HEAD CHID='test' /");
    expect(wynik.content).toContain("&TAIL /");
    expect(wynik.content).toContain("IJK=10,10,10");
  });

  it("wstawia przecinek tylko tam, gdzie go brakuje", () => {
    const bezPrzecinka = "&MESH IJK=10,10,10 /";
    expect(injectMpiProcess(bezPrzecinka, [100], 1).content).toContain("IJK=10,10,10, MPI_PROCESS=0 /");

    const zPrzecinkiem = "&MESH IJK=10,10,10, /";
    expect(injectMpiProcess(zPrzecinkiem, [100], 1).content).not.toContain(",, MPI_PROCESS");
  });

  it("oddaje plik nietknięty, gdy nie ma czego przypisać", () => {
    expect(injectMpiProcess("&HEAD CHID='x' /", [100], 2).injected).toBe(0);
    expect(injectMpiProcess(plik, [100, 100, 100], 0).content).toBe(plik);
  });

  it("dzieli po równo, gdy liczba siatek z parsera rozjeżdża się z plikiem", () => {
    // Zabezpieczenie: lepiej równy podział niż przypisanie nie do tych siatek.
    const wynik = injectMpiProcess(plik, [100, 100], 3);
    expect(wynik.injected).toBe(3);
    const numery = Array.from(wynik.content.matchAll(/MPI_PROCESS=(\d+)/g)).map((m) => Number(m[1]));
    expect(numery).toEqual([0, 1, 2]);
  });
});
