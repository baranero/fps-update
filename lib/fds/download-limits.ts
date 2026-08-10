// Reguły dzielenia wyników na paczki ZIP.
//
// ZIP to jedyna ścieżka pobierania, która przechodzi przez funkcję serwerową
// (magazyn → funkcja → przeglądarka), więc płaci się za nią podwójnym transferem.
// Dlatego jest wyborem drugorzędnym: domyślnie pliki lecą WPROST z magazynu,
// pojedynczo albo do wskazanego folderu, i żadnych z tych limitów nie mają.
//
// Górną granicę wyznacza maxDuration funkcji: paczka musi zdążyć się spakować i
// przesłać w oknie 300 s, a strumień idzie w tempie łącza odbiorcy. Przy wolnym
// łączu 5 GB w to okno nie wejdzie — dlatego użytkownik może zejść z rozmiarem,
// gdy pobieranie się urywa.
//
// Współdzielone przez klienta i route — dlatego moduł bez zależności serwerowych
// (import lib/hetzner/storage w komponencie wciągnąłby AWS SDK do bundla).

export const GB = 1024 ** 3;

// Twardy limit jednej paczki, pilnowany przez route (odpowiedź 413).
export const PACKAGE_MAX_BYTES = 5 * GB;

// Do wyboru w UI. Mniejsza paczka = krótsze pojedyncze pobranie = mniejsza
// szansa, że zerwane połączenie zmarnuje całą robotę.
export const PACKAGE_SIZE_OPTIONS = [GB / 2, GB, 2 * GB, 5 * GB];

export const DEFAULT_PACKAGE_BYTES = 2 * GB;

export interface SizedFile {
  name: string;
  size: number | null;
}

// Dzieli listę na kolejne paczki mieszczące się w limicie, zachowując kolejność
// (pliki jednej symulacji trzymają się razem alfabetycznie). Plik większy od
// limitu trafia do paczki sam — UI pobiera taką „paczkę” wprost z magazynu,
// z pominięciem pakowania.
export function splitIntoPackages<T extends SizedFile>(files: T[], targetBytes: number): T[][] {
  const cap = Math.min(targetBytes, PACKAGE_MAX_BYTES);
  const parts: T[][] = [];
  let current: T[] = [];
  let currentBytes = 0;

  for (const f of files) {
    const size = f.size ?? 0;
    if (current.length > 0 && currentBytes + size > cap) {
      parts.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(f);
    currentBytes += size;
  }
  if (current.length > 0) parts.push(current);
  return parts;
}
