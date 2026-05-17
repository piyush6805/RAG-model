import { QdrantVectorStore } from '@langchain/qdrant';
import { ChatOpenAI } from '@langchain/openai';
import { embeddings } from '../config/qdrant.js';
import { rewriteQuery } from './queryRewriteService.js';
import { generateQueries } from './multiQueryService.js';
import { scoreChunk } from './relevanceJudgeService.js';

function deduplicateDocs(docs) {
  const map = new Map();

  for (const doc of docs) {
    const key = `${doc.metadata.documentId}-${doc.metadata.chunkIndex}`;

    if (!map.has(key)) {
      map.set(key, {
        ...doc,
        frequency: 1,
      });
    } else {
      map.get(key).frequency += 1;
    }
  }

  return Array.from(map.values());
}

export async function askQuestionCorrective(documentId, question) {
  // Step 1: Rewrite query
  const rewrittenQuery = await rewriteQuery(question);

  // Step 2: Generate multiple queries
  const generatedQueries = await generateQueries(rewrittenQuery);
  const allQueries = [...new Set([rewrittenQuery, ...generatedQueries])];

  // Step 3: Connect to vector store
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION,
    }
  );
  // Step 4: Retrieve docs for each query
  let allDocs = [];

  for (const q of allQueries) {
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

    const docs = await retriever.invoke(q);
    allDocs.push(...docs);
  }

  // Step 5: Deduplicate and count frequency
  let uniqueDocs = deduplicateDocs(allDocs);

  if (uniqueDocs.length === 0) {
    return {
      answer:
        'I could not find that information in the uploaded document.',
      sources: [],
      debug: {
        rewrittenQuery,
        allQueries,
      },
    };
  }

  // Step 6: LLM relevance scoring
  for (const doc of uniqueDocs) {
    doc.relevance = await scoreChunk(question, doc.pageContent);
    doc.finalScore = doc.relevance + doc.frequency * 2;
  }

  // Step 7: Sort by final score
  uniqueDocs.sort((a, b) => b.finalScore - a.finalScore);

  // Step 8: Keep best chunks
  const selectedDocs = uniqueDocs.slice(0, 5);

  // Step 9: Quality check
  const avgScore =
    selectedDocs.reduce((sum, doc) => sum + doc.relevance, 0) /
    selectedDocs.length;

  if (avgScore < 4) {
    return {
      answer:
        'I could not find that information in the uploaded document.',
      sources: [],
      debug: {
        rewrittenQuery,
        allQueries,
        avgScore,
      },
    };
  }

  // Step 10: Build context
  const context = selectedDocs
    .map(
      (doc, i) =>
        `Chunk ${i + 1}:\n${doc.pageContent}`
    )
    .join('\n\n');

    // Step 11: Final answer generation
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
    model: process.env.CHAT_MODEL,
    temperature: 0,
  });

  const response = await model.invoke([
    {
      role: 'system',
      content: `You are a document assistant.
Answer ONLY using the provided context.
If the answer is not present, say:
"I could not find that information in the uploaded document."`,
    },
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ]);

  return {
    answer: response.content,
    sources: selectedDocs.map((doc) => doc.metadata),
    debug: {
      rewrittenQuery,
      allQueries,
      avgScore,
    },
  };
}