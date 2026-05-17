import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  model: process.env.CHAT_MODEL,
  temperature: 0,
});

export async function rewriteQuery(question) {
  const response = await model.invoke([
    {
      role: 'system',
      content: `Rewrite the user's question to:
- Fix spelling mistakes
- Add missing context
- Make it more searchable
Return only the improved query.`,
    },
    {
      role: 'user',
      content: question,
    },
  ]);

  return response.content.trim();
}