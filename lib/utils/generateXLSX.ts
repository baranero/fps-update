import * as XLSX from "xlsx";
import { CNBOPReportData } from "./generatePDF";

<<<<<<< HEAD
=======
const DOOR_CONFIG_LABELS: Record<string, string> = {
  single: "Pojedyncze drzwi",
  double: "Drzwi dwuskrzydłowe",
  two_independent: "Dwa niezależne wyjścia (powierzchnie sumowane)",
  serial: "Drzwi w szeregu — liczy się mniejszy otwór",
  other: "Inne otwory napowietrzające (okna, żaluzje itp.)",
};
>>>>>>> 90d59143e76369e72e6104e5d3a72020759e31cd

const HEIGHT_GROUP_LABELS: Record<string, string> = {
  N: "Niski (N) — do 12 m / do 4 kond.",
  SW: "Średniowysoki (SW) — 12–25 m / 5–9 kond.",
  W: "Wysoki (W) — 25–55 m / 10–18 kond.",
  WW: "Wysokościowy (WW) — powyżej 55 m / 18 kond.",
};

type Row = (string | number)[];

export function generateXLSX(data: CNBOPReportData, fileName = "Raport_CNBOP.xlsx") {
  const rows: Row[] = [];

  const add = (...cols: (string | number)[]) => rows.push(cols);
  const sep = () => rows.push([]);
  const head = (label: string) => rows.push([label, "Wartość"]);

  add("KARTA DOBORU SYSTEMU ODDYMIANIA KLATKI SCHODOWEJ");
  add("Obliczenia inżynierskie wg wytycznych CNBOP-PIB W-0003:2016");
  add("Data wygenerowania:", data.date);
  add(
    "Typ instalacji:",
    data.results.systemType === "MECHANICAL" ? "Nawiew Mechaniczny" : "Oddymianie Grawitacyjne"
  );
  sep();

  // 1. Architektura
  head("1. PARAMETRY ARCHITEKTONICZNE OBIEKTU");
  add("Kategoria zagrożenia ludzi (ZL)", data.step1.categoryZL);
  add("Klasyfikacja wysokości budynku wg § 8 WT", HEIGHT_GROUP_LABELS[data.step1.buildingHeightGroup] ?? data.step1.buildingHeightGroup);
  add("Liczba kondygnacji nadziemnych", data.step1.numberOfFloorsAbove);
  add("Liczba kondygnacji podziemnych", data.step1.numberOfFloorsBelow);
  add("Łączna liczba kondygnacji obsługiwanych przez system", data.step1.numberOfFloorsTotal);
  add("Wydzielenie pożarowe klatki schodowej (min. EI 30)", data.step1.stairwellEnclosure === "ppoż" ? "Tak — obudowana z drzwiami PPOŻ" : "Nie — brak pełnej obudowy");
  add("Samozamykacze na drzwiach wejściowych na klatkę", data.step1.selfClosers ? "Tak (kompletne)" : "Nie (niekompletne)");
  sep();

  // 2. Geometria
  head("2. GEOMETRIA KLATKI SCHODOWEJ");
  add("A KS — rzeczywista pow. klatki (do weryfikacji warunku CFD) [m²]", data.step2.AKS);
  add("  A — suma rzutów poziomych biegów schodowych [m²]", data.step2.A);
  add("  B — suma spoczników schodowych [m²]", data.step2.B);
  add("  C — otwory przelotowe między kondygnacjami [m²]", data.step2.C);
  add("  D — dusza schodów (centralny prześwit pionowy) [m²]", data.step2.D);
  add("A KS-O = A + B + C + D — obliczeniowa pow. klatki [m²]", data.step2.AKS_O.toFixed(2).replace(".", ","));
  sep();

  // CFD
  const hasCfd = data.results.cfnWarnings.cfnC || data.results.cfnWarnings.cfnD || data.results.cfnWarnings.cfnAKS || data.results.cfnWarnings.cfnSerialDoors;
  if (hasCfd) {
    add("OSTRZEŻENIE: WYMAGANA WERYFIKACJA SYMULACJĄ CFD (rozdz. 7.1 wytycznych)");
    if (data.results.cfnWarnings.cfnC) add("  • Powierzchnia C przekracza 10% sumy A+B");
    if (data.results.cfnWarnings.cfnD) add("  • Powierzchnia D przekracza 25% sumy A+B");
    if (data.results.cfnWarnings.cfnAKS) add("  • Rzeczywista pow. klatki A KS na kondygnacji > 40 m²");
    if (data.results.cfnWarnings.cfnSerialDoors) add("  • Napływ grawitacyjny przez drzwi w szeregu oddalonych o > 5 m");
    add("Kontakt w sprawie wyceny symulacji CFD:", "e-mail: biuro@fp-solutions.pl  |  tel.: +48 790 782 993");
    sep();
  }

  // 3. Klapa dymowa
  head("3. DOBÓR KLAPY DYMOWEJ");
  add("Pow. geometryczna klapy dymowej — dobrana [m²]", `${data.actualVent.Ageom.toFixed(2).replace(".", ",")} m²`);
  add("Pow. czynna klapy dymowej (Acz) — dobrana [m²]", `${data.actualVent.Acz.toFixed(2).replace(".", ",")} m²`);
  add("Minimalna wymagana pow. czynna klapy wg CNBOP (Acz,min) [m²]", `${data.results.Acz?.toFixed(2).replace(".", ",")} m²`);
  const ventOk = data.actualVent.Acz >= (data.results.Acz ?? 0);
  add("Status klapy dymowej", ventOk ? "SPEŁNIONY — dobrana klapa pokrywa minimum" : "NIEWYSTARCZAJĄCY — wymagana klapa o większej pow. czynnej");
  sep();

  // 4. Napowietrzanie (grawitacyjny)
  if (data.results.systemType === "GRAVITATIONAL") {
    head("4. DOBÓR OTWORÓW NAPOWIETRZAJĄCYCH (KOMPENSACJA)");
<<<<<<< HEAD
    const groupCount = data.step4.compGroups.length;
    const totalOpenings = data.step4.compGroups.reduce((s, g) => s + g.openings.length, 0);
    add("Konfiguracja napowietrzania", `${groupCount} ścieżka(i) równoległych, ${totalOpenings} otwór(y) łącznie`);
    add("Dobrana pow. efektywna napowietrzania (Aeff,komp) [m²]", `${data.compCalc.providedAeff.toFixed(2).replace(".", ",")} m²`);
    if (data.results.Akomp_eff) {
      const compOk = data.compCalc.providedAeff >= data.results.Akomp_eff;
      add("Minimalna wymagana pow. efektywna (Acz,komp,min) [m²]", `${data.results.Akomp_eff.toFixed(2).replace(".", ",")} m²`);
      add("Status napowietrzania", compOk ? "SPEŁNIONY" : "NIEWYSTARCZAJĄCY");
    }
=======
    add("Konfiguracja urządzenia napowietrzającego", DOOR_CONFIG_LABELS[data.step4.doorConfiguration] ?? data.step4.doorConfiguration);
    add("Dobrana pow. geometryczna napowietrzania (Ageom,komp) [m²]", `${data.compCalc.providedAgeom.toFixed(2).replace(".", ",")} m²`);
    if (data.results.Akomp_geom) {
      add("Minimalna wymagana pow. geometryczna napowietrzania (Ageom,komp,min) [m²]", `${data.results.Akomp_geom.toFixed(2).replace(".", ",")} m²`);
      const compOk = data.compCalc.providedAgeom >= data.results.Akomp_geom;
      add("Status napowietrzania", compOk ? "SPEŁNIONY" : "NIEWYSTARCZAJĄCY");
    }
    if (data.results.Akomp_eff) {
      add("Minimalna wymagana pow. efektywna innych otworów (Acz,komp,min) [m²]", `${data.results.Akomp_eff.toFixed(2).replace(".", ",")} m²`);
    }
>>>>>>> 90d59143e76369e72e6104e5d3a72020759e31cd
    sep();
  }

  // 4/5. Parametry mechaniczne
  if (data.results.systemType === "MECHANICAL") {
    head("4. PARAMETRY PRZEPŁYWOWE I NIESZCZELNOŚCI");
    add("Efektywna pow. nieszczelności przegród klatki (Ae) [m²]", `${data.step4.Ae} m²`);
    add("Sposób montażu i wyrzutu wentylatora", data.step4.installationType === "wall" ? "Wyrzut ścienny (0 Pa strat na instalacji)" : "Wyrzut kanałowy");
    if (data.step4.installationType === "ducted") add("Strata ciśnienia na instalacji kanałowej [Pa]", `${data.step4.ductPressureLoss} Pa`);
    if (!data.step1.selfClosers && data.step4.openDoorArea) {
      add("Pow. ucieczki przez otwarte skrzydło drzwi (brak samozamykacza) [m²]", `${data.step4.openDoorArea} m²`);
    }
    sep();
  }

  // Wyniki końcowe
  add("OSTATECZNE WYNIKI OBLICZEŃ", "Wartość");
  if (data.results.systemType === "MECHANICAL") {
    add("Vn,min — strumień dla prędkości minimalnej 0,2 m/s [m³/h]", `${data.results.vn_min} m³/h`);
    add("Vn,p — strumień kompensacji nieszczelności przegród [m³/h]", `${data.results.vn_p} m³/h`);
    add("Vn1 — wymagany wydatek dla zamkniętych drzwi [m³/h]", `${data.results.vn1} m³/h`);
    if (data.results.vn2) {
      add("Vn,v — strumień ucieczki przez otwarte drzwi [m³/h]", `${data.results.vn_v} m³/h`);
      add("Vn2 — wymagany wydatek dla otwartych drzwi [m³/h]", `${data.results.vn2} m³/h`);
    }
    add("V,went — projektowy strumień nawiewu wentylatora [m³/h]", `${data.results.v_went} m³/h`);
    add("ΔP — wymagany spręż dyspozycyjny wentylatora [Pa]", `${data.results.totalPressure} Pa`);
    add("Acz,min — minimalna wymagana pow. czynna klapy dymowej [m²]", `${data.results.Acz?.toFixed(2).replace(".", ",")} m²`);
  } else {
    add("Wymagany typ systemu oddymiania", "Grawitacyjny — klapy dymowe");
    add("Acz,min — minimalna wymagana pow. czynna klapy dymowej [m²]", `${data.results.Acz?.toFixed(2).replace(".", ",")} m²`);
    add("Acz — dobrana pow. czynna klapy dymowej [m²]", `${data.actualVent.Acz.toFixed(2).replace(".", ",")} m²`);
<<<<<<< HEAD
    if (data.results.Akomp_eff) add("Acz,komp,min — min. pow. efektywna otworów napowietrzających [m²]", `${data.results.Akomp_eff.toFixed(2).replace(".", ",")} m²`);
=======
    if (data.results.Akomp_geom) add("Ageom,komp,min — min. pow. geom. napowietrzania przez drzwi [m²]", `${data.results.Akomp_geom.toFixed(2).replace(".", ",")} m²`);
    if (data.results.Akomp_eff) add("Acz,komp,min — min. pow. efektywna innych otworów napowietrzających [m²]", `${data.results.Akomp_eff.toFixed(2).replace(".", ",")} m²`);
>>>>>>> 90d59143e76369e72e6104e5d3a72020759e31cd
  }
  sep();
  add("Dokument wygenerowany automatycznie przez Kalkulator CNBOP. Wymaga weryfikacji przez uprawnionego projektanta.");

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 72 }, { wch: 32 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Raport CNBOP");
  XLSX.writeFile(wb, fileName);
}
