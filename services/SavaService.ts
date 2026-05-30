import { GoogleGenAI } from "@google/genai";
import { ResumeData } from "../types";

export class SavaService {
  static async searchCandidates(query: string, allResumes: ResumeData[], apiKey: string, modelId: string = 'gemini-1.5-flash', customPrompt?: string, savaName: string = 'Savå', language: string = 'sv') {
    console.log("Savå Service V2 (Cache Bypass) active");
    if (!apiKey) throw new Error("API-nyckel saknas för matchning.");

    // Robustness V5: Switch to gemini-2.0-flash based on diagnosed availability
    const normalizedModel = 'gemini-2.0-flash';
    console.log(`[SAVÅ V5-DEBUG] Calling Gemini v1beta with Key: ${apiKey.substring(0, 5)}... Model: ${normalizedModel}`);

    const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

    // Prepare a compact version of resumes to save tokens
    const simplifiedResumes = allResumes.filter(r => r && r.personal).map(r => {
      const skills = Array.isArray(r.skills) ? r.skills : [];
      const experience = Array.isArray(r.experience) ? r.experience : [];
      const education = Array.isArray(r.education) ? r.education : [];

      return {
        id: r.id,
        name: `${r.personal?.firstName || ''} ${r.personal?.lastName || ''}`,
        title: r.personal?.jobTitle || '',
        location: `${r.personal?.city || ''}`,
        education: education.map((edu: any) => `${edu?.degree || ''} at ${edu?.school || ''}`),
        recentExperience: experience.slice(0, 10).map((e: any) => `${e?.role || ''} at ${e?.company || ''} (${(e?.description || '').replace(/<[^>]*>?/gm, '')})`),
        keywords: `${r.personal?.jobTitle || ''} ${r.profile || ''} ${skills.map((s: any) => s?.name || '').join(' ')} ${experience.map((e: any) => e?.role || '').join(' ')}`.toLowerCase()
      };
    });

    const prompt = customPrompt ? `
            ${customPrompt}
            
            SÖKNING: "${query}"
            
            KANDIDATER:
            ${JSON.stringify(simplifiedResumes)}
            
            SVARAFORMAT (JSON):
            {
              "matches": [
                {
                  "resumeId": "ID_HÄR",
                  "score": 95,
                  "reason": "Kort motivering här... (MÅSTE VARA PÅ SPRÅKKOD: ${language})"
                }
              ]
            }
        ` : `
            Du är ${savaName}, en AI-expert på rekrytering och matchning för Aventus.
            
            UPPGIFT:
            Hitta de bäst lämpade kandidaterna för följande förfrågan från en arbetsgivare:
            "${query}"
            
            INSTRUKTIONER:
            1. Analysera kandidaterna i listan nedan.
            2. Välj ut de 5-10 bästa matchningarna.
            3. Ge varje matchning en matchningspoäng (score) mellan 0 och 100.
            4. Ge en kort motivering (reason) varför kandidaten matchar.
            5. Returnera resultatet som en JSON-array under nyckeln "matches".
            6. VIKTIGT: Du MÅSTE skriva motiveringarna på språkkoden "${language}" om inte användaren ber om något annat.
            
            KANDIDATER:
            ${JSON.stringify(simplifiedResumes)}
            
            SVARAFORMAT (JSON):
            {
              "matches": [
                {
                  "resumeId": "ID_HÄR",
                  "score": 95,
                  "reason": "Kort motivering här... (MÅSTE VARA PÅ SPRÅKKOD: ${language})"
                }
              ]
            }
        `;

    try {
      const response = await ai.models.generateContent({
        model: normalizedModel,
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      console.log("Savå AI Raw Response:", text);

      if (!text) throw new Error("Savå returnerade inget svar.");

      // Robust JSON Extraction
      let cleanJson = text.trim();
      
      // Find the first '{' and the last '}' to strip any leading/trailing AI explanations or markdown
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }

      return JSON.parse(cleanJson);
    } catch (error: any) {
      console.error("Savå Matching Error:", error);

      // Log failure to monitoring system
      const { MonitoringService } = await import("./MonitoringService");
      MonitoringService.logAIError(
        normalizedModel,
        error?.message || "Unknown error",
        'matching'
      );

      if (error.message?.includes('403')) throw new Error("API-nyckeln är ogiltig eller saknar behörighet.");
      if (error.message?.includes('429')) throw new Error("För många sökningar just nu. Vänta en stund.");
      throw error;
    }
  }
}
