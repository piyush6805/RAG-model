import express from 'express';
import { askQuestionCorrective } from '../services/correctiveChatService.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({
        error: 'documentId and question are required',
      });
    }

    const result = await askQuestionCorrective(
      documentId,
      question
    );

    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;