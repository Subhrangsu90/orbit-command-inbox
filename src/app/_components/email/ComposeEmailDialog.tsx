"use client";

import { X, Send, Save } from "lucide-react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";

type ComposeEmailDialogProps = {
  isOpen: boolean;
  editingDraftId: string | null;
  composeTo: string;
  composeSubject: string;
  composeBody: string;
  onComposeTo: (value: string) => void;
  onComposeSubject: (value: string) => void;
  onComposeBody: (value: string) => void;
  onClose: () => void;
  onSend: (input: { to: string; subject: string; body: string }) => void;
  isSending: boolean;
  onSaveDraft: (input: { to: string; subject: string; body: string }) => void;
  isSavingDraft: boolean;
  onUpdateDraft: (input: { id: string; to: string; subject: string; body: string }) => void;
  isUpdatingDraft: boolean;
};

export function ComposeEmailDialog({
  isOpen,
  editingDraftId,
  composeTo,
  composeSubject,
  composeBody,
  onComposeTo,
  onComposeSubject,
  onComposeBody,
  onClose,
  onSend,
  isSending,
  onSaveDraft,
  isSavingDraft,
  onUpdateDraft,
  isUpdatingDraft,
}: ComposeEmailDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <Card className="bg-surface-container border-outline-variant relative w-full max-w-[32rem] space-y-4 rounded-3xl border p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="hover:bg-surface-container-high text-on-surface-variant absolute top-4 right-4 rounded-full p-1 transition"
        >
          <X className="size-5" />
        </button>

        <div className="space-y-1">
          <h3 className="text-md text-on-surface font-bold">
            {editingDraftId ? "Edit Draft" : "New Message"}
          </h3>
          <p className="text-3xs text-on-surface-variant font-medium">
            {editingDraftId
              ? "Update the Gmail draft before sending it."
              : "Send now or save it to Gmail Drafts."}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const message = { to: composeTo, subject: composeSubject, body: composeBody };
            if (editingDraftId) {
              onUpdateDraft({ id: editingDraftId, ...message });
            } else {
              onSend(message);
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="text-on-surface-variant mb-1 block text-[10px] font-semibold tracking-wider uppercase">
              Recipient Email
            </label>
            <input
              type="email"
              required
              placeholder="recipient@domain.com"
              value={composeTo}
              onChange={(e) => onComposeTo(e.target.value)}
              className="border-outline-variant bg-surface-container-low text-on-surface focus:ring-primary focus:border-primary w-full rounded-xl border px-3 py-2 text-xs transition focus:ring-1 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-on-surface-variant mb-1 block text-[10px] font-semibold tracking-wider uppercase">
              Subject
            </label>
            <input
              type="text"
              required
              placeholder="Meeting Agenda"
              value={composeSubject}
              onChange={(e) => onComposeSubject(e.target.value)}
              className="border-outline-variant bg-surface-container-low text-on-surface focus:ring-primary focus:border-primary w-full rounded-xl border px-3 py-2 text-xs transition focus:ring-1 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-on-surface-variant mb-1 block text-[10px] font-semibold tracking-wider uppercase">
              Body Content
            </label>
            <textarea
              required
              rows={6}
              placeholder="Hey, let's connect..."
              value={composeBody}
              onChange={(e) => onComposeBody(e.target.value)}
              className="border-outline-variant bg-surface-container-low text-on-surface focus:ring-primary focus:border-primary w-full resize-none rounded-xl border px-3 py-2 text-xs transition focus:ring-1 focus:outline-none"
            />
          </div>

          <div className="border-outline-variant/30 flex justify-end gap-2 border-t pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-2xs rounded-xl font-semibold"
            >
              Cancel
            </Button>
            {!editingDraftId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={isSavingDraft}
                onClick={() =>
                  onSaveDraft({
                    to: composeTo,
                    subject: composeSubject,
                    body: composeBody,
                  })
                }
                className="text-2xs rounded-xl font-semibold"
              >
                <Save className="mr-1 size-3.5" /> Save Draft
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={editingDraftId ? isUpdatingDraft : isSending}
              className="text-2xs bg-primary text-on-primary hover:bg-primary-container flex items-center gap-1.5 rounded-xl font-semibold shadow-sm"
            >
              {editingDraftId ? (
                <Save className="size-3.5" />
              ) : (
                <Send className="size-3.5" />
              )}
              {editingDraftId ? "Save Changes" : "Send Message"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
