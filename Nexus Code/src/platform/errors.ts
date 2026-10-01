import type { PlatformError, PlatformErrorCode, PlatformResult } from './contracts.ts';
export const success = <T>(data: T): PlatformResult<T> => ({ ok: true, data });
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const messages: Record<PlatformErrorCode, string> = {
  UNAVAILABLE: 'This operation is unavailable in this environment.',
  INVALID_RESPONSE: 'The desktop service returned an invalid response.',
  INVALID_INPUT: 'The operation received an invalid value.',
  PERMISSION_DENIED: 'This operation is not permitted.',
  RESOURCE_LIMIT: 'This operation exceeds a supported limit.',
  TIMEOUT: 'The operation timed out. Try again.',
  CANCELED: 'The operation was canceled.',
  AUTH_REQUIRED: 'Connect the required account to continue.',
  RATE_LIMITED: 'The service is temporarily rate limited. Try again later.',
  OPERATION_FAILED: 'The operation could not be completed.',
};
const safeNativeCodes = new Set(['EACCES','EPERM','ENOENT','EEXIST','ENOTDIR','EISDIR','ENOSPC','EROFS','EMFILE','ENFILE','EBUSY','ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENETUNREACH','EHOSTUNREACH','EPIPE']);
export function normalizePlatformError(operation: string, cause: unknown, explicitCode?: PlatformErrorCode): PlatformError {
  const raw = typeof cause === 'string' ? cause : isRecord(cause) && typeof cause.message === 'string' ? cause.message : '';
  const nativeCode = isRecord(cause) && typeof cause.code === 'string' && safeNativeCodes.has(cause.code) ? cause.code : undefined;
  const code = explicitCode ?? (/timeout|timed out/i.test(raw) ? 'TIMEOUT'
    : /abort|cancel/i.test(raw) ? 'CANCELED'
    : /outside|protected|not allowed|denied|workspace.*selected|workspace-ordner auswaehlen|workspace root.*cannot be modified/i.test(raw) || nativeCode === 'EACCES' || nativeCode === 'EPERM' ? 'PERMISSION_DENIED'
    : /too large|too many/i.test(raw) ? 'RESOURCE_LIMIT'
    : /invalid|must be|requires/i.test(raw) ? 'INVALID_INPUT'
    : /auth|sign.in|token.*required/i.test(raw) ? 'AUTH_REQUIRED'
    : /rate.limit/i.test(raw) ? 'RATE_LIMITED' : 'OPERATION_FAILED');
  return { code, message: messages[code], operation,
    retryable: code === 'TIMEOUT' || code === 'RATE_LIMITED' || code === 'OPERATION_FAILED',
    ...(cause instanceof Error || nativeCode ? { technical: { kind: cause instanceof TypeError ? 'TypeError' : 'NativeError', ...(nativeCode ? { nativeCode } : {}) } } : {}),
  };
}
export function failure<T = never>(operation: string, cause: unknown, code?: PlatformErrorCode): PlatformResult<T> {
  return { ok: false, error: normalizePlatformError(operation, cause, code) };
}
export class PlatformOperationError extends Error {
  readonly issue: PlatformError;
  constructor(issue: PlatformError) { super(issue.message); this.name = 'PlatformOperationError'; this.issue = issue; }
}
export function requirePlatformData<T>(result: PlatformResult<T>): T {
  if (result.ok === false) throw new PlatformOperationError(result.error);
  return result.data;
}
