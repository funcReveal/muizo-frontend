export type SettlementQuestionResult = "correct" | "wrong" | "unanswered";

export type SettlementQuestionChoice = {
  index: number;
  title: string;
  isCorrect: boolean;
  isSelectedByMe: boolean;
};

export type SettlementQuestionRecap = {
  key: string;
  order: number;
  trackIndex: number;
  title: string;
  uploader: string;
  duration: string | null;
  thumbnail: string | null;
  sourceId?: string | null;
  channelId?: string | null;
  provider?: string;
  videoId?: string;
  url?: string;
  myResult: SettlementQuestionResult;
  myChoiceIndex: number | null;
  correctChoiceIndex: number;
  choices: SettlementQuestionChoice[];
  participantCount?: number;
  answeredCount?: number;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  changedAnswerCount?: number;
  changedAnswerUserCount?: number;
  fastestCorrectRank?: number | null;
  fastestCorrectMs?: number | null;
  medianCorrectMs?: number | null;
  answersByClientId?: Record<
    string,
    {
      choiceIndex: number | null;
      result: SettlementQuestionResult;
      answeredAtMs?: number | null;
    }
  >;
};
