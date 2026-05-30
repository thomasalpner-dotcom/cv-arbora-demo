
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.API_KEY || 'MISSING';
    console.log("Using API Key starting with:", apiKey.substring(0, 5) + "...");

    try {
        const genAI = new GoogleGenAI(apiKey);
        // Note: listModels is on the genAI instance or specific version?
        // In @google/genai, it's often better to check via REST if the SDK version is old
        // But let's try the SDK first.

        // Actually, let's just use fetch to be sure of the API version
        const versions = ['v1', 'v1beta'];

        for (const v of versions) {
            console.log(`\n--- Checking version: ${v} ---`);
            const url = `https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.models) {
                data.models.forEach(m => {
                    if (m.name.includes('gemini')) {
                        console.log(`Model: ${m.name} | Methods: ${m.supportedGenerationMethods.join(', ')}`);
                    }
                });
            } else {
                console.log(`Error or no models in ${v}:`, JSON.stringify(data));
            }
        }
    } catch (err) {
        console.error("List failed:", err);
    }
}

listModels();
