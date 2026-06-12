export type ApiEnvelopeError = {
  code?: string;
  message?: string;
} | null;

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: ApiEnvelopeError;
};

export const isApiEnvelopeSuccess = <T>(
  payload: ApiEnvelope<T> | null | undefined,
): payload is ApiEnvelope<T> & { success: true; data: T } =>
  payload?.success === true && payload.data !== undefined;

export const getApiEnvelopeErrorMessage = (
  payload: { error?: ApiEnvelopeError } | null | undefined,
  fallback: string,
) => payload?.error?.message ?? fallback;
