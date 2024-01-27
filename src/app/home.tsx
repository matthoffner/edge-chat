"use client";

import { FormEvent, useEffect, useRef, useState } from 'react';
import { FileLoader } from '../components/FileLoader';
import styles from './page.module.css';
import { useChat } from 'ai/react';

const Home: React.FC = () => {
  // eslint-disable-next-line no-unused-vars
  const [isWorkerLoading, setIsWorkerLoading] = useState(false);
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [searchIsLoading, setIsLoading] = useState(false);
  const [fileText, setFileText] = useState<string>('');
  const embeddingsWorkerRef = useRef<Worker | null>(null);
  const { isLoading, messages, input, handleInputChange, handleSubmit } = useChat();

  useEffect(() => {
    if (typeof window === 'undefined') return;
  
    const EmbeddingsWorker = require('worker-loader!../components/embeddingsWorker.js').default;
    embeddingsWorkerRef.current = new EmbeddingsWorker();
  
    return () => {
      embeddingsWorkerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (fileText && embeddingsWorkerRef.current) {
      embeddingsWorkerRef.current.postMessage({
        action: 'addDocumentsToStore',
        documents: [fileText]
      });
    }
  }, [fileText]);

  const handleSearch = () => {
        return new Promise((resolve) => {
            const handleMessage = (event: any) => {
                if (event.data.action === 'searchResults') {
                    embeddingsWorkerRef.current?.removeEventListener('message', handleMessage);
                    setSearchInProgress(false);
                    resolve(event.data.results);
                }
            };

            embeddingsWorkerRef.current?.addEventListener('message', handleMessage);
            embeddingsWorkerRef.current?.postMessage({
                action: 'searchSimilarDocuments',
                query: input,
                topK: 1
            });
        });
  };

  const modifiedHandleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (input.trim() === '' || searchInProgress) {
            return; // Prevent empty submissions or when a search is already in progress
        }

        setSearchInProgress(true);

        try {
            const results = await handleSearch();
            const serializedResults = JSON.stringify(results);

            const chatRequestOptions = {
                data: { vectorStoreResults: serializedResults },
            };
        
            handleSubmit(e, chatRequestOptions);
        } catch (error) {
            console.error('Error during search:', error);
            setSearchInProgress(false);
        }
  };

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          Upload a PDF or text file to start the analysis.
        </p>
        <FileLoader setFileText={setFileText} />
      </div>

      {fileText && (
        <div className={styles.center}>
          <p>Processed Text Complete</p>
        </div>
      )}

      {isLoading || searchIsLoading && (
        <div className={styles.spinner}>
            <div>...</div>
        </div>
      )}

      <div className={styles.chatContainer}>
        <div className={styles.messagesContainer}>
          {messages.map(m => (
            <div key={m.id} className={m.role === 'user' ? styles.userMessage : styles.aiMessage}>
              <span className={styles.messageRole}>{m.role === 'user' ? 'You: ' : 'AI: '}</span>
              <span className={styles.messageContent}>{m.content}</span>
            </div>
          ))}
        </div>

        <form onSubmit={modifiedHandleSubmit} className={styles.chatForm}>
          <input
            className={styles.chatInput}
            value={input}
            onChange={handleInputChange}
            placeholder="Say something..."
          />
          <button type="submit" className={styles.sendButton}>Send</button>
        </form>
      </div>

    </main>
  );
}

export default Home;
