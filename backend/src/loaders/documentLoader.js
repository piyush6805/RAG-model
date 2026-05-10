import path from 'path';
import fs from 'fs/promises';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';

export async function loadDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf': {
      const loader = new PDFLoader(filePath);
      return await loader.load();
    }

    case '.docx': {
      const loader = new DocxLoader(filePath);
      return await loader.load();
    }

    case '.csv': {
      const loader = new CSVLoader(filePath);
      return await loader.load();
    }

    case '.txt': {
      const content = await fs.readFile(filePath, 'utf-8');
      return [
        new Document({
          pageContent: content,
          metadata: { source: filePath },
        }),
      ];
    }

    default:
      throw new Error(
        'Unsupported file type. Use PDF, DOCX, CSV, or TXT.'
      );
  }
}