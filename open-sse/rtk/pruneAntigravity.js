export const ANTIGRAVITY_CONTEXT_TOKEN_LIMIT = 850_000;
export const ANTIGRAVITY_CONTEXT_TRIGGER_TOKEN_LIMIT = ANTIGRAVITY_CONTEXT_TOKEN_LIMIT;
export const ANTIGRAVITY_CONTEXT_TARGET_TOKEN_LIMIT = ANTIGRAVITY_CONTEXT_TOKEN_LIMIT;

const encoder = new TextEncoder();

function estimateTokens(body) {
  try {
    const tokenizableBody = JSON.stringify(body, (key, value) => key === "thoughtSignature" ? undefined : value);
    return Math.ceil(encoder.encode(tokenizableBody).length / 2);
  } catch {
    return 0;
  }
}

function toolKey(value) {
  return value?.id || value?.name || null;
}

function isToolPair(callContent, responseContent) {
  const calls = (callContent?.parts || [])
    .map(part => toolKey(part.functionCall))
    .filter(Boolean);
  const responses = new Set((responseContent?.parts || [])
    .map(part => toolKey(part.functionResponse))
    .filter(Boolean));
  return calls.length > 0 && calls.every(key => responses.has(key));
}

function findOldestToolPair(contents) {
  for (let index = 1; index < contents.length - 1; index++) {
    if (contents.length <= 4) return -1;
    if (isToolPair(contents[index], contents[index + 1])) return index;
  }
  return -1;
}

function isNaturalUserTurn(content) {
  if (content?.role !== "user" || !Array.isArray(content.parts)) return false;
  if (content.parts.some(part => part.functionResponse)) return false;
  return content.parts.some(part => typeof part.text === "string" || part.inlineData || part.fileData);
}

function findNextUserBoundary(contents) {
  for (let index = 1; index < contents.length - 1; index++) {
    if (isNaturalUserTurn(contents[index])) return index;
  }
  return -1;
}

export function pruneAntigravityContext(
  body,
  triggerTokens = ANTIGRAVITY_CONTEXT_TRIGGER_TOKEN_LIMIT,
  targetTokens = ANTIGRAVITY_CONTEXT_TARGET_TOKEN_LIMIT,
  enabled = true,
) {
  const contents = body?.request?.contents;
  const estimatedTokensBefore = estimateTokens(body);
  const stats = {
    pruned: false,
    droppedContents: 0,
    estimatedTokensBefore,
    estimatedTokensAfter: estimatedTokensBefore,
  };

  if (!enabled || !Array.isArray(contents) || estimatedTokensBefore <= triggerTokens) return stats;

  while (stats.estimatedTokensAfter > targetTokens && contents.length > 2) {
    const pairIndex = findOldestToolPair(contents);
    if (pairIndex >= 0) {
      contents.splice(pairIndex, 2);
      stats.droppedContents += 2;
    } else {
      const boundary = findNextUserBoundary(contents);
      if (boundary < 0) break;
      contents.splice(0, boundary);
      stats.droppedContents += boundary;
    }
    stats.estimatedTokensAfter = estimateTokens(body);
  }

  stats.pruned = stats.droppedContents > 0;
  return stats;
}
