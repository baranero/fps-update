export default function Head() {
  return (
    <>
      {/* Podstawowe tagi SEO */}
      <title>
        Fire Protection Solutions | Inżynieria Bezpieczeństwa Pożarowego
      </title>
      <meta
        name="description"
        content="Profesjonalne usługi z zakresu inżynierii bezpieczeństwa pożarowego. Opracowujemy: IBP, symulacje CFD, audyty i operaty ppoż. Warszawa, Łódź, Grodzisk Mazowiecki."
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="author" content="Jakub Baran" />
      <meta name="robots" content="index, follow" />

      {/* Tagi Open Graph (Social Media) */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Fire Protection Solutions | Inżynieria Bezpieczeństwa Pożarowego" />
      <meta property="og:description" content="Eksperckie opracowania z zakresu ochrony ppoż. dla Twojego biznesu. Działamy na terenie województw mazowieckiego i łódzkiego." />
      <meta property="og:url" content="https://fp-solutions.pl" />
      <meta property="og:site_name" content="Fire Protection Solutions" />

      {/* Ikona strony (Favicon) */}
      <link rel="icon" href="/favicon.webp"/>
    </>
  );
}