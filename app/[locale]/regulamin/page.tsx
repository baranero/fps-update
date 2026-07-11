import PageHeader from "@/components/Common/PageHeader";
import LegalPage from "@/components/Legal/LegalPage";
import { setRequestLocale } from "next-intl/server";

export const metadata = {
  title: "Regulamin | Fire Protection Solutions",
};

export default function RegulaminPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return (
    <>
      <PageHeader page="regulamin" />
      <LegalPage doc="regulamin" />
    </>
  );
}
