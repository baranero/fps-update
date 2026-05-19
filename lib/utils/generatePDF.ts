import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Step4Data } from "@/lib/calculations/cnbop";

export interface CNBOPReportData {
  projectName?: string;
  date: string;
  step1: {
    categoryZL: string;
    buildingHeightGroup: string;
    numberOfFloorsTotal: number;
    numberOfFloorsAbove: number;
    numberOfFloorsBelow: number;
    stairwellEnclosure: string;
    selfClosers: boolean;
  };
  step2: {
    AKS: string; A: string; B: string; C: string; D: string; AKS_O: number;
  };
  step4: Step4Data;
  actualVent: { Acz: number; Ageom: number };
  compCalc: { providedAcz: number; providedAgeom: number; providedAeff: number };
  results: {
    systemType: "GRAVITATIONAL" | "MECHANICAL";
    cfnWarnings: { cfnC: boolean; cfnD: boolean; cfnAKS: boolean; cfnSerialDoors: boolean; };
    vn_min?: number; vn_p?: number; vn1?: number; vn_v?: number; vn2?: number; vn_max?: number; v_went?: number; totalPressure?: number; Acz?: number;
    Aodd_geom?: number; Akomp_eff?: number;
  };
}

const CONTACT_EMAIL = "biuro@fp-solutions.pl";

const VENT_METHOD_LABELS: Record<string, string> = {
  'dimensions': 'Podano wymiary klapy: szerokość × wysokość × współczynnik aerodynamiczny Cv × liczba sztuk',
  'geom_cv': 'Podano powierzchnię geometryczną klapy i współczynnik aerodynamiczny Cv',
  'acz_cv': 'Podano bezpośrednio wymaganą powierzchnię czynną Acz',
};

const HEIGHT_GROUP_LABELS: Record<string, string> = {
  'N': 'Niski (N) — do 12 m lub do 4 kond.',
  'SW': 'Średniowysoki (SW) — 12–25 m lub 5–9 kond.',
  'W': 'Wysoki (W) — 25–55 m lub 10–18 kond.',
  'WW': 'Wysokościowy (WW) — powyżej 55 m lub 18 kond.',
};

async function loadFontFromURL(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function generateEngineeringPDF(data: CNBOPReportData, fileName: string = "Raport_CNBOP.pdf") {
  try {
    const doc = new jsPDF("p", "mm", "a4");

    try {
      const robotoRegular = await loadFontFromURL("https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf");
      const robotoBold = await loadFontFromURL("https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf");
      doc.addFileToVFS("Roboto-Regular.ttf", robotoRegular);
      doc.addFileToVFS("Roboto-Bold.ttf", robotoBold);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      doc.setFont("Roboto");
    } catch (e) {
      console.warn("Failed to load fonts for PDF", e);
    }

    const primaryColor: [number, number, number] = [30, 58, 138];
    const secondaryColor: [number, number, number] = [15, 118, 110];
    const textColor: [number, number, number] = [51, 65, 85];
    const lightGray: [number, number, number] = [241, 245, 249];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(22);
    doc.text("KARTA DOBORU SYSTEMU ODDYMIANIA", 14, 20);

    doc.setFontSize(11);
    doc.setFont("Roboto", "normal");
    doc.text("Raport z obliczeń inżynierskich wg wytycznych CNBOP-PIB W-0003:2016", 14, 28);

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont("Roboto", "bold");
    doc.text(`Data wygenerowania:`, 14, 50);
    doc.setFont("Roboto", "normal");
    doc.text(`${data.date}`, 55, 50);

    doc.setFont("Roboto", "bold");
    doc.text(`Typ instalacji:`, 100, 50);
    doc.setFont("Roboto", "normal");
    doc.text(data.results.systemType === "MECHANICAL" ? "Nawiew Mechaniczny" : "Oddymianie Grawitacyjne", 130, 50);

    const commonTableStyles = { font: "Roboto", fontSize: 10, textColor, cellPadding: 6, lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.1 };
    const headerStyles = { fillColor: lightGray, textColor: primaryColor, fontStyle: "bold" as const, fontSize: 11 };

    // 1. Parametry Architektoniczne
    autoTable(doc, {
      startY: 60, theme: "plain", styles: commonTableStyles, headStyles: headerStyles,
      head: [["1. Parametry Architektoniczne Obiektu", "Wartość"]],
      body: [
        ["Kategoria zagrożenia ludzi (ZL)", data.step1.categoryZL],
        ["Klasyfikacja wysokości budynku wg § 8 WT", HEIGHT_GROUP_LABELS[data.step1.buildingHeightGroup] ?? data.step1.buildingHeightGroup],
        ["Liczba kondygnacji nadziemnych", data.step1.numberOfFloorsAbove.toString()],
        ["Liczba kondygnacji podziemnych", data.step1.numberOfFloorsBelow.toString()],
        ["Łączna liczba kondygnacji obsługiwanych przez system", data.step1.numberOfFloorsTotal.toString()],
        ["Wydzielenie pożarowe klatki schodowej (min. EI 30)", data.step1.stairwellEnclosure === "ppoż" ? "Tak — obudowana z drzwiami PPOŻ" : "Nie — brak pełnej obudowy lub certyfikowanych drzwi"],
        ["Wyposażenie drzwi wejściowych w samozamykacze", data.step1.selfClosers ? "Kompletne (100% drzwi na klatkę)" : "Niekompletne — brak części samozamykaczy"],
      ],
      alternateRowStyles: { fillColor: [250, 250, 250] }, columnStyles: { 0: { cellWidth: 130 }, 1: { fontStyle: "bold" } },
    });

    // 2. Parametry Geometryczne — A, B, C, D jako składowe AKS-O
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10, theme: "plain", styles: commonTableStyles, headStyles: headerStyles,
      head: [["2. Geometria Klatki Schodowej (A KS-O = A + B + C + D)", "Wartość [m²]"]],
      body: [
        ["Rzeczywista powierzchnia klatki (A KS) — wyłącznie do weryfikacji warunku CFD", data.step2.AKS],
        ["  A — suma rzutów poziomych biegów schodowych", data.step2.A],
        ["  B — suma wymiarowych spoczników schodowych", data.step2.B],
        ["  C — otwory przelotowe między kondygnacjami (np. przeszklenia stropów)", data.step2.C],
        ["  D — dusza schodów (centralny prześwit pionowy)", data.step2.D],
        ["Obliczeniowa pow. klatki A KS-O = A + B + C + D", data.step2.AKS_O.toFixed(2).replace('.', ',')],
      ],
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { fontStyle: "bold" },
      },
      didParseCell: (hookData: any) => {
        if (hookData.row.index === 5 && hookData.section === 'body') {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = primaryColor;
        }
      },
    });

    const checkPageBreak = (spaceNeeded: number) => {
      if ((doc as any).lastAutoTable.finalY + spaceNeeded > 270) {
        doc.addPage();
        (doc as any).lastAutoTable.finalY = 20;
      }
    };

    // Ostrzeżenia CFD
    const hasCfdWarnings = data.results.cfnWarnings.cfnC || data.results.cfnWarnings.cfnD || data.results.cfnWarnings.cfnAKS || data.results.cfnWarnings.cfnSerialDoors;
    if (hasCfdWarnings) {
      checkPageBreak(50);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10, theme: "plain", styles: commonTableStyles,
        headStyles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], fontStyle: "bold", fontSize: 11 },
        head: [["Ostrzeżenie: Wymagana weryfikacja symulacją CFD (rozdz. 7.1 wytycznych)"]],
        body: [
          ...(data.results.cfnWarnings.cfnC ? [["• Powierzchnia otworów przelotowych (C) przekracza 10% sumy A+B"]] : []),
          ...(data.results.cfnWarnings.cfnD ? [["• Powierzchnia duszy schodów (D) przekracza 25% sumy A+B"]] : []),
          ...(data.results.cfnWarnings.cfnAKS ? [["• Rzeczywista pow. klatki (A KS) na kondygnacji przekracza 40 m²"]] : []),
          ...(data.results.cfnWarnings.cfnSerialDoors ? [["• Napływ grawitacyjny prowadzony przez dwoje drzwi w szeregu oddalonych o ponad 5 m"]] : []),
        ],
        columnStyles: { 0: { textColor: [153, 27, 27], fontStyle: "bold" } },
      });
      // Kontakt w sprawie CFD
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 2, theme: "plain",
        styles: { ...commonTableStyles, fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: "bold", fontSize: 9 },
        head: [["Potrzebujesz symulacji CFD? Skontaktuj się w celu wyceny projektu."]],
        body: [[`E-mail: ${CONTACT_EMAIL}     Tel: +48 790 782 993`]],
        columnStyles: { 0: { textColor: [146, 64, 14] } },
      });
    }

    // 3. Klapa dymowa — dobór i weryfikacja
    checkPageBreak(60);
    let ventDesc = "";
    if (data.step4.ventInputMethod === 'dimensions') {
      ventDesc = `${data.step4.ventWidth} m × ${data.step4.ventHeight} m, Cv = ${data.step4.cv}, liczba sztuk: ${data.step4.count}`;
    } else if (data.step4.ventInputMethod === 'geom_cv') {
      ventDesc = `Powierzchnia geometryczna Aₑₐₒₘ = ${data.step4.ventAgeom} m², Cv = ${data.step4.cv}`;
    } else {
      ventDesc = `Powierzchnia czynna Aᴄᴢ= ${data.step4.ventAcz} m²`;
    }

    const ventOk = data.actualVent.Acz >= (data.results.Acz || 0);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10, theme: "plain", styles: commonTableStyles, headStyles: headerStyles,
      head: [["3. Dobór Klapy Dymowej", "Wartość"]],
      body: [
        ["Metoda wprowadzania parametrów klapy", VENT_METHOD_LABELS[data.step4.ventInputMethod]],
        ["Wprowadzone dane klapy", ventDesc],
        ["Powierzchnia geometryczna klapy dymowej (Aₑₐₒₘ, dobrana)", `${data.actualVent.Ageom.toFixed(2).replace('.', ',')} m²`],
        ["Powierzchnia czynna klapy dymowej (Aᴄᴢ, dobrana)", `${data.actualVent.Acz.toFixed(2).replace('.', ',')} m²`],
        ["Minimalna wymagana pow. czynna klapy wg CNBOP (Aᴄᴢ, min)", `${data.results.Acz?.toFixed(2).replace('.', ',')} m²`],
        ["Status klapy dymowej", ventOk ? "SPEŁNIONY — dobrana klapa pokrywa wymagane minimum" : "NIEWYSTARCZAJĄCY — wymagana klapa o większej pow. czynnej"],
      ],
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 0: { cellWidth: 130 }, 1: { fontStyle: "bold" } },
      didParseCell: (hookData: any) => {
        if (hookData.row.index === 5 && hookData.section === 'body') {
          hookData.cell.styles.textColor = ventOk ? [21, 128, 61] : [185, 28, 28];
        }
      },
    });

    // 4. Napowietrzanie — dobór i weryfikacja (tylko system grawitacyjny)
    if (data.results.systemType === "GRAVITATIONAL") {
      checkPageBreak(60);
      const compMethod = data.step4.compInputMethod;
      const groupCount = data.step4.compGroups.length;
      const compBody: any[] = [
        ["Metoda określenia urządzenia napowietrzającego", compMethod === 'known_acz' ? 'Podano bezpośrednio pow. czynną otworów napowietrzających (Aᴄᴢ_komp)' : `Wyliczono z wymiarów geometrycznych (${groupCount} ścież. napowietrzania)`],
      ];

      if (compMethod === 'known_acz') {
        compBody.push(["Zadeklarowana pow. czynna napowietrzania (Aᴄᴢ_komp, podana)", `${data.step4.compAcz} m²`]);
      } else {
        compBody.push(["Obliczona efektywna pow. napowietrzania (Aₑff_komp, obliczona)", `${data.compCalc.providedAeff.toFixed(2).replace('.', ',')} m²`]);
        compBody.push(["Suma geometryczna otworów napowietrzających (Aₑₐₒₘ_komp)", `${data.compCalc.providedAgeom.toFixed(2).replace('.', ',')} m²`]);
        if (data.results.Akomp_eff) {
          const compOk = data.compCalc.providedAeff >= data.results.Akomp_eff;
          compBody.push(["Wymagana minimalna pow. efektywna napowietrzania (Aₑff_komp, min = 1,3 × Aₑₐₒₘ_klapy)", `${data.results.Akomp_eff.toFixed(2).replace('.', ',')} m²`]);
          compBody.push(["Status napowietrzania", compOk ? "SPEŁNIONY — dobrana pow. pokrywa wymagane minimum" : "NIEWYSTARCZAJĄCY — wymagana większa powierzchnia napowietrzania"]);
        }
      }

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10, theme: "plain", styles: commonTableStyles, headStyles: headerStyles,
        head: [["4. Dobór Otworów Napowietrzających (Kompensacja)", "Wartość"]],
        body: compBody,
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: { 0: { cellWidth: 130 }, 1: { fontStyle: "bold" } },
        didParseCell: (hookData: any) => {
          const lastBodyIdx = compBody.length - 1;
          if (hookData.section === 'body' && hookData.row.index === lastBodyIdx && compMethod !== 'known_acz' && data.results.Akomp_eff) {
            const compOk = data.compCalc.providedAeff >= (data.results.Akomp_eff ?? 0);
            hookData.cell.styles.textColor = compOk ? [21, 128, 61] : [185, 28, 28];
          }
        },
      });
    }

    // 5. Nieszczelności (tylko system mechaniczny)
    if (data.results.systemType === "MECHANICAL") {
      checkPageBreak(50);
      const leakBody: any[] = [
        ["Efektywna powierzchnia nieszczelności przegród klatki (Aₑ)", `${data.step4.Ae} m²`],
        ["Sposób montażu i wyrzutu z wentylatora", data.step4.installationType === "wall" ? "Wyrzut ścienny — montaż bezpośredni (0 Pa strat)" : "Wyrzut kanałowy — wymaga obliczenia strat ciśnienia"],
        ["Zadeklarowana strata ciśnienia na instalacji kanałowej", `${data.step4.ductPressureLoss || '0'} Pa`],
      ];
      if (!data.step1.selfClosers && data.step4.openDoorArea) {
        leakBody.push(["Pow. ucieczki przez otwarte skrzydło drzwi (brak samozamykacza)", `${data.step4.openDoorArea} m²`]);
      }
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10, theme: "plain", styles: commonTableStyles, headStyles: headerStyles,
        head: [["5. Parametry Przepływowe i Nieszczelności (System Mechaniczny)", "Wartość"]], body: leakBody,
        alternateRowStyles: { fillColor: [250, 250, 250] }, columnStyles: { 0: { cellWidth: 130 }, 1: { fontStyle: "bold" } },
      });
    }

    // 6. Ostateczne wyniki
    checkPageBreak(80);
    const isMech = data.results.systemType === "MECHANICAL";
    const sectionNum = isMech ? 5 : 5;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15, theme: "grid",
      styles: { ...commonTableStyles, lineColor: primaryColor },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 12 },
      head: [[`${sectionNum}. OSTATECZNE WYNIKI OBLICZEŃ`, "Wartość"]],
      body: isMech ? [
        ["Strumień powietrza dla prędkości minimalnej 0,2 m/s (Vₙ_min)", `${data.results.vn_min} m³/h`],
        ["Strumień kompensacji nieszczelności przegród (Vₙ_p)", `${data.results.vn_p} m³/h`],
        ["Wymagany wydatek wentylatora dla zamkniętych drzwi (Vₙ₁)", `${data.results.vn1} m³/h`],
        ...(data.results.vn2 ? [
          ["Strumień ucieczki przez otwarte drzwi bez samozamykacza (Vₙ_v)", `${data.results.vn_v} m³/h`],
          ["Wymagany wydatek wentylatora dla otwartych drzwi (Vₙ₂)", `${data.results.vn2} m³/h`]
        ] : []),
        ["Ostateczny projektowy strumień nawiewu wentylatora (V_went)", `${data.results.v_went} m³/h`],
        ["Wymagany spręż dyspozycyjny wentylatora (ΔP)", `${data.results.totalPressure} Pa`],
        ["Minimalna wymagana pow. czynna klapy dymowej (Aᴄᴢ, min)", `${data.results.Acz?.toFixed(2).replace('.', ',')} m²`],
      ] : [
        ["Wymagany typ systemu oddymiania", "Grawitacyjny — klapy dymowe"],
        ["Minimalna wymagana pow. czynna klapy dymowej (Aᴄᴢ, min)", `${data.results.Acz?.toFixed(2).replace('.', ',')} m²`],
        ["Dobrana pow. czynna klapy dymowej (Aᴄᴢ, dobrana)", `${data.actualVent.Acz.toFixed(2).replace('.', ',')} m²`],
        ...(data.results.Akomp_eff ? [["Minimalna wymagana pow. efektywna napowietrzania (Aₑff_komp, min)", `${data.results.Akomp_eff.toFixed(2).replace('.', ',')} m²`]] : []),
      ],
      bodyStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 130, fontStyle: "bold" }, 1: { fontStyle: "bold", textColor: secondaryColor, fontSize: 11 } },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.5); doc.line(14, 282, 196, 282);
      doc.setFontSize(8); doc.setFont("Roboto", "normal"); doc.setTextColor(100, 116, 139);
      doc.text("Dokument wygenerowany automatycznie przez Kalkulator CNBOP. Wymaga weryfikacji przez uprawnionego projektanta.", 14, 287, { maxWidth: 160 });
      doc.text(`Strona ${i} z ${pageCount}`, 180, 287);
    }

    doc.save(fileName);
  } catch (error) {
    console.error("Błąd przy generowaniu PDF:", error);
    alert("Wystąpił błąd podczas generowania raportu PDF.");
  }
}
