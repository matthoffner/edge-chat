import { pipeline } from "@xenova/transformers";

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

      // these are empty?
      console.log('similaritySearch', queryEmbedding, scores, this.embeddings);

      scores.sort((a, b) => b.score - a.score);

      return scores.slice(0, topK).map(score => ({
          document: this.documents[score.index],
          score: score.score
      }));
  }
}

export function cosineSimilarity(vecA, vecB) {
  console.log('cosineSimilarity', vecA, vecB);
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
          this.client = await pipeline("embeddings", this.modelName);
      }
  }

  async _embed(texts) {
      await this.loadClient();
      return Promise.all(
          texts.map(async (text) => {
              const response = await this.client(text, {
                  pooling: "mean", 
                  normalize: true 
              });
              return response.data;
          })
      );
      console.log("Embeddings: ", embeddings); // Debugging: Check embeddings
  }

  async addDocumentsToStore(docs) {
      const embeddings = await this._embed(docs);
      embeddings.forEach((embedding, index) => {
          console.log(embedding, index);
          this.vectorStore.addDocument(embedding, docs[index]);
      });
  }

  async searchSimilarDocuments(query, topK) {
      const queryEmbedding = await this._embed([query]);
      console.log(queryEmbedding);
      return this.vectorStore.similaritySearch(queryEmbedding[0], topK);
  }
}

function testVectorStore() {
    const store = new SimpleVectorStore();

    // Mock embeddings (simple vectors for testing)
    const mockEmbeddings = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];

    // Add mock embeddings to the store
    mockEmbeddings.forEach((emb, index) => {
        store.addDocument(emb, `Document ${index + 1}`);
    });

    // Test cosine similarity directly
    const cosSimTest = cosineSimilarity([1, 0, 0], [0, 1, 0]);
    console.log('Cosine Similarity Test:', cosSimTest); // Should be 0 for orthogonal vectors

    // Perform a similarity search
    const results = store.similaritySearch([1, 0, 0], 2);
    console.log('Similarity Search Results:', results);
}

// Run the test function
testVectorStore();