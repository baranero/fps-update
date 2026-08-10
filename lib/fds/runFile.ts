// Kopia uruchomieniowa modelu.
//
// Gdy procesów MPI jest mniej niż siatek, do pliku trzeba dopisać przypisanie
// siatek do procesów (patrz lib/fds/mpi.ts). Oryginał klienta zostaje nietknięty,
// a maszyna liczy kopię odłożoną obok — w podkatalogu `run/` tego samego zlecenia.
//
// Ścieżkę wylicza ta jedna funkcja, żeby sprzątanie magazynu nie rozjechało się
// z zapisem: kasując zlecenie trzeba usunąć oba pliki.

export function runFilePathFor(filePath: string): string {
  const slash = filePath.lastIndexOf("/");
  if (slash < 0) return `run/${filePath}`;
  return `${filePath.slice(0, slash)}/run/${filePath.slice(slash + 1)}`;
}

/** Wszystkie obiekty modelu danego zlecenia — oryginał i kopia uruchomieniowa. */
export function caseModelPaths(filePath: string | null | undefined): string[] {
  if (!filePath) return [];
  return [filePath, runFilePathFor(filePath)];
}
