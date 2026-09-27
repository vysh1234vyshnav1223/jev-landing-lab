/**
 * Typed pipeline failures. Each maps to a distinct UI state — the user should
 * always learn which stage broke, never see a stack trace.
 */
export type PipelineErrorCode =
  | 'INVALID_INPUT'
  | 'NO_API_KEY'
  | 'JEV_UNAVAILABLE'
  | 'JEV_MALFORMED'
  | 'LLM_FAILED'
  | 'LLM_MALFORMED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'

export class PipelineError extends Error {
  readonly code: PipelineErrorCode
  readonly stage: string
  /** Safe to show the user. `message` is for server logs. */
  readonly userMessage: string

  constructor(
    code: PipelineErrorCode,
    stage: string,
    userMessage: string,
    message?: string,
  ) {
    super(message ?? userMessage)
    this.name = 'PipelineError'
    this.code = code
    this.stage = stage
    this.userMessage = userMessage
  }
}

export function toPipelineError(e: unknown, stage: string): PipelineError {
  if (e instanceof PipelineError) return e
  const msg = e instanceof Error ? e.message : String(e)
  if (e instanceof Error && e.name === 'AbortError') {
    return new PipelineError(
      'TIMEOUT',
      stage,
      'That took longer than expected.',
      msg,
    )
  }
  return new PipelineError(
    'LLM_FAILED',
    stage,
    'Something went wrong during generation.',
    msg,
  )
}
