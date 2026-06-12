export type NavigationItem = {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export const primaryNavigation: NavigationItem[] = [
  {
    to: "/",
    label: "Inbox Triage",
    icon: "mail",
    exact: true,
  },
  {
    to: "/calendar",
    label: "Calendar",
    icon: "calendar_month",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: "settings",
  },
];

export const mobileNavigation: NavigationItem[] = [
  {
    to: "/",
    label: "Inbox",
    icon: "mail",
    exact: true,
  },
  {
    to: "/calendar",
    label: "Calendar",
    icon: "calendar_month",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: "settings",
  },
];
