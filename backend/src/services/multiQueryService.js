import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  model: process.env.CHAT_MODEL,
  temperature: 0.2,
});

export async function generateQueries(question) {
  const response = await model.invoke([
    {
      role: 'system',
      content: `Generate 3 concise search queries for retrieving information from a document.
Return one query per line and nothing else.`,
    },
    {
      role: 'user',
      content: question,
    },
  ]);

  const queries = response.content
    .split('\n')
    .map((q) => q.replace(/^[-\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  return [...new Set(queries)];
}