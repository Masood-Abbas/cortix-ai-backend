import { QdrantVectorStore } from "@langchain/qdrant";
import { embeddings } from "./embedding.js";

export const vectorStore = async (docs, collectionName) => {
  if (!process.env.QDRANT_URL) {
    throw new Error("QDRANT_URL is not configured");
  }
  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error("No PDF text was extracted for vector search");
  }

  return QdrantVectorStore.fromDocuments(docs, embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName,
  });
};
