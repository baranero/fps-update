import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { CNBOPReportData } from "./generatePDF";

const DOOR_CONFIG_LABELS: Record<string, string> = {
  single: "Pojedyncze drzwi",
  double: "Drzwi dwuskrzydłowe",
  two_independent: "Dwa niezależne wyjścia (powierzchnie sumowane)",
  serial: "Drzwi w szeregu — liczy się mniejszy otwór",
  other: "Inne otwory napowietrzające (okna, żaluzje itp.)",
};

const HEIGHT_GROUP_LABELS: Record<string, string> = {
  N: "Niski (N) — do 12 m / do 4 kond.",
  SW: "Średniowysoki (SW) — 12–25 m / 5–9 kond.",
  W: "Wysoki (W) — 25–55 m / 10–18 kond.",
  WW: "Wysokościowy (WW) — powyżej 55 m / 18 kond.",
};

const ACCENT = "1E3A8A";
const LIGHT_BG = "F1F5F9";
const WARNING_BG = "FEF2F2";
const WARNING_TEXT = "991B1B";

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, color: ACCENT, size: 24 })],
  });
}

function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            shading: { fill: LIGHT_BG, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: label, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: value, bold: true, size: 20 })] })],
          }),
        ],
      })
    ),
  });
}

function resultRow(label: string, value: string, highlight = false): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 68, type: WidthType.PERCENTAGE },
        shading: highlight ? { fill: "EFF6FF", type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 100, bottom: 100, left: 120, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: highlight, size: 20 })] })],
      }),
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        shading: highlight ? { fill: "EFF6FF", type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 100, bottom: 100, left: 120, right: 80 },
        children: [new Paragraph({
          children: [new TextRun({ text: value, bold: true, color: highlight ? ACCENT : undefined, size: highlight ? 22 : 20 })],
        })],
      }),
    ],
  });
}

function warningBlock(lines: string[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: lines.map((line, i) =>
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: WARNING_BG, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 80, bottom: 80, left: 120, right: 80 },
            children: [new Paragraph({
              children: [new TextRun({ text: line, bold: i === 0, color: WARNING_TEXT, size: 20 })],
            })],
          }),
        ],
      })
    ),
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

export async function generateDOCX(data: CNBOPReportData, fileName = "Raport_CNBOP.docx") {
  const isMech = data.results.systemType === "MECHANICAL";

  const children: (Paragraph | Table)[] = [];

  // Tytuł
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "KARTA DOBORU SYSTEMU ODDYMIANIA KLATKI SCHODOWEJ", bold: true, color: ACCENT, size: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "Obliczenia inżynierskie wg wytycznych CNBOP-PIB W-0003:2016", size: 20, color: "64748B" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Data wygenerowania: ${data.date}  |  Typ instalacji: `, size: 20 }),
        new TextRun({ text: isMech ? "Nawiew Mechaniczny" : "Oddymianie Grawitacyjne", bold: true, size: 20 }),
      ],
    })
  );

  // 1. Architektura
  children.push(sectionHeading("1. Parametry Architektoniczne Obiektu"));
  children.push(infoTable([
    ["Kategoria zagrożenia ludzi (ZL)", data.step1.categoryZL],
    ["Klasyfikacja wysokości budynku wg § 8 WT", HEIGHT_GROUP_LABELS[data.step1.buildingHeightGroup] ?? data.step1.buildingHeightGroup],
    ["Liczba kondygnacji nadziemnych", String(data.step1.numberOfFloorsAbove)],
    ["Liczba kondygnacji podziemnych", String(data.step1.numberOfFloorsBelow)],
    ["Łączna liczba kondygnacji obsługiwanych przez system", String(data.step1.numberOfFloorsTotal)],
    ["Wydzielenie pożarowe klatki schodowej (min. EI 30)", data.step1.stairwellEnclosure === "ppoż" ? "Tak — obudowana z drzwiami PPOŻ" : "Nie — brak pełnej obudowy"],
    ["Samozamykacze na drzwiach wejściowych na klatkę", data.step1.selfClosers ? "Tak (kompletne)" : "Nie (niekompletne)"],
  ]));
  children.push(spacer());

  // 2. Geometria
  children.push(sectionHeading("2. Geometria Klatki Schodowej (A KS-O = A + B + C + D)"));
  children.push(infoTable([
    ["A KS — rzeczywista pow. klatki (do weryfikacji warunku CFD)", `${data.step2.AKS} m²`],
    ["A — suma rzutów poziomych biegów schodowych", `${data.step2.A} m²`],
    ["B — suma wymiarowych spoczników schodowych", `${data.step2.B} m²`],
    ["C — otwory przelotowe między kondygnacjami", `${data.step2.C} m²`],
    ["D — dusza schodów (centralny prześwit pionowy)", `${data.step2.D} m²`],
    ["A KS-O = A + B + C + D — obliczeniowa pow. klatki", `${data.step2.AKS_O.toFixed(2).replace(".", ",")} m²`],
  ]));
  children.push(spacer());

  // CFD
  const hasCfd = data.results.cfnWarnings.cfnC || data.results.cfnWarnings.cfnD || data.results.cfnWarnings.cfnAKS || data.results.cfnWarnings.cfnSerialDoors;
  if (hasCfd) {
    const warnLines = ["OSTRZEŻENIE: Wymagana weryfikacja symulacją CFD (rozdz. 7.1 wytycznych)"];
    if (data.results.cfnWarnings.cfnC) warnLines.push("• Powierzchnia C przekracza 10% sumy A+B");
    if (data.results.cfnWarnings.cfnD) warnLines.push("• Powierzchnia D przekracza 25% sumy A+B");
    if (data.results.cfnWarnings.cfnAKS) warnLines.push("• Rzeczywista pow. klatki A KS na kondygnacji > 40 m²");
    if (data.results.cfnWarnings.cfnSerialDoors) warnLines.push("• Napływ grawitacyjny przez drzwi w szeregu oddalonych o > 5 m");
    warnLines.push("Kontakt w sprawie wyceny CFD:  e-mail: biuro@fp-solutions.pl  |  tel.: +48 790 782 993");
    children.push(warningBlock(warnLines));
    children.push(spacer());
  }

  // 3. Klapa
  const ventOk = data.actualVent.Acz >= (data.results.Acz ?? 0);
  children.push(sectionHeading("3. Dobór Klapy Dymowej"));
  children.push(infoTable([
    ["Pow. geometryczna klapy dymowej — dobrana", `${data.actualVent.Ageom.toFixed(2).replace(".", ",")} m²`],
    ["Pow. czynna klapy dymowej (Acz) — dobrana", `${data.actualVent.Acz.toFixed(2).replace(".", ",")} m²`],
    ["Minimalna wymagana pow. czynna wg CNBOP (Acz,min)", `${data.results.Acz?.toFixed(2).replace(".", ",")} m²`],
    ["Status klapy dymowej", ventOk ? "SPEŁNIONY" : "NIEWYSTARCZAJĄCY"],
  ]));
  children.push(spacer());

  // 4. Napowietrzanie (grawitacyjny)
  if (!isMech) {
    children.push(sectionHeading("4. Dobór Otworów Napowietrzających (Kompensacja)"));
    const compRows: [string, string][] = [
      ["Konfiguracja urządzenia napowietrzającego", DOOR_CONFIG_LABELS[data.step4.doorConfiguration] ?? data.step4.doorConfiguration],
      ["Dobrana pow. geometryczna napowietrzania (Ageom,komp)", `${data.compCalc.providedAgeom.toFixed(2).replace(".", ",")} m²`],
    ];
    if (data.results.Akomp_geom) {
      compRows.push(["Minimalna wymagana pow. geometryczna (Ageom,komp,min)", `${data.results.Akomp_geom.toFixed(2).replace(".", ",")} m²`]);
      const compOk = data.compCalc.providedAgeom >= data.results.Akomp_geom;
      compRows.push(["Status napowietrzania", compOk ? "SPEŁNIONY" : "NIEWYSTARCZAJĄCY"]);
    }
    if (data.results.Akomp_eff) {
      compRows.push(["Minimalna wymagana pow. efektywna innych otworów (Acz,komp,min)", `${data.results.Akomp_eff.toFixed(2).replace(".", ",")} m²`]);
    }
    children.push(infoTable(compRows));
    children.push(spacer());
  }

  // 4/5. Parametry mechaniczne
  if (isMech) {
    children.push(sectionHeading("4. Parametry Przepływowe i Nieszczelności"));
    const leakRows: [string, string][] = [
      ["Efektywna pow. nieszczelności przegród klatki (Ae)", `${data.step4.Ae} m²`],
      ["Sposób montażu i wyrzutu wentylatora", data.step4.installationType === "wall" ? "Wyrzut ścienny (0 Pa strat na instalacji)" : "Wyrzut kanałowy"],
    ];
    if (data.step4.installationType === "ducted") leakRows.push(["Strata ciśnienia na instalacji kanałowej", `${data.step4.ductPressureLoss} Pa`]);
    if (!data.step1.selfClosers && data.step4.openDoorArea) leakRows.push(["Pow. ucieczki przez otwarte skrzydło drzwi (brak samozamykacza)", `${data.step4.openDoorArea} m²`]);
    children.push(infoTable(leakRows));
    children.push(spacer());
  }

  // Wyniki końcowe
  const sectionNum = isMech ? "5" : "5";
  children.push(sectionHeading(`${sectionNum}. Ostateczne Wyniki Obliczeń`));

  const resultRows: TableRow[] = [];
  if (isMech) {
    resultRows.push(resultRow("Vn,min — strumień dla prędkości minimalnej 0,2 m/s", `${data.results.vn_min} m³/h`));
    resultRows.push(resultRow("Vn,p — strumień kompensacji nieszczelności przegród", `${data.results.vn_p} m³/h`));
    resultRows.push(resultRow("Vn1 — wymagany wydatek wentylatora dla zamkniętych drzwi", `${data.results.vn1} m³/h`));
    if (data.results.vn2) {
      resultRows.push(resultRow("Vn,v — strumień ucieczki przez otwarte drzwi bez samozamykacza", `${data.results.vn_v} m³/h`));
      resultRows.push(resultRow("Vn2 — wymagany wydatek wentylatora dla otwartych drzwi", `${data.results.vn2} m³/h`));
    }
    resultRows.push(resultRow("V,went — projektowy strumień nawiewu wentylatora", `${data.results.v_went} m³/h`, true));
    resultRows.push(resultRow("ΔP — wymagany spręż dyspozycyjny wentylatora", `${data.results.totalPressure} Pa`, true));
    resultRows.push(resultRow("Acz,min — minimalna wymagana pow. czynna klapy dymowej", `${data.results.Acz?.toFixed(2).replace(".", ",")} m²`, true));
  } else {
    resultRows.push(resultRow("Wymagany typ systemu oddymiania", "Grawitacyjny — klapy dymowe"));
    resultRows.push(resultRow("Acz,min — minimalna wymagana pow. czynna klapy dymowej", `${data.results.Acz?.toFixed(2).replace(".", ",")} m²`, true));
    resultRows.push(resultRow("Acz — dobrana pow. czynna klapy dymowej", `${data.actualVent.Acz.toFixed(2).replace(".", ",")} m²`, true));
    if (data.results.Akomp_geom) resultRows.push(resultRow("Ageom,komp,min — min. pow. geom. napowietrzania przez drzwi", `${data.results.Akomp_geom.toFixed(2).replace(".", ",")} m²`, true));
    if (data.results.Akomp_eff) resultRows.push(resultRow("Acz,komp,min — min. pow. efektywna innych otworów napowietrzających", `${data.results.Akomp_eff.toFixed(2).replace(".", ",")} m²`, true));
  }

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: resultRows }));
  children.push(spacer());

  // Stopka
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: "Dokument wygenerowany automatycznie przez Kalkulator CNBOP. Wymaga weryfikacji przez uprawnionego projektanta.", size: 16, color: "94A3B8", italics: true })],
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20 },
          paragraph: { spacing: { after: 0 } },
        },
      },
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
