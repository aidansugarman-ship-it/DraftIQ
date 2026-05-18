import { GoogleGenerativeAI } from '@google/generative-ai';

// All AI calls route through Gemini now — Anthropic was removed to stay on free tier.
// GEMINI_API_KEY is a Firebase secret — never in client code.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

// Model name kept as CLAUDE_MODEL so the rest of the codebase doesn't need to change.
// Maps to Gemini under the hood. Use gemini-2.0-flash for deep analysis.
export const CLAUDE_MODEL = 'gemini-2.0-flash';

export interface ClaudeOptions {
  maxTokens?: number;
  temperature?: number;
}

export const callClaude = async (
  systemPrompt: string,
  userMessage: string,
  options: ClaudeOptions = {}
): Promise<string> => {
  const { maxTokens = 1024, temperature = 0.7 } = options;

  if (!userMessage.trim()) {
    throw new Error('callClaude: userMessage cannot be empty');
  }

  const model = genAI.getGenerativeModel({
    model: CLAUDE_MODEL,
    systemInstruction: systemPrompt.trim() ? systemPrompt : undefined,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const result = await model.generateContent(userMessage);
  return result.response.text();
};

export const callClaudeConversation = async (
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: ClaudeOptions = {}
): Promise<string> => {
  const { maxTokens = 512, temperature = 0.7 } = options;

  const validMessages = messages.filter(
    m => typeof m.content === 'string' && m.content.trim().length > 0
  );

  if (validMessages.length === 0) {
    throw new Error('callClaudeConversation: no non-empty messages to send');
  }

  const model = genAI.getGenerativeModel({
    model: CLAUDE_MODEL,
    systemInstruction: systemPrompt.trim() ? systemPrompt : undefined,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const lastMessage = validMessages[validMessages.length - 1];

  // If the final message isn't a user turn, Gemini's chat API can't continue —
  // fall back to a flat formatted prompt.
  if (lastMessage.role !== 'user') {
    const combined = validMessages
      .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n\n');
    const result = await model.generateContent(combined);
    return result.response.text();
  }

  const history = validMessages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text();
};
