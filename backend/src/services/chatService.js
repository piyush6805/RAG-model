import { QdrantVectorStore } from '@langchain/qdrant';
import { ChatOpenAI } from '@langchain/openai';
import { embeddings } from '../config/qdrant.js';

export async function askQuestion(documentId, question) {
  // Connect to existing Qdrant collection
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      collectionName: process.env.QDRANT_COLLECTION,
    }
  );

  // Retriever with metadata filter
  const retriever = vectorStore.asRetriever({
    k: 4,
    filter: {
      must: [
        {
          key: 'metadata.documentId',
          match: {
            value: documentId,
          },
        },
      ],
    },
  });

  // Retrieve relevant chunks
  const docs = await retriever.invoke(question);

  // Build context
  const context = docs
    .map(
      (doc, index) =>
        `Chunk ${index + 1}:\n${doc.pageContent}`
    )
    .join('\n\n');

  // Chat model using AICredits
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
    model: process.env.CHAT_MODEL,
    temperature: 0,
  });

  // Ask model using strict grounding prompt
  const response = await model.invoke([
    {
      role: 'system',
      content: `You are a document assistant.

Answer ONLY using the provided context.
If the answer is not present in the context, respond exactly:
"I could not find that information in the uploaded document."`,
    },
    {
      role: 'user',
      content: `Context:
${context}

Question: ${question}`,
    },
  ]);

  return {
    answer: response.content,
    sources: docs.map((doc) => doc.metadata),
  };
}