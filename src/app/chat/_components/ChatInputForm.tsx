"use client";

import { useState, type RefObject } from "react";
import { Plus, Send, Mic, MicOff, Calendar, Search, Mail, Sparkles } from "lucide-react";
import { Button } from "~/app/_components/ui/button";
import { toast } from "sonner";

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
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser. Please try Google Chrome or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-US";
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak now.");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(input ? `${input.trim()} ${transcript}` : transcript);
          toast.success("Voice input captured!");
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          toast.error(`Voice input failed: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setRecognitionInstance(null);
      };

      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isListening && recognitionInstance) {
          recognitionInstance.stop();
        }
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
                onClick={handleVoiceInput}
                className={`flex size-10 items-center justify-center rounded-full transition cursor-pointer ${
                  isListening
                    ? "bg-red-500/10 text-red-500 animate-pulse border border-red-500/20"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                }`}
                title={isListening ? "Listening... click to stop" : "Start voice input"}
              >
                {isListening ? <MicOff className="size-4.5" /> : <Mic className="size-4.5" />}
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
              title: "Draft Email",
              desc: "Draft a follow-up email to a collaborator",
              prompt: "Draft a follow-up email to Subhrangsu asking for the latest design files.",
              icon: <Mail className="text-primary size-5" />,
            },
            {
              title: "Schedule Sync",
              desc: "Book a calendar event for a meeting or call",
              prompt: "Schedule a sync meeting with Subhrangsu next Wednesday at 2 PM to review layout styles.",
              icon: <Calendar className="text-primary size-5" />,
            },
            {
              title: "Daily Briefing",
              desc: "Summarize unread emails and agenda",
              prompt: "Give me a daily briefing: summarize my unread emails and show today's calendar events.",
              icon: <Sparkles className="text-primary size-5" />,
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
