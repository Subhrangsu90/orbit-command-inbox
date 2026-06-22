export type NavigationItem = {
  to: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export type NavigationGroup = {
  label?: string;
  icon?: string;
  items: NavigationItem[];
};

export const primaryNavigationGroups: NavigationGroup[] = [
  {
    label: "Agent",
    icon: "forum",
    items: [
      {
        to: "/chat",
        label: "Agent Chat",
        icon: "forum",
      },
    ],
  },
  {
    label: "Mail",
    icon: "mail",
    items: [
      {
        to: "/mail?mailbox=inbox",
        label: "Inbox",
        icon: "inbox",
        exact: true,
      },
      {
        to: "/mail?mailbox=starred",
        label: "Starred",
        icon: "star",
        exact: true,
      },
      {
        to: "/mail?mailbox=sent",
        label: "Sent",
        icon: "send",
        exact: true,
      },
      {
        to: "/mail?mailbox=drafts",
        label: "Drafts",
        icon: "draft",
        exact: true,
      },
    ],
  },
  {
    label: "Calendar",
    icon: "calendar_month",
    items: [
      {
        to: "/calendar",
        label: "Calendar",
        icon: "calendar_month",
      },
    ],
  },
  {
    items: [
      {
        to: "/settings",
        label: "Settings",
        icon: "settings",
      },
    ],
  },
];

export const mobileNavigation: NavigationItem[] = [
  {
    to: "/chat",
    label: "Agent Chat",
    icon: "forum",
  },
  {
    to: "/mail?mailbox=inbox",
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

export type SidebarSubItem = {
  href: string;
  label: string;
  icon: string;
};

export type SidebarTab = {
  id: string;
  label: string;
  icon: string;
  href: string;
  subItems?: SidebarSubItem[];
};

export const sidebarTabs: SidebarTab[] = [
  {
    id: "agent",
    label: "Agent Chat",
    icon: "forum",
    href: "/chat",
  },
  {
    id: "mail",
    label: "Mailbox",
    icon: "mail",
    href: "/mail?mailbox=inbox",
    subItems: [
      { href: "/mail?mailbox=inbox", label: "Inbox", icon: "inbox" },
      { href: "/mail?mailbox=starred", label: "Starred", icon: "star" },
      { href: "/mail?mailbox=sent", label: "Sent", icon: "send" },
      { href: "/mail?mailbox=drafts", label: "Drafts", icon: "draft" },
    ],
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: "calendar_month",
    href: "/calendar",
    subItems: [
      { href: "/calendar", label: "Calendar Agenda", icon: "calendar_month" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    href: "/settings",
    subItems: [
      { href: "/settings?tab=account", label: "Profile", icon: "account_circle" },
      { href: "/settings?tab=appearance", label: "Personalization", icon: "palette" },
      { href: "/settings?tab=shortcuts", label: "Keyboard shortcuts", icon: "keyboard" },
      { href: "/settings?tab=integrations", label: "Connected services", icon: "extension" },
    ],
  },
];

