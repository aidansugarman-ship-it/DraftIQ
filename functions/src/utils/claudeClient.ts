import Anthropic from '@anthropic-ai/sdk';

// ANTHROPIC_API_KEY is a Firebase secret — never in client code.
// Set via: firebase functions:secrets:set ANTHROPIC_API_KEY
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use claude-sonnet-4-20250514 for all deep analysis, writing, and reasoning tasks
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export interface ClaudeOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Single-turn Claude call with a system prompt and user message.
 * All DraftIQ AI calls funnel through here — makes it easy to add
 * logging, rate limiting, or model swaps in one place.
 */
export const callClaude = async (
  systemPrompt: string,
  userMessage: string,
  options: ClaudeOptions = {}
): Promise<string> => {
  const { maxTokens = 1024, temperature } = options;

  const message = await client.messages.create({
    model:      CLAUDE_MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
    ...(temperature !== undefined && { temperature }),
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error(`Unexpected Claude response type: ${content.type}`);
  }

  return content.text;
};

/**
 * Multi-turn conversation — used for War Room mode where context builds
 * across picks during a live draft session.
 */
export const callClaudeConversation = async (
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: ClaudeOptions = {}
): Promise<string> => {
  const { maxTokens = 512 } = options;

  const response = await client.messages.create({
    model:      CLAUDE_MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error(`Unexpected Claude response type: ${content.type}`);
  }

  return content.text;
};
