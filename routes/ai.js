const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('[AI Warning] GEMINI_API_KEY is not defined in environment variables!');
}
const genAI = new GoogleGenerativeAI(apiKey);

// Models that are currently active for your key
const PRIMARY_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

// Helper to handle requests with retry and graceful fallback on 503/429
async function generateWithFallback(prompt, generationConfig = {}) {
  let lastError;

  for (const modelName of PRIMARY_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });

        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        lastError = err;

        // 503 = high demand / temporary overload, 429 = rate limit
        if (err.status === 503 || err.status === 429) {
          console.warn(`[AI Notice] ${modelName} returned ${err.status}. Trying next available option...`);
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        } else {
          // If it's a 404 (model not found), break immediately to the next model in the array
          break;
        }
      }
    }
  }

  throw lastError;
}

// Fallback language detector
function detectLanguage(message) {
  const banglaRegex = /[\u0980-\u09FF]/;
  const englishRegex = /^[A-Za-z0-9 .,!?\n]+$/;
  if (banglaRegex.test(message)) return 'Bangla';
  if (englishRegex.test(message)) return 'English';
  return 'Banglish';
}

// Extracts valid JSON cleanly even if wrapped in markdown formatting
function safeParseJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON structure found');
  }
}

async function parseMessage(message) {
  const prompt = `You are an AI data extractor for BIAI, an AI training institute in Bangladesh.
Extract lead information from the following message and output valid JSON.

Schema:
{
  "name": "Extracted name (or 'Unknown')",
  "phone": "Extracted phone number (or '')",
  "channel": "WhatsApp" | "Facebook Messenger" | "Facebook comment" | "Website form" | "Phone call note" | "Other",
  "interest": "Bootcamp" | "Fellowship" | "Corporate Training" | "General Enquiry" | "Support" | "Not a Lead",
  "language": "Bangla" | "English" | "Banglish"
}

Extraction Rules:
- If metadata headers exist (e.g., "From: Facebook Messenger", "Sender: Sharmin Sultana"), extract them exactly.
- If the sender mentions "ফেলোশিপ" or "fellowship", set interest to "Fellowship".
- If the sender mentions "বুটক্যাম্প" or "bootcamp", set interest to "Bootcamp".
- If corporate, team, or employee training is mentioned, set interest to "Corporate Training".
- Detect language accurately: Bangla script = "Bangla", English letters representing Bengali phonetic words = "Banglish", English text = "English".

Message:
"""
${message}
"""`;

  try {
    const text = await generateWithFallback(prompt, {
      responseMimeType: 'application/json',
    });
    return safeParseJson(text);
  } catch (err) {
    console.error('AI parsing error details:', err);
    return {
      name: 'Unknown',
      phone: '',
      channel: 'Other',
      interest: 'General Enquiry',
      language: detectLanguage(message),
    };
  }
}

// Route: POST /parse
router.post('/parse', async (req, res) => {
  const message = req.body.message || req.body.text;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const parsed = await parseMessage(message);
    res.json(parsed);
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'AI parsing failed' });
  }
});

// Route: POST /reply
router.post('/reply', async (req, res) => {
  const { message, language, interest, name } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const tone =
      language === 'Bangla'
        ? 'friendly, polite Bangla (বাংলা)'
        : language === 'Banglish'
          ? 'natural, polite Banglish (Bengali written in English letters)'
          : 'polite and professional English';

    const prompt = `You are a helpful customer advisor at BIAI.
Draft a concise (2-3 sentences) polite reply in ${tone} addressing ${name || 'the customer'} regarding their interest in ${interest}. Include a helpful next step or invitation to ask further questions.

Customer enquiry:
"${message}"`;

    const reply = await generateWithFallback(prompt);
    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error('AI reply error:', err);
    res.status(500).json({ error: 'AI reply generation failed' });
  }
});

module.exports = router;