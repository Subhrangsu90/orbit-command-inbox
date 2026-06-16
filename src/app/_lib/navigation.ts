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
    items: [
      {
        to: "/chat",
        label: "Agent Chat",
        icon: "forum",
      },
    ],
  },
  {
    label: "Email",
    icon: "mail",
    items: [
      {
        to: "/?mailbox=inbox",
        label: "Inbox",
        icon: "inbox",
        exact: true,
      },
      {
        to: "/?mailbox=starred",
        label: "Starred",
        icon: "star",
        exact: true,
      },
      {
        to: "/?mailbox=sent",
        label: "Sent",
        icon: "send",
        exact: true,
      },
      {
        to: "/?mailbox=drafts",
        label: "Drafts",
        icon: "draft",
        exact: true,
      },
    ],
  },
  {
    items: [
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
