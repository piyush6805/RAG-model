import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';import { QdrantVectorStore } from '@langchain/qdrant';
import { embeddings } from '../config/qdrant.js';
import { loadDocument } from '../loaders/documentLoader.js';

export async function ingestDocument(filePath, documentId) {
  // 1. Load document
  const docs = await loadDocument(filePath);

  // 2. Split into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
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
    collectionName: process.env.QDRANT_COLLECTION,
  });

  return {
    totalPages: docs.length,
    totalChunks: chunks.length,
  };
}