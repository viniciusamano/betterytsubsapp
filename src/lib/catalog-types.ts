export type PropertyType =
  | "multi_select"
  | "select"
  | "text"
  | "number"
  | "checkbox"
  | "link";

export type PropertyOption = {
  id: string;
  label: string;
  color: string;
};

export type Property = {
  id: string;
  name: string;
  type: PropertyType;
  aiSuggested: boolean;
  options: PropertyOption[];
};

export type ChannelValue = {
  optionIds: string[] | null;
  text: string | null;
  number: number | null;
  bool: boolean | null;
};

export type Channel = {
  id: string;
  name: string;
  handle: string | null;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
  lastVideoPublishedAt: string | null;
  createdAtYoutube: string | null;
  syncedAt: string | null;
  values: Record<string, ChannelValue>;
};

export const TAG_COLORS = [
  "#E2664F",
  "#E3A83C",
  "#8FD16F",
  "#5FB8C9",
  "#B98FE0",
  "#E08FC0",
  "#C9C15F",
  "#8FA8E0",
  "#E0B08F",
  "#5FE0B0",
];
