import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { embeddings } from '../config/qdrant.js';
import { loadDocument } from '../loaders/documentLoader.js';

export async function ingestDocument(filePath, documentId) {
  // 1. Load document
  const docs = await loadDocument(filePath);

  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(docs);

  // 3. Add metadata
  chunks.forEach((chunk, index) => {
    chunk.metadata = {
      ...chunk.metadata,
      documentId,
      chunkIndex: index,
    };
  });

  // 4. Store in Qdrant
  await QdrantVectorStore.fromDocuments(chunks, embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION,
  });

  // 5. Create payload index for metadata.documentId
  const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });

  try {
    await client.createPayloadIndex(
      process.env.QDRANT_COLLECTION,
      {
        field_name: 'metadata.documentId',
        field_schema: 'keyword',
      }
    );
  } catch (error) {
    // Ignore if index already exists
    console.log('Payload index already exists or could not be created.');
  }

  return {
    totalPages: docs.length,
    totalChunks: chunks.length,
  };
}