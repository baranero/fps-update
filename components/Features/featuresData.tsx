import { Feature } from "@/types/feature";
import { FaBuilding, FaFan, FaFireAlt, FaFireExtinguisher, FaTrashAlt } from "react-icons/fa";
import { MdOutlineFireplace } from "react-icons/md";
import { FaExplosion } from "react-icons/fa6";
import { LuAlarmSmoke } from "react-icons/lu";
import { PiStairsBold } from "react-icons/pi";

const featuresData: Feature[] = [
  {
    id: 1,
    icon: <FaFireExtinguisher size={35} />,
    href: "/ibp",
    title: "Instrukcja Bezpieczeństwa Pożarowego",
    paragraph:
      "Opracowanie nowej Instrukcji Bezpieczeństwa Pożarowego (IBP) oraz obowiązkowe aktualizacje istniejącej dokumentacji.",
  },
  {
    id: 2,
    icon: <MdOutlineFireplace size={35} />,
    href: "/cfd",
    title: "Symulacje CFD",
    paragraph:
      "Modelowanie rozwoju pożaru i rozprzestrzeniania dymu. Analiza warunków bezpiecznej ewakuacji (ASET vs RSET).",
  },
  {
    id: 3,
    icon: <FaTrashAlt size={35} />,
    href: "/operat",
    title: "Operat przeciwpożarowy",
    paragraph:
      "Kompletna dokumentacja wymagana do uzyskania zezwolenia na zbieranie lub przetwarzanie odpadów.",
  },
  {
    id: 4,
    icon: <FaBuilding size={35} />,
    href: "/audyt",
    title: "Audyt przeciwpożarowy",
    paragraph:
      "Szczegółowa weryfikacja stanu technicznego obiektu pod kątem zgodności z aktualnymi przepisami ochrony ppoż.",
  },
  {
    id: 5,
    icon: <FaFireAlt size={35} />,
    href: "/scenariusz",
    title: "Scenariusz rozwoju pożaru",
    paragraph:
      "Opis sekwencji zdarzeń i algorytmu działania systemów zabezpieczeń w przypadku wystąpienia pożaru.",
  },
  /* Odkomentuj poniższe usługi, jeśli chcesz je wyświetlić na stronie:
  {
    id: 6,
    icon: <FaExplosion size={35} />,
    href: "/ocena-zagrozenia-wybuchem",
    title: "Ocena zagrożenia wybuchem",
    paragraph: "Wyznaczanie stref zagrożenia wybuchem oraz opracowanie dokumentu zabezpieczenia przed wybuchem.",
  },
  {
    id: 7,
    icon: <LuAlarmSmoke size={35} />,
    href: "/ssp",
    title: "Projekt systemów SSP",
    paragraph: "Kompleksowe projekty systemów sygnalizacji pożarowej dostosowane do specyfiki obiektu.",
  },
  {
    id: 8,
    icon: <PiStairsBold size={35} />,
    href: "/oddymianie",
    title: "Systemy oddymiania",
    paragraph: "Projekty systemów oddymiania grawitacyjnego i mechanicznego dla klatek schodowych i hal.",
  },
  */
];

export default featuresData;