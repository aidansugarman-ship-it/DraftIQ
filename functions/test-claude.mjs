/**
 * Standalone diagnostic script — runs outside Firebase, uses the same payload
 * construction logic as claudeClient.ts to surface the exact API error.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node functions/test-claude.mjs
 */

import Anthropic from './node_modules/@anthropic-ai/sdk/index.mjs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL  = 'claude-sonnet-4-20250514';

async function send(label, payload) {
  console.log(`\n=== ${label} ===`);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  try {
    const msg = await client.messages.create(payload);
    console.log('OK — first content block:', JSON.stringify(msg.content[0]));
  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.error) console.error('API body:', JSON.stringify(e.error, null, 2));
  }
}

// ── Case 1: normal single-turn (should succeed) ─────────────────────────────
await send('normal single-turn', {
  model: MODEL, max_tokens: 32,
  system: 'You are helpful.',
  messages: [{ role: 'user', content: 'Say "ok".' }],
});

// ── Case 2: empty userMessage string ────────────────────────────────────────
await send('empty userMessage string', {
  model: MODEL, max_tokens: 32,
  system: 'You are helpful.',
  messages: [{ role: 'user', content: '' }],
});

// ── Case 3: empty system string ─────────────────────────────────────────────
await send('empty system string', {
  model: MODEL, max_tokens: 32,
  system: '',
  messages: [{ role: 'user', content: 'Say "ok".' }],
});

// ── Case 4: content as block array with empty text + cache_control ───────────
await send('block array — empty text + cache_control', {
  model: MODEL, max_tokens: 32,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'hello' },
      { type: 'text', text: '', cache_control: { type: 'ephemeral' } },
    ],
  }],
});

// ── Case 5: content as block array with empty text, no cache_control ─────────
await send('block array — empty text, no cache_control', {
  model: MODEL, max_tokens: 32,
  messages: [{
    role: 'user',
    content: [{ type: 'text', text: '' }],
  }],
});

// ── Case 6: multi-turn with one empty assistant message ──────────────────────
await send('multi-turn — empty assistant content string', {
  model: MODEL, max_tokens: 32,
  messages: [
    { role: 'user',      content: 'Say "ok".' },
    { role: 'assistant', content: '' },
    { role: 'user',      content: 'Still there?' },
  ],
});

// ── Case 7: multi-turn — assistant block array with empty text + cache_control
await send('multi-turn — assistant block array empty text + cache_control', {
  model: MODEL, max_tokens: 32,
  messages: [
    { role: 'user',      content: 'Say "ok".' },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: 'ok' },
        { type: 'text', text: '', cache_control: { type: 'ephemeral' } },
      ],
    },
    { role: 'user', content: 'Good.' },
  ],
});
