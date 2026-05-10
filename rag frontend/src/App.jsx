import { useState } from 'react';
import api from './api';

export default function App() {
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {
    if (!file) {
      alert('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);

      const res = await api.post('/upload', formData);

      setDocumentId(res.data.documentId);

      setMessages([
        {
          role: 'system',
          content: `📄 ${res.data.filename} uploaded successfully (${res.data.totalChunks} chunks indexed).`,
        },
      ]);
    } catch (error) {
      alert(error.response?.data?.error || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!documentId) {
      alert('Please upload a document first.');
      return;
    }

    if (!question.trim()) return;

    const userQuestion = question;
    setQuestion('');

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userQuestion },
    ]);

    try {
      setLoading(true);

      const res = await api.post('/chat', {
        documentId,
        question: userQuestion,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            error.response?.data?.error ||
            'Something went wrong.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const bubbleClasses = (role) => {
    switch (role) {
      case 'user':
        return 'bg-blue-600 text-white ml-auto';
      case 'assistant':
        return 'bg-white border border-slate-200 text-slate-800';
      default:
        return 'bg-amber-50 border border-amber-200 text-amber-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur rounded-3xl shadow-2xl border border-white">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-5">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            NotebookLM RAG
          </h1>
          <p className="text-slate-500 mt-1">
            Upload a PDF, DOCX, or TXT file and chat with your document.
          </p>
        </div>

        {/* Upload Section */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-3">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl px-4 py-4 bg-slate-50 hover:bg-slate-100 transition">
                <p className="text-sm text-slate-500">
                  {file
                    ? `Selected: ${file.name}`
                    : 'Choose a PDF, DOCX, or TXT file'}
                </p>
              </div>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>

            <button
              onClick={uploadFile}
              disabled={loading || !file}
              className="px-6 py-4 rounded-2xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-[420px] overflow-y-auto px-6 py-5 bg-slate-50">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-center">
              <div>
                <div className="text-5xl mb-3">📚</div>
                <p>Upload a document to begin.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm whitespace-pre-wrap ${bubbleClasses(
                    msg.role
                  )}`}
                >
                  {msg.content}
                </div>
              ))}

              {loading && (
                <div className="bg-white border border-slate-200 text-slate-500 px-4 py-3 rounded-2xl max-w-[85%] shadow-sm">
                  Thinking...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question Input */}
        <div className="p-6 border-t border-slate-100">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  askQuestion();
                }
              }}
              placeholder="Ask a question about your document..."
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-4 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500"
            />

            <button
              onClick={askQuestion}
              disabled={loading || !documentId}
              className="px-6 py-4 rounded-2xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
            >
              {loading ? 'Processing...' : 'Ask'}
            </button>
          </div>

          {!documentId && (
            <p className="text-xs text-slate-400 mt-2">
              Upload a document before asking questions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}