import { describe, expect, it } from "vitest";
import { issueAdminSession, verifyAdminSession } from "../../supabase/functions/_shared/admin-session";

describe("serverkontrollerad administration", () => {
  const secret = "test-only-signing-key-not-a-real-credential";
  it("nekar saknad eller förfalskad session", async () => {
    expect(await verifyAdminSession(null, secret)).toBe(false);
    expect(await verifyAdminSession("true", secret)).toBe(false);
    const token = await issueAdminSession(secret, 1000);
    expect(await verifyAdminSession(token, "wrong-test-key", 1000)).toBe(false);
  });
  it("godtar signerad session i exakt fem minuter", async () => {
    const token = await issueAdminSession(secret, 1000);
    expect(await verifyAdminSession(token, secret, 300999)).toBe(true);
    expect(await verifyAdminSession(token, secret, 301000)).toBe(false);
  });
});