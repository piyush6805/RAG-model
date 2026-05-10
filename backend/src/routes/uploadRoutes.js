import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ingestDocument } from '../services/ingestService.js';

const router = express.Router();

// Configure multer to preserve original file extension
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    const documentId = uuidv4();

    const result = await ingestDocument(
      req.file.path,
      documentId
    );

    res.json({
      documentId,
      filename: req.file.originalname,
      ...result,
    });
  } catch (error) {
    console.error('Upload error:', error.message);
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;