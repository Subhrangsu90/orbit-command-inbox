import { create } from "zustand";

type MailCategory = "primary" | "promotions" | "social" | "updates" | "forums";
type Setter<T> = (value: T | ((current: T) => T)) => void;

function resolveValue<T>(value: T | ((current: T) => T), current: T) {
  return typeof value === "function"
    ? (value as (current: T) => T)(current)
    : value;
}

type MailStore = {
  category: MailCategory;
  currentPageToken: string | undefined;
  pageTokenHistory: (string | undefined)[];
  searchQuery: string;
  selectedIndex: number;
  selectedEmailId: string | null;
  selectedMessageIds: string[];
  isComposeOpen: boolean;
  isLabelsOpen: boolean;
  isHelpOpen: boolean;
  editingDraftId: string | null;
  newLabelName: string;
  isAdvancedSearchOpen: boolean;
  filterFrom: string;
  filterTo: string;
  filterSubject: string;
  filterHasAttachment: boolean;
  filterIsStarred: boolean;
  filterIsUnread: boolean;
  filterAfter: string;
  filterBefore: string;
  composeTo: string;
  composeSubject: string;
  composeBody: string;
  setCategory: Setter<MailCategory>;
  setCurrentPageToken: Setter<string | undefined>;
  setPageTokenHistory: Setter<(string | undefined)[]>;
  setSearchQuery: Setter<string>;
  setSelectedIndex: Setter<number>;
  setSelectedEmailId: Setter<string | null>;
  setSelectedMessageIds: Setter<string[]>;
  setIsComposeOpen: Setter<boolean>;
  setIsLabelsOpen: Setter<boolean>;
  setIsHelpOpen: Setter<boolean>;
  setEditingDraftId: Setter<string | null>;
  setNewLabelName: Setter<string>;
  setIsAdvancedSearchOpen: Setter<boolean>;
  setFilterFrom: Setter<string>;
  setFilterTo: Setter<string>;
  setFilterSubject: Setter<string>;
  setFilterHasAttachment: Setter<boolean>;
  setFilterIsStarred: Setter<boolean>;
  setFilterIsUnread: Setter<boolean>;
  setFilterAfter: Setter<string>;
  setFilterBefore: Setter<string>;
  setComposeTo: Setter<string>;
  setComposeSubject: Setter<string>;
  setComposeBody: Setter<string>;
};

export const useMailStore = create<MailStore>((set) => ({
  category: "primary",
  currentPageToken: undefined,
  pageTokenHistory: [undefined],
  searchQuery: "",
  selectedIndex: 0,
  selectedEmailId: null,
  selectedMessageIds: [],
  isComposeOpen: false,
  isLabelsOpen: false,
  isHelpOpen: false,
  editingDraftId: null,
  newLabelName: "",
  isAdvancedSearchOpen: false,
  filterFrom: "",
  filterTo: "",
  filterSubject: "",
  filterHasAttachment: false,
  filterIsStarred: false,
  filterIsUnread: false,
  filterAfter: "",
  filterBefore: "",
  composeTo: "",
  composeSubject: "",
  composeBody: "",
  setCategory: (value) =>
    set((state) => ({ category: resolveValue(value, state.category) })),
  setCurrentPageToken: (value) =>
    set((state) => ({
      currentPageToken: resolveValue(value, state.currentPageToken),
    })),
  setPageTokenHistory: (value) =>
    set((state) => ({
      pageTokenHistory: resolveValue(value, state.pageTokenHistory),
    })),
  setSearchQuery: (value) =>
    set((state) => ({ searchQuery: resolveValue(value, state.searchQuery) })),
  setSelectedIndex: (value) =>
    set((state) => ({
      selectedIndex: resolveValue(value, state.selectedIndex),
    })),
  setSelectedEmailId: (value) =>
    set((state) => ({
      selectedEmailId: resolveValue(value, state.selectedEmailId),
    })),
  setSelectedMessageIds: (value) =>
    set((state) => ({
      selectedMessageIds: resolveValue(value, state.selectedMessageIds),
    })),
  setIsComposeOpen: (value) =>
    set((state) => ({
      isComposeOpen: resolveValue(value, state.isComposeOpen),
    })),
  setIsLabelsOpen: (value) =>
    set((state) => ({ isLabelsOpen: resolveValue(value, state.isLabelsOpen) })),
  setIsHelpOpen: (value) =>
    set((state) => ({ isHelpOpen: resolveValue(value, state.isHelpOpen) })),
  setEditingDraftId: (value) =>
    set((state) => ({
      editingDraftId: resolveValue(value, state.editingDraftId),
    })),
  setNewLabelName: (value) =>
    set((state) => ({ newLabelName: resolveValue(value, state.newLabelName) })),
  setIsAdvancedSearchOpen: (value) =>
    set((state) => ({
      isAdvancedSearchOpen: resolveValue(value, state.isAdvancedSearchOpen),
    })),
  setFilterFrom: (value) =>
    set((state) => ({ filterFrom: resolveValue(value, state.filterFrom) })),
  setFilterTo: (value) =>
    set((state) => ({ filterTo: resolveValue(value, state.filterTo) })),
  setFilterSubject: (value) =>
    set((state) => ({
      filterSubject: resolveValue(value, state.filterSubject),
    })),
  setFilterHasAttachment: (value) =>
    set((state) => ({
      filterHasAttachment: resolveValue(value, state.filterHasAttachment),
    })),
  setFilterIsStarred: (value) =>
    set((state) => ({
      filterIsStarred: resolveValue(value, state.filterIsStarred),
    })),
  setFilterIsUnread: (value) =>
    set((state) => ({
      filterIsUnread: resolveValue(value, state.filterIsUnread),
    })),
  setFilterAfter: (value) =>
    set((state) => ({ filterAfter: resolveValue(value, state.filterAfter) })),
  setFilterBefore: (value) =>
    set((state) => ({
      filterBefore: resolveValue(value, state.filterBefore),
    })),
  setComposeTo: (value) =>
    set((state) => ({ composeTo: resolveValue(value, state.composeTo) })),
  setComposeSubject: (value) =>
    set((state) => ({
      composeSubject: resolveValue(value, state.composeSubject),
    })),
  setComposeBody: (value) =>
    set((state) => ({ composeBody: resolveValue(value, state.composeBody) })),
}));
