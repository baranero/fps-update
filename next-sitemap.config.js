/** @type {import('next-sitemap').IConfig} */

// Mapa witryny USŁUGOWEJ (fp-solutions.pl). Serwis chmurowy ma własną domenę
// (fdsrun.com) i własną mapę — dlatego ścieżki chmury oraz strefa konta są tu
// wykluczone, żeby nie zgłaszać Google adresów, które i tak przekierowują.
//
// Uwaga: /symulacje* wykluczamy z SITEMAPY, ale świadomie NIE blokujemy w
// robots.txt — roboty mają przejść przez 301 na fdsrun.com i przenieść moc linków.
const PRIVATE_PATHS = [
  '/signin',
  '/signup',
  '/auth',
  '/narzedzia/admin',
  '/narzedzia/profil',
  '/narzedzia/raporty',
];

// Serwis wyłącznie polski — bez wariantów /en. next-sitemap czyta jednak
// manifest tras Next, w którym ścieżki NIOSĄ prefiks języka (/pl/...), a reguły
// niżej zapisujemy w formie kanonicznej (bez prefiksu). Każdą regułę rozwijamy
// więc na obie postacie — bez tego żadne wykluczenie nie łapie.
const withLocales = (paths) => paths.flatMap((p) => [p, `/pl${p}`]);

module.exports = {
  siteUrl: 'https://fp-solutions.pl',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'weekly',
  priority: 0.7,
  trailingSlash: false,

  exclude: [
    // Wersja angielska istnieje WYŁĄCZNIE na fdsrun.com — na witrynie usługowej
    // każdy adres /en/* odpowiada przekierowaniem na wariant polski, więc w tej
    // mapie byłby wyłącznie zbiorem 301-ek do wyindeksowania.
    '/en',
    '/en/*',
    ...withLocales([
      ...PRIVATE_PATHS,
      ...PRIVATE_PATHS.map((p) => `${p}/*`),
      '/symulacje',
      '/symulacje/*',
      // Strony produktowe chmury — na fp-solutions.pl odpowiadają 301 na
      // fdsrun.com, więc w mapie witryny usługowej nie mają czego szukać.
      '/funkcje',
      '/cennik',
      '/baza-wiedzy',
      '/baza-wiedzy/*',
    ]),
  ],

  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: withLocales(PRIVATE_PATHS),
      },
    ],
  },
};
