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

const withLocales = (paths) => paths.flatMap((p) => [p, `/en${p}`]);

module.exports = {
  siteUrl: 'https://fp-solutions.pl',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'weekly',
  priority: 0.7,
  trailingSlash: false,

  exclude: withLocales([
    ...PRIVATE_PATHS,
    ...PRIVATE_PATHS.map((p) => `${p}/*`),
    '/symulacje',
    '/symulacje/*',
  ]),

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
