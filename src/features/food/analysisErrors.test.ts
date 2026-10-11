import { isRateLimitedErrorCode } from './analysisErrors';

describe('isRateLimitedErrorCode', () => {
  it('detects the throttling code', () => {
    expect(isRateLimitedErrorCode('503 ai_rate_limited')).toBe(true);
    expect(isRateLimitedErrorCode('ai_rate_limited')).toBe(true);
  });
  it('ignores other failures', () => {
    expect(isRateLimitedErrorCode('502 ai_provider_error')).toBe(false);
    expect(isRateLimitedErrorCode('504 client_timeout')).toBe(false);
    expect(isRateLimitedErrorCode('client: ai_rate_limited_x')).toBe(false);
    expect(isRateLimitedErrorCode(null)).toBe(false);
    expect(isRateLimitedErrorCode(undefined)).toBe(false);
  });
});
