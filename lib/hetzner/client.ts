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
  prices: Array<{ location: string; price_hourly: { net: string } }>;
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
