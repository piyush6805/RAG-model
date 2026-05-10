import dotenv from 'dotenv';
import { OpenAIEmbeddings } from '@langchain/openai';

dotenv.config();

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  model: process.env.EMBEDDING_MODEL,
});

const vector = await embeddings.embedQuery('hello world');
console.log('Embedding length:', vector.length);