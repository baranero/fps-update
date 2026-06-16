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

// Dobiera najmniejszy serwer mieszczący wymaganą liczbę rdzeni (meshCount × ompThreads).
// TODO: przywrócić CCX po zatwierdzeniu limitu dedicated_core przez Hetzner
export function selectServerType(totalCores: number): { type: string; cores: number } {
  const n = Math.max(1, totalCores);
  if (n <= 2)  return { type: "cpx11", cores: 2  };
  if (n <= 3)  return { type: "cpx21", cores: 3  };
  if (n <= 4)  return { type: "cpx31", cores: 4  };
  if (n <= 8)  return { type: "cpx41", cores: 8  };
  return       { type: "cpx51", cores: 16 };
}

export async function createServer(
  caseId: string,
  serverType: string,
  userData: string
): Promise<HetznerServer> {
  const res = await fetch(`${API}/servers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `fds-${caseId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
      server_type: serverType,
      // Używamy snapshotu z pre-installed FDS jeśli dostępny, wpp. czysty Ubuntu
      ...(process.env.HETZNER_SNAPSHOT_ID
        ? { image: process.env.HETZNER_SNAPSHOT_ID }
        : { image: "ubuntu-22.04" }),
      location: "nbg1",
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
