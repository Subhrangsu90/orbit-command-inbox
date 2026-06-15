export const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-cyan-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-500",
] as const;

export function getSenderInitials(name: string, email: string) {
  const source = name && name !== "Unknown sender" ? name : email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function getAvatarColor(value: string) {
  const hash = [...value].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function mailboxDisplayName(mailbox: string) {
  return (
    {
      inbox: "Inbox",
      starred: "Starred",
      sent: "Sent",
      drafts: "Drafts",
    }[mailbox] ?? "Inbox"
  );
}
