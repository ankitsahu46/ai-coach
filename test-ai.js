const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/GEMINI_API_KEY="([^"]+)"/);
const apiKey = match ? match[1] : null;

const ai = new GoogleGenAI({ apiKey });

const prompt = `
You are an expert Senior Full-Stack Architect and Career Coach. 
Your task is to generate a comprehensive, structured learning roadmap for a person who wants to become a "Frontend Developer".
Context about the role: Master React, CSS, and modern web UIs.

You MUST return the output EXACTLY matching this JSON structure:
{
  "role": "Frontend Developer",
  "topics": [
    {
      "title": "Topic Name",
      "description": "Brief description of the concept and why it's important",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedTime": "e.g., 2 weeks or 40 hours"
    }
  ]
}

Rules:
1. Provide at least 10 core topics arranged in a logical learning progression (foundational to advanced).
2. ONLY RETURN VALID JSON. Do not include markdown formatting. Do not include any explanations before or after.
3. The difficulty must strictly be one of: "Beginner", "Intermediate", or "Advanced".
`;

async function test() {
  try {
    const aiCall = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });
    const response = await aiCall;
    const text = response.text || "";
    console.log("Raw output size:", text.length);
    const cleanJson = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);
    console.log("Parsed JSON keys:", Object.keys(parsedData));
    console.log("First Topic keys:", Object.keys(parsedData.topics[0]));
  } catch (err) {
    console.error("Error:");
    console.error(err.message);
  }
}

test();
