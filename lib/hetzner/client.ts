const API = "https://api.hetzner.cloud/v1";

function headers() {
  const token = process.env.HETZNER_API_TOKEN;
  if (!token) throw new Error("Brak HETZNER_API_TOKEN");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export interface HetznerServer {
  id: number;
  name: string;
  status: string;
  ipv4: string;
}

interface HetznerServerTypeRaw {
  id: number;
  name: string;
  cores: number;
  cpu_type: string;       // "shared" | "dedicated"
  architecture: string;   // "x86" | "arm"
  deprecated: boolean;
  prices: Array<{ location: string; price_hourly: { net: string }; price_monthly?: { net: string } }>;
}

interface HetznerDatacenter {
  location: { name: string };
  server_types: { available: number[] };
}

// Używa GET /datacenters (pole server_types.available) jako pewnego źródła dostępności,
// zamiast polegać na prices[] w /server_types, które bywa rozbieżne z faktyczną możliwością tworzenia.
export async function selectServerType(
  totalCores: number,
  location = process.env.HETZNER_LOCATION ?? "nbg1"
): Promise<{ type: string; cores: number; location: string }> {
  const n = Math.max(1, totalCores);

  const LOCATIONS = [location, "fsn1", "hel1", "nbg1"].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  const [stRes, dcRes] = await Promise.all([
    fetch(`${API}/server_types?per_page=100`, { headers: headers() }),
    fetch(`${API}/datacenters?per_page=50`, { headers: headers() }),
  ]);
  if (!stRes.ok) throw new Error(`Hetzner server_types error: ${stRes.status}`);
  if (!dcRes.ok) throw new Error(`Hetzner datacenters error: ${dcRes.status}`);

  const { server_types }: { server_types: HetznerServerTypeRaw[] } = await stRes.json();
  const { datacenters }: { datacenters: HetznerDatacenter[] } = await dcRes.json();

  for (const loc of LOCATIONS) {
    const availableIds = new Set<number>(
      datacenters
        .filter((dc) => dc.location.name === loc)
        .flatMap((dc) => dc.server_types.available)
    );

    const candidates = server_types
      .filter(
        (t) =>
          !t.deprecated &&
          t.architecture === "x86" &&
          t.cpu_type === "shared" &&
          t.cores >= n &&
          availableIds.has(t.id)
      )
      .sort((a, b) => {
        const price = (t: HetznerServerTypeRaw) =>
          parseFloat(t.prices.find((p) => p.location === loc)?.price_hourly.net ?? "999");
        return price(a) - price(b) || a.cores - b.cores;
      });

    if (candidates.length > 0) {
      return { type: candidates[0].name, cores: candidates[0].cores, location: loc };
    }
  }

  throw new Error(`Brak dostępnego serwera dla ${n} rdzeni w lokalizacjach: ${LOCATIONS.join(", ")}`);
}

export async function createServer(
  caseId: string,
  serverType: string,
  location: string,
  userData: string
): Promise<HetznerServer> {
  const res = await fetch(`${API}/servers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `fds-${caseId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
      server_type: serverType,
      ...(process.env.HETZNER_SNAPSHOT_ID
        ? { image: process.env.HETZNER_SNAPSHOT_ID }
        : { image: "ubuntu-22.04" }),
      location,
      user_data: userData,
      public_net: { enable_ipv4: true, enable_ipv6: false },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Hetzner create error ${res.status}: ${JSON.stringify(err)}`);
  }

  const { server } = await res.json();
  return {
    id: server.id,
    name: server.name,
    status: server.status,
    ipv4: server.public_net?.ipv4?.ip ?? "",
  };
}

export async function deleteServer(serverId: number): Promise<void> {
  await fetch(`${API}/servers/${serverId}`, {
    method: "DELETE",
    headers: headers(),
  });
}

export async function getServer(serverId: number): Promise<HetznerServer | null> {
  const res = await fetch(`${API}/servers/${serverId}`, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const { server } = await res.json();
  return { id: server.id, name: server.name, status: server.status, ipv4: server.public_net?.ipv4?.ip ?? "" };
}

export interface HetznerServerDetail {
  id: number;
  name: string;
  status: string;           // running | starting | stopping | off | …
  serverType: string;       // np. ccx33
  cores: number;
  memoryGb: number;
  diskGb: number;
  location: string;
  ipv4: string;
  created: string;          // ISO
  priceHourlyNet: number;   // EUR / h
  priceMonthlyNet: number;  // EUR / mies (cap)
}

interface HetznerServerRaw {
  id: number;
  name: string;
  status: string;
  created: string;
  public_net?: { ipv4?: { ip?: string } };
  datacenter?: { location?: { name?: string } };
  server_type?: {
    name?: string;
    cores?: number;
    memory?: number;
    disk?: number;
    prices?: Array<{ location: string; price_hourly?: { net?: string }; price_monthly?: { net?: string } }>;
  };
}

export interface ServerTypePrice { hourlyNet: number; monthlyNet: number; }

// Cennik typów serwerów (nazwa → stawki netto EUR), cache'owany w pamięci funkcji.
// Ceny są w praktyce statyczne, więc odświeżamy co godzinę — pozwala tanio wyceniać
// koszt pojedynczych symulacji przy każdym renderze listy.
let _priceCache: { at: number; map: Map<string, ServerTypePrice> } | null = null;
const PRICE_TTL_MS = 60 * 60 * 1000;

export async function getServerTypePriceMap(
  location = process.env.HETZNER_LOCATION ?? "nbg1"
): Promise<Map<string, ServerTypePrice>> {
  if (_priceCache && Date.now() - _priceCache.at < PRICE_TTL_MS) return _priceCache.map;

  const res = await fetch(`${API}/server_types?per_page=100`, { headers: headers() });
  if (!res.ok) throw new Error(`Hetzner server_types error: ${res.status}`);
  const { server_types }: { server_types: HetznerServerTypeRaw[] } = await res.json();

  const map = new Map<string, ServerTypePrice>();
  for (const t of server_types) {
    const prices = t.prices ?? [];
    const row = prices.find((p) => p.location === location) ?? prices[0];
    if (!row) continue;
    map.set(t.name, {
      hourlyNet: parseFloat(row.price_hourly?.net ?? "0"),
      monthlyNet: parseFloat(row.price_monthly?.net ?? "0"),
    });
  }
  _priceCache = { at: Date.now(), map };
  return map;
}

// Realny koszt przebiegu jednej symulacji: stawka godzinowa typu serwera × czas życia
// maszyny (od dispatch/start do ukończenia; dla trwających — do teraz).
export function hetznerRunCostEur(
  args: { serverType: string | null; dispatchedAt: string | null; startedAt: string | null; completedAt: string | null },
  priceMap: Map<string, ServerTypePrice>,
  now = Date.now()
): { costEur: number | null; runtimeHours: number | null; hourlyNet: number | null } {
  const start = args.dispatchedAt ?? args.startedAt;
  if (!start || !args.serverType) return { costEur: null, runtimeHours: null, hourlyNet: null };

  const startMs = new Date(start).getTime();
  const endMs = args.completedAt ? new Date(args.completedAt).getTime() : now;
  const runtimeHours = Math.max(0, (endMs - startMs) / 3_600_000);

  const price = priceMap.get(args.serverType);
  if (!price) return { costEur: null, runtimeHours, hourlyNet: null };
  return { costEur: runtimeHours * price.hourlyNet, runtimeHours, hourlyNet: price.hourlyNet };
}

// Pełna lista serwerów z wyceną (do panelu kosztów w adminie). Cena brana z pola
// prices[] w server_type dopasowanego do lokalizacji serwera (fallback: pierwsza cena).
export async function listServersDetailed(): Promise<HetznerServerDetail[]> {
  const out: HetznerServerDetail[] = [];
  let page = 1;
  // Zabezpieczenie przed pętlą — realnie serwerów są jednostki.
  for (let guard = 0; guard < 20; guard++) {
    const res = await fetch(`${API}/servers?per_page=50&page=${page}`, { headers: headers() });
    if (!res.ok) throw new Error(`Hetzner servers error: ${res.status}`);
    const json = await res.json();
    const servers: HetznerServerRaw[] = json.servers ?? [];
    for (const s of servers) {
      const loc = s.datacenter?.location?.name ?? "";
      const prices = s.server_type?.prices ?? [];
      const priceRow = prices.find((p) => p.location === loc) ?? prices[0];
      out.push({
        id: s.id,
        name: s.name,
        status: s.status,
        serverType: s.server_type?.name ?? "—",
        cores: s.server_type?.cores ?? 0,
        memoryGb: s.server_type?.memory ?? 0,
        diskGb: s.server_type?.disk ?? 0,
        location: loc || "—",
        ipv4: s.public_net?.ipv4?.ip ?? "",
        created: s.created,
        priceHourlyNet: parseFloat(priceRow?.price_hourly?.net ?? "0"),
        priceMonthlyNet: parseFloat(priceRow?.price_monthly?.net ?? "0"),
      });
    }
    const next = json.meta?.pagination?.next_page;
    if (!next) break;
    page = next;
  }
  return out;
}
