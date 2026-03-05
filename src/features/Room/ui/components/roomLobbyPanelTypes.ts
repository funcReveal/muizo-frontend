export type CollectionOption = {
  id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
  use_count?: number;
};
