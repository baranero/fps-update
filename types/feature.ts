export type Feature = {
  id: number;
  icon: JSX.Element;
  /** Klucz i18n w przestrzeni "features" (np. "ssp"). */
  key: string;
  title: string;
  paragraph: string;
  href: string;
  isNew?: boolean;
};
