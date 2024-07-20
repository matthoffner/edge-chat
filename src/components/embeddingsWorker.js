import { pipeline } from "@xenova/transformers";
import { openDB } from 'idb';

const CHUNK_SIZE = 1000;
const DB_NAME = 'VectorStoreDB';
const STORE_NAME = 'vectors';

export class SimpleVectorStore {
  constructor() {
    this.db = null;
  }

  async initDB() {
    this.db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    });
  }

  async addDocument(embedding, document, docId) {
    await this.db.add(STORE_NAME, { embedding, document, docId });
  }

  async getDocuments() {
    return await this.db.getAll(STORE_NAME);
  }

  async getDocumentsByDocId(docId) {
    const allDocs = await this.getDocuments();
    return allDocs.filter(doc => doc.docId === docId);
  }

  async listDocuments() {
    const allDocs = await this.getDocuments();
    const docNames = [...new Set(allDocs.map(doc => doc.docId))];
    return docNames.map(name => ({ name }));
  }

  async similaritySearch(queryEmbedding, topK) {
    const allDocs = await this.getDocuments();
    let scores = allDocs.map((doc) => ({
      score: cosineSimilarity(doc.embedding, queryEmbedding),
      document: doc.document
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }
}

export function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magA * magB);
}

class EmbeddingsWorker {
  constructor(modelName = "Xenova/all-MiniLM-L6-v2") {
    this.modelName = modelName;
    this.client = null;
    this.vectorStore = new SimpleVectorStore();
  }

  async loadClient() {
    if (!this.client) {
      this.client = await pipeline("feature-extraction", this.modelName);
    }
  }

  async _embed(texts) {
    await this.loadClient();
    const embedResults = await Promise.all(
      texts.map(async (text) => {
        const response = await this.client(text, {
          pooling: "mean",
          normalize: true
        });
        return response.data;
      })
    );
    return embedResults;
  }

  async addDocumentsToStore(docs, chunkSize = 1000) {
    await this.vectorStore.initDB();
    for (const doc of docs) {
      const { text, name } = doc;
      const chunks = this.chunkText(text, chunkSize);
      const embeddings = await this._embed(chunks);
      embeddings.forEach((embedding, index) => {
        this.vectorStore.addDocument(embedding, chunks[index], name);
      });
    }
  }

  chunkText(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
      chunks.push(text.substring(i, i + size));
    }
    return chunks;
  }

  async searchSimilarDocuments(query, topK) {
    await this.vectorStore.initDB();
    const queryEmbedding = await this._embed([query]);
    return this.vectorStore.similaritySearch(queryEmbedding[0], topK);
  }

  async getDocumentsByDocId(docId) {
    await this.vectorStore.initDB();
    return this.vectorStore.getDocumentsByDocId(docId);
  }

  async listDocuments() {
    await this.vectorStore.initDB();
    return this.vectorStore.listDocuments();
  }
}

const worker = new EmbeddingsWorker();

self.addEventListener('message', async (event) => {
  if (event.data.action === 'addDocumentsToStore') {
    await worker.addDocumentsToStore(event.data.documents, CHUNK_SIZE);
    self.postMessage({ action: 'documentsAdded' });
  } else if (event.data.action === 'searchSimilarDocuments') {
    const results = await worker.searchSimilarDocuments(event.data.query, event.data.topK);
    self.postMessage({ action: 'searchResults', results });
  } else if (event.data.action === 'getDocumentsByDocId') {
    const results = await worker.getDocumentsByDocId(event.data.docId);
    self.postMessage({ action: 'getDocumentsResults', results });
  } else if (event.data.action === 'listDocuments') {
    const documents = await worker.listDocuments();
    self.postMessage({ action: 'documentsList', documents });
  }
});
