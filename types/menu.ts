export type Menu = {
  id: number;
  title: string;
  /** Klucz i18n w przestrzeni "nav" (np. "home", "offer.ibp"). */
  key?: string;
  path?: string;
  newTab: boolean;
  highlight?: boolean;
  submenu?: Menu[];
};
