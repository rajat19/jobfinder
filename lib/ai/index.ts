import { AiProvider, MultiAiClient } from '@rajat19/aiwrap';

// Initialize the aiwrap client
// We explicitly configure it here to ensure it uses the local Ollama backend for the jobfinder app.
export const aiClient = new MultiAiClient({
  provider: (process.env.AI_PROVIDER || 'ollama') as AiProvider,
  model: process.env.AI_MODEL || 'gpt-oss:20b',
  baseUrl: process.env.AI_URL || 'http://localhost:11434',
  apiKey: process.env.AI_API_KEY,
});
