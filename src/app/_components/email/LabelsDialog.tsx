"use client";

import { X, Plus, Trash2 } from "lucide-react";
import { Card } from "~/app/_components/ui/card";
import { Button } from "~/app/_components/ui/button";

type Label = {
  id?: string;
  name?: string;
  type?: "system" | "user";
  messagesUnread?: number;
};

type LabelsDialogProps = {
  isOpen: boolean;
  labels: Label[];
  newLabelName: string;
  onNewLabelName: (value: string) => void;
  onClose: () => void;
  onCreateLabel: (name: string) => void;
  isCreating: boolean;
  onDeleteLabel: (id: string) => void;
  isDeleting: boolean;
};

export function LabelsDialog({
  isOpen,
  labels,
  newLabelName,
  onNewLabelName,
  onClose,
  onCreateLabel,
  isCreating,
  onDeleteLabel,
  isDeleting,
}: LabelsDialogProps) {
  if (!isOpen) return null;

  const userLabels = labels.filter((label) => label.type === "user");

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <Card className="bg-surface-container border-outline-variant relative w-full max-w-md space-y-4 rounded-3xl border p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close label manager"
          className="hover:bg-surface-container-high text-on-surface-variant absolute top-4 right-4 rounded-full p-1"
        >
          <X className="size-5" />
        </button>
        <div>
          <h3 className="text-on-surface text-base font-bold">Gmail Labels</h3>
          <p className="text-on-surface-variant text-xs">
            Create and remove user labels synced with Gmail.
          </p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (newLabelName.trim()) {
              onCreateLabel(newLabelName.trim());
            }
          }}
        >
          <input
            required
            value={newLabelName}
            onChange={(event) => onNewLabelName(event.target.value)}
            placeholder="New label name"
            className="border-outline-variant bg-surface-container-low text-on-surface focus:border-primary min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
          />
          <Button type="submit" variant="primary" size="sm" loading={isCreating}>
            <Plus className="mr-1 size-3.5" /> Add
          </Button>
        </form>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {userLabels.map((label) => (
            <div
              key={label.id}
              className="border-outline-variant bg-surface-container-low flex items-center justify-between rounded-xl border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-on-surface truncate text-xs font-semibold">
                  {label.name}
                </p>
                <p className="text-on-surface-variant text-[10px]">
                  {label.messagesUnread ?? 0} unread
                </p>
              </div>
              <button
                type="button"
                disabled={!label.id || isDeleting}
                onClick={() => label.id && onDeleteLabel(label.id)}
                aria-label={`Delete ${label.name ?? "label"}`}
                className="text-error hover:bg-error/10 rounded-lg p-2 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {userLabels.length === 0 && (
            <p className="text-on-surface-variant py-6 text-center text-xs">
              No custom labels yet.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
