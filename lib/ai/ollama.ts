import { MultiAiClient } from '@rajat19/aiwrap';

// Initialize the aiwrap client
// We explicitly configure it here to ensure it uses the local Ollama backend for the jobfinder app.
export const aiClient = new MultiAiClient({
  provider: 'ollama',
  model: process.env.OLLAMA_MODEL || 'gpt-oss:20b',
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

// We keep this for legacy references, but aiClient.generate handles model selection internally usually.
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
