const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

// Helper to detect language (simple heuristic)
function detectLanguage(message) {
  const banglaRegex = /[\u0980-\u09FF]/; // Bengali Unicode block
  const englishRegex = /^[A-Za-z0-9 .,!?\n]+$/;
  if (banglaRegex.test(message)) return 'Bangla';
  if (englishRegex.test(message)) return 'English';
  return 'Banglish'; // mixed or transliterated
}

// Simple parser to extract name, phone, channel, interest
async function parseMessage(message) {
  const prompt = `You are an AI assistant for a Bangladeshi AI bootcamp. Extract the following fields from the user message and return a JSON object with keys: name, phone, channel, interest, language. Use these rules:\n- name: the person's name if present, otherwise "Unknown"\n- phone: any Bangladeshi phone number (starts with 01) if present, otherwise ""\n- channel: one of [WhatsApp, Facebook Messenger, Facebook comment, Website form, Phone call note, Other] based on context.\n- interest: one of [Bootcamp, Fellowship, Corporate Training, General Enquiry, Support, Not a Lead] based on the user's request.\n- language: detect if the message is primarily Bangla (Bengali script), English, or Banglish (mixed Latin script with Bangla words).\nReturn ONLY the JSON object, no extra text.\nMessage: "${message}"`;
  const result = await model.generateContent(prompt);
  const text = await result.response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
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
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  try {
    const parsed = await parseMessage(message);
    res.json(parsed);
  } catch (err) {
    console.error('AI parse error', err);
    res.status(500).json({ error: 'AI parsing failed' });
  }
});

// Route: POST /reply
router.post('/reply', async (req, res) => {
  const { message, language, interest, name } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  try {
    const tone = language === 'Bangla' ? 'friendly in Bangla' : language === 'Banglish' ? 'friendly Banglish' : 'friendly English';
    const prompt = `Compose a concise, polite reply to the following enquiry in ${tone}. The user is interested in ${interest}. Their name is ${name || 'Customer'}. Message: "${message}"`;
    const result = await model.generateContent(prompt);
    const reply = await result.response.text();
    res.json({ reply });
  } catch (err) {
    console.error('AI reply error', err);
    res.status(500).json({ error: 'AI reply generation failed' });
  }
});

module.exports = router;
