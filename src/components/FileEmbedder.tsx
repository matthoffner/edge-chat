"use client"

interface FileEmbedderProps {
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
  
const FileEmbedder: React.FC<FileEmbedderProps> = ({ onFileSelect }) => {
    return (
      <input type="file" accept=".pdf, text/plain" onChange={onFileSelect} />
    );
}
  
export default FileEmbedder;
  