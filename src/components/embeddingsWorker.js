import { pipeline } from "@xenova/transformers";

const CHUNK_SIZE = 1000;

export class SimpleVectorStore {
  constructor() {
      this.documents = [];
      this.embeddings = [];
  }

  addDocument(embedding, document) {
    this.embeddings.push(embedding);
    this.documents.push(document);
  }


  async similaritySearch(queryEmbedding, topK) {
      let scores = this.embeddings.map((emb, index) => ({
          score: cosineSimilarity(emb, queryEmbedding),
          index: index
      }));

      scores.sort((a, b) => b.score - a.score);

      return scores.slice(0, topK).map(score => ({
          document: this.documents[score.index],
          score: score.score
      }));
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
    for (const doc of docs) {
      const chunks = this.chunkText(doc, chunkSize);
      const embeddings = await this._embed(chunks);
      embeddings.forEach((embedding, index) => {
        this.vectorStore.addDocument(embedding, chunks[index]);
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
    const queryEmbedding = await this._embed([query]);
    return this.vectorStore.similaritySearch(queryEmbedding[0], topK);
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
  }
});
