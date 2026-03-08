import { MultiAiClient } from '@rajat19/aiwrap';

const aiClient = new MultiAiClient({
  provider: 'ollama',
  model: 'gpt-oss:20b',
  baseUrl: 'http://localhost:11434',
});

async function main() {
  console.log('Generating response...');
  const response = await aiClient.generate({
    prompt: `Extract structured information into JSON matching this schema:
{
  "skills": ["list", "of", "skills"],
  "summary": "Professional summary",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Duration (e.g. 2020-2023)"
    }
  ]
}

RESUME TEXT:
John Doe - Frontend Engineer
Experience: Apple Inc, Frontend Developer, Jan 2021 - Present. Used React, TypeScript, Redux.
Skills: javascript, CSS, HTML, Webpack, Node.js`,
    strictJson: true,
    maxJsonRetries: 1,
    temperature: 0.0,
  });

  console.log('Raw JSON type:', typeof response.json);
  console.log('Parsed JSON:', JSON.stringify(response.json, null, 2));
}

main().catch(console.error);
