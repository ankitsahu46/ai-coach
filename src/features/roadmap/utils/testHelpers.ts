export function getMockErrorFlags() {
  // Safe environment gating mapping
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Double lock: strict enabling flag must explicitly be active in .env.local
  if (process.env.ENABLE_AI_MOCKS !== "true") {
    return null;
  }

  return {
    forceTimeout: process.env.MOCK_AI_TIMEOUT === "true",
    forceSyntaxError: process.env.MOCK_AI_SYNTAX_ERROR === "true",
    forceEmptyArray: process.env.MOCK_AI_EMPTY === "true",
  };
}

export function injectAIFailureMock(attempt: number) {
  const flags = getMockErrorFlags();
  if (!flags) return;

  if (flags.forceTimeout) {
    throw new Error("AI service timeout mock injected by test flags.");
  }

  if (flags.forceSyntaxError) {
    if (attempt === 1) {
      // Simulate that a JSON corruption occurred only on the first pass
      throw new SyntaxError("Unexpected string in JSON Mock");
    }
  }

  if (flags.forceEmptyArray) {
    throw new Error("Force Empty flag. Failing outright.");
  }
}
