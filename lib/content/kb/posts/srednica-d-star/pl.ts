import type { KbContent } from "../../types";

// Polska (wiodąca) wersja artykułu. Tłumaczenie: ./en.ts
export const pl: KbContent = {
  title: "Ile komórek naprawdę potrzebujesz? Średnica charakterystyczna D* w praktyce",
  lead:
    "Rozdzielczość siatki w FDS ustawia się względem pożaru, nie względem rysunku architektury. Pokazujemy, jak policzyć D*, przełożyć je na wymiar komórki i uzasadnić wybór przed rzeczoznawcą — bez przepalania rdzenio-godzin.",
  tags: ["Siatka", "D*", "FDS", "Koszt obliczeń"],
  blocks: [
    {
      type: "p",
      text:
        "Najczęstsze pytanie na starcie projektu w FDS brzmi „jaką dać siatkę?”, a najczęstsza odpowiedź — „10 centymetrów, tak się zwykle robi”. Problem w tym, że 10 cm to świetna siatka dla pożaru 1 MW w hali i siatka bez sensu dla pożaru 10 MW w garażu albo dla płomienia 200 kW w pokoju hotelowym. Rozdzielczość w FDS nie jest cechą budynku — jest cechą **pożaru**, który w tym budynku palisz.",
    },
    {
      type: "p",
      text:
        "Miarą, która to porządkuje, jest średnica charakterystyczna pożaru D* (ang. characteristic fire diameter). Poniżej: skąd się bierze, jak przełożyć ją na `IJK` w namelist `&MESH`, gdzie przestaje wystarczać i ile realnie kosztuje każde jej zagęszczenie.",
    },

    { type: "h", n: "01", text: "Rozdzielczość pożaru, nie rozdzielczość geometrii" },
    {
      type: "p",
      text:
        "FDS liczy pożar jako symulację wielkich wirów (LES): duże struktury przepływu rozwiązuje bezpośrednio, małe — modeluje. Żeby wynik miał sens, siatka musi rozwiązać strukturę pióropusza: strefę spalania, wciąganie powietrza i pulsację płomienia. Jeżeli cały płomień mieści się w trzech komórkach, solver nie ma czym opisać mieszania — temperatura, prędkość i produkcja dymu wychodzą z modelu podsiatkowego, a nie z fizyki.",
    },
    {
      type: "p",
      text:
        "Stąd kryterium rozdzielczości: interesuje nas nie sam wymiar komórki δx, tylko stosunek D*/δx, czyli **na ile komórek rozłożony jest charakterystyczny rozmiar pożaru**. Ta sama siatka 10 cm daje D*/δx ≈ 10 dla 1 MW i ≈ 24 dla 10 MW — w pierwszym przypadku jest to solidny standard obliczeniowy, w drugim nadmiar, za który płacisz czasem obliczeń.",
    },

    { type: "h", n: "02", text: "Wzór i co w nim siedzi" },
    {
      type: "code",
      caption: "Średnica charakterystyczna pożaru — definicja z dokumentacji FDS",
      text: `D* = [ Q / (rho_inf * c_p * T_inf * sqrt(g)) ] ^ (2/5)

Q       [kW]          moc pozaru projektowego (HRR)
rho_inf = 1,204 kg/m3 gestosc powietrza otoczenia
c_p     = 1,005 kJ/(kg*K) cieplo wlasciwe powietrza
T_inf   = 293 K       temperatura otoczenia
g       = 9,81 m/s2   przyspieszenie ziemskie

dla warunkow normalnych mianownik = 1110  ->  D* = (Q / 1110) ^ 0,4`,
    },
    {
      type: "p",
      text:
        "Dla warunków normalnych mianownik jest stały i wynosi ok. 1110, więc w praktyce liczysz `D* = (Q̇ / 1110)^0,4` przy Q̇ w kilowatach. Cała reszta to dobór jednej liczby: mocy pożaru projektowego.",
    },
    {
      type: "note",
      title: "Którą moc wstawić",
      text:
        "Do wzoru wchodzi moc **projektowa (szczytowa)** scenariusza, a nie moc chwilowa. Przy krzywej t² początkowa faza wzrostu zawsze będzie gorzej rozwiązana niż faza rozwinięta — i to jest w porządku, bo kryteria ewakuacyjne sprawdzasz w fazie, w której pożar już rozwinął moc. Jeśli scenariusz ma kilka ognisk o różnej mocy, licz D* dla każdego osobno i siatkę dobierz do najmniejszego.",
    },

    { type: "h", n: "03", text: "Ile to jest w liczbach" },
    {
      type: "p",
      text:
        "Dokumentacja FDS (User's Guide i Validation Guide) posługuje się zakresem D*/δx od 4 (siatka zgrubna, rozpoznawcza) do 16 (siatka drobna, badawcza). Praktyczny punkt startu dla opracowań projektowych to okolice 10 — poniżej tabela δx dla trzech poziomów rozdzielczości:",
    },
    {
      type: "table",
      caption: "Wymiar komórki δx [m] dla typowych mocy pożaru projektowego",
      head: ["Moc pożaru Q̇", "D* [m]", "D*/δx = 4 (zgrubna)", "D*/δx = 10 (standard)", "D*/δx = 16 (drobna)"],
      rows: [
        ["1 MW", "0,96", "0,24", "0,096", "0,060"],
        ["2,5 MW", "1,38", "0,35", "0,138", "0,086"],
        ["5 MW", "1,83", "0,46", "0,183", "0,114"],
        ["10 MW", "2,41", "0,60", "0,241", "0,151"],
      ],
    },
    {
      type: "p",
      text:
        "Widać stąd rzecz, która bywa zaskoczeniem: pożar 10 MW nie wymaga drobniejszej siatki niż pożar 1 MW — wymaga **grubszej**. Mocniejszy pożar jest fizycznie większy, więc jego struktura mieści się na mniejszej liczbie większych komórek. To, co realnie zmusza do zagęszczania, to małe ogniska i wąskie elementy geometrii, nie megawaty.",
    },

    { type: "h", n: "04", text: "Od δx do IJK: dwie reguły przy wpisywaniu &MESH" },
    {
      type: "p",
      text:
        "Wymiar komórki z tabeli jest wartością docelową, nie nakazem. Zanim trafi do wsadu, przepuść go przez dwa filtry.",
    },
    {
      type: "list",
      ordered: true,
      items: [
        "**Geometria musi się dzielić przez δx.** Komórka ma pokrywać się z płaszczyznami ścian, stropów i krawędzi otworów. FDS i tak „przyciągnie” geometrię do siatki (`OBST` puchnie lub znika), więc lepiej zaokrąglić δx do wartości dzielącej wymiary kondygnacji niż tłumaczyć potem, skąd wzięła się ściana o 4 cm grubsza.",
        "**Liczby komórek powinny rozkładać się na czynniki 2, 3 i 5.** Solver Poissona w FDS korzysta z szybkiej transformaty i pracuje efektywnie, gdy każda liczba z `IJK` ma postać 2^l · 3^m · 5^n. Liczba pierwsza w `IJK` (np. 61) potrafi wyraźnie spowolnić obliczenia przy zerowym zysku dokładności.",
        "**Komórki trzymaj możliwie sześcienne.** Wydłużanie komórki w jednej osi psuje odwzorowanie pióropusza; stosunek boków dalszy niż ok. 2:1 traktuj jako świadomy kompromis, nie jako domyślną opcję.",
      ],
    },
    {
      type: "code",
      caption: "Pomieszczenie 6,0 × 4,8 × 3,6 m, pożar 1 MW, δx = 0,10 m (D*/δx ≈ 10)",
      text: `&MESH IJK=60,48,36, XB=0.0,6.0, 0.0,4.8, 0.0,3.6 /

! 60 = 2^2 · 3 · 5      6,0 / 60 = 0,10 m
! 48 = 2^4 · 3          4,8 / 48 = 0,10 m
! 36 = 2^2 · 3^2        3,6 / 36 = 0,10 m
! razem 103 680 komórek, komórka sześcienna`,
    },
    {
      type: "p",
      text:
        "Przy podziale na wiele siatek (obliczenia równoległe MPI) dochodzi trzecia zasada: siatki muszą się stykać komórka w komórkę. Granicę prowadź tam, gdzie przepływ jest spokojny — przez pióropusz, strumień z nawiewu ani przez otwór dymowy nie powinna przechodzić.",
    },
    {
      type: "code",
      caption: "Dwie siatki o zgodnych krawędziach — granica poza obszarem pożaru",
      text: `&MESH ID='M1', IJK=60,48,36, XB= 0.0, 6.0, 0.0,4.8, 0.0,3.6 /
&MESH ID='M2', IJK=60,48,36, XB= 6.0,12.0, 0.0,4.8, 0.0,3.6 /`,
    },

    { type: "h", n: "05", text: "Czego D* nie obejmuje" },
    {
      type: "p",
      text:
        "Kryterium D* dotyczy pożaru. Model zawiera jednak elementy, których charakterystyczny wymiar bywa mniejszy niż pióropusz — i to one, a nie ognisko, wyznaczają wtedy siatkę:",
    },
    {
      type: "list",
      items: [
        "otwory i szczeliny (drzwi uchylone, kratki, przewężenia) — na sam otwór potrzeba kilku komórek, inaczej przepływ przez niego jest fikcją;",
        "nawiewy i kurtyny powietrzne o dużej prędkości — strugę trzeba rozwiązać, żeby nie „rozmyła się” w pierwszej komórce;",
        "warstwa przyścienna przy pomiarach temperatury przegród (`BNDF`) i przy oddymianiu grawitacyjnym pod stropem;",
        "cienkie przegrody i szyby — obiekt cieńszy niż komórka i tak zostanie zaokrąglony do jej wymiaru.",
      ],
    },
    {
      type: "note",
      title: "Sygnał ostrzegawczy",
      text:
        "Jeśli wynik zmienia się skokowo po drobnej korekcie geometrii (przesunięcie ściany o pół komórki, zmiana wysokości otworu o 5 cm), to zwykle nie jest efekt fizyczny, tylko sygnał, że siatka jest za rzadka względem tego, co ma opisywać.",
    },

    { type: "h", n: "06", text: "Badanie wrażliwości siatki — czego oczekuje rzeczoznawca" },
    {
      type: "p",
      text:
        "Sama wartość D*/δx nie jest dowodem poprawności — to punkt startowy. Argumentem, który broni się w uzgodnieniu, jest pokazanie, że wynik przestał zależeć od siatki. Minimalny, uczciwy zakres takiego badania:",
    },
    {
      type: "list",
      items: [
        "policz scenariusz na siatce docelowej i na siatce zagęszczonej (typowo δx i 0,5·δx w obszarze pożaru);",
        "porównaj wielkości, na których opierasz ocenę — zasięg widzialności na wysokości 1,8 m, temperaturę w płaszczyźnie ewakuacji, wysokość warstwy dymu, a nie „ogólny wygląd dymu” w Smokeview;",
        "udokumentuj różnicę liczbowo i wskaż, czy wpływa na spełnienie kryterium; różnica kilku procent przy zapasie do progu jest argumentem, różnica 30% przy wyniku granicznym — nie;",
        "zapisz w opracowaniu przyjęte D*, δx i wynikające z nich D*/δx wraz z liczbą komórek każdej siatki.",
      ],
    },

    { type: "h", n: "07", text: "Cena rozdzielczości: dlaczego „dwa razy drobniej” to ~16 razy drożej" },
    {
      type: "p",
      text:
        "Zmniejszenie komórki o połowę daje osiem razy więcej komórek (trzy wymiary). Do tego warunek stabilności CFL wiąże krok czasowy z wymiarem komórki, więc mniejsza komórka wymusza mniej więcej dwa razy więcej kroków czasowych na tę samą sekundę symulacji. Razem: **około szesnastokrotny wzrost kosztu obliczeń** za jeden poziom zagęszczenia.",
    },
    {
      type: "table",
      caption: "Ten sam model, dwa poziomy rozdzielczości",
      head: ["Wariant", "δx", "Liczba komórek", "Względny koszt"],
      rows: [
        ["Docelowy", "0,10 m", "103 680", "1×"],
        ["Zagęszczony", "0,05 m", "829 440", "≈ 16×"],
      ],
    },
    {
      type: "p",
      text:
        "Dlatego zagęszczenie „na wszelki wypadek”, zastosowane do całej domeny, jest najdroższym z możliwych sposobów kupowania spokoju. Tańsza i lepiej broniona strategia to siatka dobrana do D* w całym modelu i lokalne zagęszczenie tam, gdzie decyduje się wynik: nad ogniskiem, w otworach, w rejonie punktów pomiarowych.",
    },
    {
      type: "cta",
      text: "Masz gotowy plik .fds i chcesz wiedzieć, ile potrwa i ile będzie kosztować przy tej siatce?",
      linkText: "Sprawdź w estymatorze",
      href: "/symulacje/nowa",
    },
  ],
};
