"use client";

import React, { useState, useEffect } from 'react';
// @ts-ignore
import * as PDFJS from 'pdfjs-dist/build/pdf';
import FileEmbedder from './FileEmbedder';

PDFJS.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

interface FileLoaderProps {
  setFileText: (text: string) => void;
  setFileName: (name: string) => void;
}

export const FileLoader: React.FC<FileLoaderProps> = ({ setFileName, setFileText }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle file processing
  useEffect(() => {
    const processPDF = async (file: File) => {
      try {
        const fileData = new Uint8Array(await file.arrayBuffer());
        const pdf = await PDFJS.getDocument({ data: fileData }).promise;
        const maxPages = pdf.numPages;
        const pageTexts = [];

        for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
          const page = await pdf.getPage(pageNo);
          const tokenizedText = await page.getTextContent();
          // @ts-ignore
          const pageText = tokenizedText.items.map(token => token.str).join(' ');
          pageTexts.push(pageText);
        }

        const documentText = pageTexts.join(' ');
        setFileText(documentText);
      } catch (error) {
        console.error('PDF processing error:', error);
      }
    };

    if (selectedFile && selectedFile.type === "application/pdf") {
      processPDF(selectedFile);
    }
  }, [selectedFile, setFileText]);

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      setFileText(text);
      setFileName(file.name);
    }
  };

  return (
    <div>
      <FileEmbedder onFileSelect={handleFileChange} />
      {/* Optionally display some status or progress indicator */}
    </div>
  );
};
