import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  model: process.env.CHAT_MODEL,
  temperature: 0,
});

export async function scoreChunk(question, chunkText) {
  const response = await model.invoke([
    {
      role: 'system',
      content: `Rate relevance from 0 to 10.
Return only a number.`,
    },
    {
      role: 'user',
      content: `Question: ${question}\n\nChunk:\n${chunkText}`,
    },
  ]);

  const score = parseFloat(response.content.trim());

  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(10, score));
}