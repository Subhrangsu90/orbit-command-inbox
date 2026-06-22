import { 
  Sparkles, 
  Search, 
  Mail, 
  Calendar, 
  FileText 
} from "lucide-react";

export interface TimelineStep {
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface IntentRegistryEntry {
  id: string;
  test: (q: string) => boolean;
  keywords: string[];
  getSteps: (q: string) => TimelineStep[];
}

// Registry of workspace intents. Adding a new tool is as simple as adding an entry to this array.
export const intentRegistry: IntentRegistryEntry[] = [
  {
    id: "gmail",
    test: (q) => /mail|email|draft|send|reply|inbox|subject|recipient/i.test(q),
    keywords: ["mail", "email", "draft", "send", "reply", "inbox", "subject", "recipient", "to:", "cc:"],
    getSteps: () => [
      {
        label: "Analyzing Email Request",
        desc: "Resolving recipient addresses, subject lines, and body content",
        icon: Sparkles,
      },
      {
        label: "Accessing Gmail Inbox",
        desc: "Fetching related threads or checking drafts folder",
        icon: Search,
      },
      {
        label: "Executing Email Actions",
        desc: "Creating draft or sending reply via Gmail API",
        icon: Mail,
      },
      {
        label: "Finalizing Response",
        desc: "Providing draft preview and email status",
        icon: FileText,
      },
    ],
  },
  {
    id: "calendar",
    test: (q) => /schedule|event|meeting|calendar|appointment/i.test(q),
    keywords: ["schedule", "event", "meeting", "calendar", "appointment", "tomorrow"],
    getSteps: () => [
      {
        label: "Analyzing Calendar Request",
        desc: "Parsing date, time, title, and guest lists",
        icon: Sparkles,
      },
      {
        label: "Checking Schedule Conflicts",
        desc: "Scanning calendar for potential conflicts & bookings",
        icon: Search,
      },
      {
        label: "Executing Calendar Actions",
        desc: "Scheduling event and sending invitations",
        icon: Calendar,
      },
      {
        label: "Finalizing Schedule Summary",
        desc: "Providing meeting links and schedule confirmation",
        icon: FileText,
      },
    ],
  },
];
