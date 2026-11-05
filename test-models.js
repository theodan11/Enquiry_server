const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function listModels() {
    console.log("Checking API key:", process.env.GEMINI_API_KEY ? "Found" : "MISSING");

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();

    if (data.error) {
        console.error("API Error:", data.error);
        return;
    }

    const supported = (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

    console.log("Supported Models for generateContent:");
    console.log(supported);
}

listModels();