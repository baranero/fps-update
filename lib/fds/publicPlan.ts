// ─── Wariant obliczeń w postaci widocznej dla klienta ────────────────────────
//
// `RunPlan` z planera zawiera nasz rachunek wewnętrzny: stawkę maszyny
// przeliczoną na euro, koszt magazynu i symbol maszyny u dostawcy. Nic z tego
// nie ma prawa opuścić serwera — a endpoint doboru maszyny jest PUBLICZNY
// (kreator wycenia model przed założeniem konta), więc wystarczyło otworzyć
// narzędzia deweloperskie, żeby odczytać nasz koszt co do centa i wyliczyć marżę.
//
// Ten moduł jest jedyną drogą, którą wariant wychodzi do przeglądarki. Klient
// dostaje to, czego potrzebuje do wyboru: ile to potrwa, ile go to będzie
// kosztowało i jaki sprzęt dostanie (rdzenie i pamięć — bez marki i symbolu,
// zgodnie z zasadami copy FDSRun).

import { createHash } from "crypto";
import type { PlanResult, PlanTier, PlanWarning, RunPlan } from "./planner";

/**
 * Ziarno identyfikatora wariantu. Zmiana unieważnia identyfikatory wysłane do
 * otwartych kreatorów — zamówienie spadnie wtedy na wariant domyślny, więc
 * nie zmieniaj go bez powodu.
 */
const PLAN_ID_SALT = "fdsrun-plan-v1";

/**
 * Nieodwracalny (na oko) identyfikator wariantu. Zastępuje symbol maszyny
 * dostawcy, żeby po payloadzie nie dało się odczytać ani sprzętu, ani — po
 * zestawieniu z cennikiem dostawcy — naszego kosztu.
 */
export function planId(serverType: string): string {
  return createHash("sha256").update(`${PLAN_ID_SALT}:${serverType.toLowerCase()}`).digest("hex").slice(0, 12);
}

/** Wariant obliczeń bez ani jednej liczby opisującej NASZ koszt. */
export interface PublicPlan {
  id: string;
  cores: number;
  ramGb: number;
  dedicated: boolean;
  mpiProcs: number;
  meshesPerProc: number;
  wallHours: number;
  wallLoHours: number;
  wallHiHours: number;
  /** Cena dla klienta [zł netto]. */
  price: number;
  tier: PlanTier | null;
  warnings: PlanWarning[];
}

export function toPublicPlan(plan: RunPlan): PublicPlan {
  return {
    id: planId(plan.serverType),
    cores: plan.cores,
    ramGb: plan.ramGb,
    dedicated: plan.dedicated,
    mpiProcs: plan.mpiProcs,
    meshesPerProc: plan.meshesPerProc,
    wallHours: plan.wallHours,
    wallLoHours: plan.wallLoHours,
    wallHiHours: plan.wallHiHours,
    price: plan.price,
    tier: plan.tier,
    warnings: plan.warnings,
  };
}

/**
 * Wariant wskazany przez klienta. Szuka w PEŁNEJ liście maszyn, nie tylko na
 * froncie Pareto — klient mógł świadomie wybrać wariant zdominowany z listy
 * rozwijanej. Nieznany identyfikator (stara karta w przeglądarce, zmiana
 * oferty dostawcy) daje null, a wywołujący spada na wariant domyślny.
 */
export function findPlanById(result: PlanResult, id: string | null | undefined): RunPlan | null {
  if (!id) return null;
  const wanted = id.trim().toLowerCase();
  return result.allPlans.find((p) => planId(p.serverType) === wanted) ?? null;
}
