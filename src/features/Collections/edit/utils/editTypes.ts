import type { PlaylistItem } from "../../../Room/model/types";

export type AnswerStatus = "original" | "ai_modified" | "manual_reviewed";
export type AnswerAiProvider =
  | "grok"
  | "perplexity"
  | "chatgpt"
  | "gemini";

export type EditableItem = PlaylistItem & {
  localId: string;
  dbId?: string;
  sourceProvider?: string;
  sourceId?: string;
  startSec: number;
  endSec: number;
  answerText: string;
  answerStatus?: AnswerStatus;
  answerAiProvider?: AnswerAiProvider | null;
  answerAiUpdatedAt?: number | null;
  answerAiBatchKey?: string | null;
};

export type DbCollection = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  visibility?: "private" | "public";
  item_count?: number;
  item_limit_override?: number | null;
  effective_item_limit?: number | null;
};

export type DbCollectionItem = {
  id: string;
  collection_id: string;
  sort: number;
  provider: string;
  source_id: string;
  title?: string | null;
  channel_title?: string | null;
  channel_id?: string | null;
  duration_sec?: number | null;
  start_sec: number;
  end_sec: number | null;
  answer_text: string;
  answer_status?: AnswerStatus;
  answer_ai_provider?: AnswerAiProvider | null;
  answer_ai_updated_at?: number | null;
  answer_ai_batch_key?: string | null;
};
