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
