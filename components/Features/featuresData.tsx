import { Feature } from "@/types/feature";
import { FaBuilding, FaFan, FaFireAlt, FaFireExtinguisher } from "react-icons/fa";
import { MdOutlineFireplace } from "react-icons/md";
import { FaDoorOpen } from "react-icons/fa";
import { FaTrashAlt } from "react-icons/fa";
import { FaExplosion } from "react-icons/fa6";
import { LuAlarmSmoke } from "react-icons/lu";
import { PiStairsBold } from "react-icons/pi";


const featuresData: Feature[] = [
  {
    id: 1,
    icon: (
      <FaFireExtinguisher size={35} />
    ),
    href: "/ibp",
    title: "Instrukcja Bezpieczeństwa Pożarowego",
    paragraph:
      "Instrukcja bezpieczeństwa pożarowego (IBP) oraz jej aktualizacja.",
  },
  {
    id: 2,
    icon: (
      <MdOutlineFireplace size={35}/>
    ),
    href: "/cfd",
    title: "Symulacje CFD",
    paragraph:
      "Model rozwoju pożaru, skuteczności wentylacji, warunków bezpiecznej ewakuacji",
  },
  {
    id: 3,
    icon: (
      <FaTrashAlt size={35}/>
    ),
    href: "/operat",
    title: "Operat przeciwpożarowy",
    paragraph:
      "Uzyskanie zezwolenia na zbieranie odpadów lub zezwolenie na przetwarzanie odpadów.",
  },
  {
    id: 4,
    icon: (
<FaBuilding size={35} />
    ),
    href: "/audyt",
    title: "Audyt przeciwpożarowy",
    paragraph:
      "Spis wymagań i niezgodności w obiekcie z zakresu ochrony ppoż.",
  },
  {
    id: 5,
    icon: (
<FaFireAlt size={35} />
    ),
    href: "/scenariusz",
    title: "Scenariusz rozwoju pożaru",
    paragraph:
      "Opis sekwencji możliwych zdarzeń w czasie rozwoju pożaru.",
  },
  {
    id: 6,
    icon: (
<FaExplosion size={35}/>
    ),
    href: "/ocena-zagrozenia-wybuchem",
    title: "Ocena zagrożenia wybuchem",
    paragraph:
      "Wyznaczenie stref zagrożenia wybuchem.",
  },
  {
    id: 7,
    icon: (
      <LuAlarmSmoke size={35}/>
    ),
    href: "/ssp",
    title: "Projekt Systemu Sygnalizacji Pożarowej",
    paragraph:
      "System detekcji pożaru.",
  },
  {
    id: 8,
    icon: (
<PiStairsBold size={35}/>
    ),
    href: "/oddymianie-grawitacyjne",
    title: "Projekt systemu oddymiania grawitacyjnego",
    paragraph:
      "Oddymianie grawitacyjne klatek schodowych i budynków PM.",
  },
  {
    id: 9,
    icon: (
      <FaFan size={35} />
    ),
    href: "/oddymianie-mechaniczne",
    title: "Projekt systemu oddymiania mechanicznego",
    paragraph:
      "Oddymianie mechaniczne klatek schodowych i budynków PM.",
  },
];
export default featuresData;
