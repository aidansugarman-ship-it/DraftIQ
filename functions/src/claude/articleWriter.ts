import * as functions from 'firebase-functions/v1';
import { callClaude } from '../utils/claudeClient';

interface ArticleRequest {
  sport:    string;
  category: string;
  topic:    string;
  context?: string;  // current news, player data to reference
}

export const generateArticle = functions
  .runWith({ secrets: ['GEMINI_API_KEY'] })
  .https.onCall(async (data: ArticleRequest) => {
    const userMessage = `
Write a DraftIQ editorial article for ${data.sport} fantasy managers.

Category: ${data.category}
Topic: ${data.topic}
${data.context ? `Current context / data to reference:\n${data.context}` : ''}

Requirements:
- Write like a knowledgeable human analyst, not a stat bot
- Full narrative prose — no bullet point lists unless listing players briefly
- Lead with a compelling hook that makes the reader want to keep going
- Back every claim with specific reasoning — schemes, injury history, schedule, usage trends
- 400–600 words
- End with a clear actionable takeaway

Format response as JSON:
{
  "title": "...",
  "subtitle": "...",
  "body": "Full article in markdown...",
  "readTimeMinutes": 3,
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const response = await callClaude(
      'You are DraftIQ\'s senior editorial analyst. Your writing sounds like a cross between The Athletic and ESPN\'s fantasy column — smart, confident, entertaining. Never robotic.',
      userMessage,
      { maxTokens: 1200 }
    );

    try {
      const article = JSON.parse(response);
      const admin = await import('firebase-admin');
      const ref = admin.firestore().collection('articles').doc();
      await ref.set({
        ...article,
        sport:        data.sport,
        category:     data.category,
        authorByline: 'DraftIQ AI Analyst',
        tierRequired: 'rookie',
        publishedAt:  admin.firestore.FieldValue.serverTimestamp(),
        id:           ref.id,
      });
      return { ...article, id: ref.id };
    } catch {
      return { title: data.topic, body: response, tags: [] };
    }
  });
