import PageHeader from "@/components/Common/PageHeader";
import LegalPage from "@/components/Legal/LegalPage";
import { setRequestLocale } from "next-intl/server";

export const metadata = {
  title: "Polityka prywatności | Fire Protection Solutions",
};

export default function PolitykaPrywatnosciPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <PageHeader page="privacy" />
      <LegalPage doc="privacy" />
    </>
  );
}
