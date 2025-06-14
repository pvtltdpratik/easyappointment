
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import dotenv from 'dotenv';

// Load environment variables from .env.local
// Make sure .env.local is in your .gitignore if it contains sensitive keys.
dotenv.config({ path: '.env.local' });

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn(
    "GEMINI_API_KEY is not set in your .env.local file. The Google AI plugin may not function correctly if the key is required by the models you intend to use."
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: geminiApiKey, // Pass the API key here
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Existing default model
});
