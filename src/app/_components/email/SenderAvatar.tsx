import {
  getAvatarColor,
  getSenderInitials,
} from "~/app/_utils/emailPresentation";

type SenderAvatarProps = {
  name: string;
  email: string;
  size?: "sm" | "md";
};

export function SenderAvatar({ name, email, size = "sm" }: SenderAvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${
        size === "md" ? "size-10 text-xs" : "size-9 text-[11px]"
      } ${getAvatarColor(email || name)}`}
      aria-label={name}
      title={email || name}
    >
      {getSenderInitials(name, email)}
    </div>
  );
}
