"use client";

import type { RefObject } from "react";
import { Plus, Send, Mic, Calendar, Search, Mail } from "lucide-react";
import { Button } from "~/app/_components/ui/button";

interface ChatInputFormProps {
  isCentered: boolean;
  input: string;
  setInput: (value: string) => void;
  chatInputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  handleSend: (text: string) => void;
  handleCreateRoom: () => void;
}

export function ChatInputForm({
  isCentered,
  input,
  setInput,
  chatInputRef,
  isPending,
  handleSend,
  handleCreateRoom,
}: ChatInputFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend(input);
      }}
      className={`mx-auto flex w-full flex-col items-center ${isCentered ? "mt-4 max-w-3xl" : "max-w-4xl"}`}
    >
      <div className="border-outline-variant/60 bg-surface-container-highest/85 focus-within:border-primary/60 focus-within:ring-primary/25 relative flex w-full min-w-0 items-center rounded-[1.75rem] border p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.08)] backdrop-blur transition focus-within:ring-4">
        {/* Plus icon on the left */}
        <button
          type="button"
          className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-full transition"
          title="Start New Chat"
          onClick={handleCreateRoom}
        >
          <Plus className="size-5" />
        </button>

        {/* Text Input */}
        <input
          ref={chatInputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isPending}
          placeholder="Ask Tacta anything..."
          className="text-on-surface placeholder:text-on-surface-variant/45 min-w-0 flex-1 border-none bg-transparent px-2 py-3 text-sm outline-none sm:px-4 sm:text-base"
        />

        {/* Action elements on the right */}
        <div className="flex shrink-0 items-center gap-1.5 pr-1">
          {input.trim() ? (
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-on-primary hover:bg-primary/90 flex size-10 items-center justify-center rounded-full p-0 shadow-sm transition"
            >
              <Send className="size-4" />
            </Button>
          ) : (
            <>
              <button
                type="button"
                className="text-on-surface-variant hover:bg-surface-container-high hover:text-primary flex size-10 items-center justify-center rounded-full transition"
                title="Voice input (Not supported)"
              >
                <Mic className="size-4.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Suggestion Cards (Only show if centered/welcome state) */}
      {isCentered && (
        <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3">
          {[
            {
              title: "Schedule meeting",
              desc: "Send calendar invite & email for next Thursday",
              prompt:
                "Send a calendar invite to iamsubhrangsubera@gmail.com at 9 AM next Thursday. Send him an email too saying I look forward to our meeting.",
              icon: <Calendar className="text-primary size-5" />,
            },
            {
              title: "Search emails",
              desc: "Find recent updates in your inbox",
              prompt:
                "Search my inbox for recent emails about project updates.",
              icon: <Search className="text-primary size-5" />,
            },
            {
              title: "View agenda",
              desc: "Check your upcoming events for next week",
              prompt: "Show my upcoming calendar events for next week.",
              icon: <Mail className="text-primary size-5" />,
            },
          ].map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInput(sug.prompt)}
              className="border-outline-variant/45 bg-surface-container-lowest/70 hover:border-primary/35 hover:bg-surface-container-low flex w-full min-w-0 flex-col items-start gap-3 rounded-2xl border p-4 text-left shadow-sm backdrop-blur transition"
            >
              <div className="bg-primary/10 text-primary shrink-0 rounded-2xl p-2.5">
                {sug.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-label-md text-on-surface truncate font-sans font-bold">
                  {sug.title}
                </h4>
                <p className="text-on-surface-variant/75 mt-1 font-sans text-xs leading-relaxed">
                  {sug.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
