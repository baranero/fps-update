import PageHeader from "@/components/Common/PageHeader";
import LegalPage from "@/components/Legal/LegalPage";
import { setRequestLocale } from "next-intl/server";

export const metadata = {
  title: "Polityka cookies | Fire Protection Solutions",
};

export default function PolitykaCookiesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <PageHeader page="cookies" />
      <LegalPage doc="cookies" />
    </>
  );
}
