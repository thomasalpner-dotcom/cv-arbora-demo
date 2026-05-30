import { GoogleGenAI } from "@google/genai";
import mammoth from "mammoth";
import { ResumeData, INITIAL_RESUME } from "../types";

export class ImportService {
    /**
     * Extracts text from a File object (supported: .docx, .pdf)
     */
    static async extractText(file: File): Promise<string> {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } else if (extension === 'pdf') {
            return await this.extractPdfText(file);
        } else if (extension === 'txt') {
            return await file.text();
        }

        throw new Error(`Filformatet .${extension} stöds inte ännu.`);
    }

    /**
     * Extracts text from a PDF file using pdfjs-dist via CDN
     */
    private static async extractPdfText(file: File): Promise<string> {
        return new Promise(async (resolve, reject) => {
            try {
                const arrayBuffer = await file.arrayBuffer();

                // Load PDF.js from CDN dynamically if not available
                if (!(window as any).pdfjsLib) {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                    document.head.appendChild(script);
                    await new Promise(r => script.onload = r);
                }

                const pdfjsLib = (window as any).pdfjsLib;
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const strings = content.items.map((item: any) => item.str);
                    fullText += strings.join(" ") + "\n";
                }

                resolve(fullText);
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Fixes common "Mojibake" encoding issues specifically for Swedish characters
     * when text is incorrectly parsed from ISO-8859-1/Windows-1252 to UTF-8.
     */
    static sanitizeText(text: string): string {
        if (!text) return text;
        
        let cleaned = text;
        
        // Common Mojibake replacements
        const replacements: Record<string, string> = {
            'Ã¥': 'å', 'Ã¤': 'ä', 'Ã¶': 'ö',
            'Ã…': 'Å', 'Ã„': 'Ä', 'Ã–': 'Ö',
            'Ã©': 'é', 'Ã ': 'à', 'Ã¨': 'è', 'Ã¼': 'ü',
            'â€“': '–', 'â€”': '—', // dashes
            'â€™': '’', 'â€œ': '“', 'â€': '”', // quotes
            'â€¢': '•', // bullet
        };

        for (const [bad, good] of Object.entries(replacements)) {
            cleaned = cleaned.split(bad).join(good);
        }

        return cleaned;
    }

    /**
     * Uses Gemini to map raw text to Savå ResumeData structure
     */
    static async mapTextToResume(text: string, apiKey: string, modelId: string = 'gemini-2.0-flash', customPrompt?: string): Promise<Partial<ResumeData>> {
        if (!apiKey) throw new Error("API-nyckel saknas.");

        const sanitizedText = this.sanitizeText(text);

        const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

        const prompt = customPrompt ? `
            ${customPrompt}
            
            TEXT FRÅN CV:
            """
            ${sanitizedText.substring(0, 15000)} 
            """
            
            SVARAFORMAT (Endast JSON):
            {
                "personal": {
                    "firstName": "String",
                    "lastName": "String",
                    "jobTitle": "String"
                },
                "profile": "Sammanfattning här...",
                "skills": [
                    {"name": "Kompetens 1", "level": 5}
                ],
                "experience": [
                    {
                        "role": "Yrkestitel",
                        "company": "Företag",
                        "description": "Kort beskrivning av uppdraget"
                    }
                ]
            }
        ` : `
            Du är en expert på att tolka CV:n. Din uppgift är att ta nedanstående råtext från ett CV och omvandla den till en strukturerad JSON-profil.
            
            EXTRAHERA FÖLJANDE:
            - Förnamn och efternamn
            - Nuvarande yrkestitel
            - En kort sammanfattande profil (ca 3-4 meningar)
            - En lista på viktigaste färdigheter/kompetenser (max 12 stycken)
            - Professionell erfarenhet (de 10 senaste eller viktigaste rollerna)
            
            TEXT FRÅN CV:
            """
            ${sanitizedText.substring(0, 15000)} 
            """
            
            SVARAFORMAT (Endast JSON):
            {
                "personal": {
                    "firstName": "String",
                    "lastName": "String",
                    "jobTitle": "String"
                },
                "profile": "Sammanfattning här...",
                "skills": [
                    {"name": "Kompetens 1", "level": 5}
                ],
                "experience": [
                    {
                        "role": "Yrkestitel",
                        "company": "Företag",
                        "description": "Kort beskrivning av uppdraget"
                    }
                ]
            }
        `;

        let jsonString = "";
        try {
            const result = await ai.models.generateContent({
                model: modelId,
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: "application/json" }
            });
            jsonString = result.text;
        } catch (initialError: any) {
            if (initialError?.status === 503 || initialError?.status === 429 || initialError?.message?.includes('503') || initialError?.message?.includes('429')) {
                console.warn(`Model ${modelId} hit rate limit or unavailable. Retrying with gemini-1.5-flash...`);
                const fallbackResult = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseMimeType: "application/json" }
                });
                jsonString = fallbackResult.text;
            } else {
                throw initialError;
            }
        }

        try {
            // Cleanup JSON if AI added markdown blocks
            jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(jsonString);
            return {
                ...INITIAL_RESUME,
                personal: {
                    ...INITIAL_RESUME.personal,
                    ...parsed.personal
                },
                profile: parsed.profile || "",
                skills: Array.isArray(parsed.skills) ? parsed.skills.map((s: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: s.name || "",
                    level: Number(s.level) || 3
                })) : [],
                languages: Array.isArray(parsed.languages) ? parsed.languages.map((l: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    name: l.name || "",
                    level: l.level || "Goda kunskaper"
                })) : [],
                experience: Array.isArray(parsed.experience) ? parsed.experience.map((exp: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    role: exp.role || "",
                    company: exp.company || "",
                    description: exp.description || "",
                    location: exp.location || "",
                    startDate: exp.startDate || "",
                    endDate: exp.endDate || "",
                    current: !!exp.current
                })) : [],
                education: Array.isArray(parsed.education) ? parsed.education.map((edu: any) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    school: edu.school || "",
                    degree: edu.degree || "",
                    location: edu.location || "",
                    startDate: edu.startDate || "",
                    endDate: edu.endDate || "",
                    description: edu.description || ""
                })) : []
            };
        } catch (error: any) {
            console.error("AI Mapping failed:", error);

            // Log failure to monitoring system
            const { MonitoringService } = await import("./MonitoringService");
            MonitoringService.logAIError(
                modelId,
                error?.message || "Unknown error",
                'import'
            );

            throw new Error("Kunde inte tolka CV-texten med AI.");
        }
    }

    /**
     * Parse LinkedIn profile text using Gemini AI
     */
    static async parseLinkedInText(linkedInText: string, apiKey: string, modelId: string = 'gemini-2.0-flash'): Promise<Partial<ResumeData>> {
        if (!apiKey) {
            throw new Error("API-nyckel saknas");
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Du är en expert på att extrahera strukturerad data från LinkedIn-profiler.

Här är text från en LinkedIn-profil:

${linkedInText}

Extrahera följande information och returnera det som JSON:

{
  "personal": {
    "firstName": "Förnamn",
    "lastName": "Efternamn",
    "email": "E-post (om tillgänglig)",
    "phone": "Telefon (om tillgänglig)",
    "jobTitle": "Nuvarande jobbtitel"
  },
  "profile": "En sammanfattning av personens profil/om-sektion i HTML-format (använd <p> taggar)",
  "experience": [
    {
      "id": "exp_1",
      "role": "Jobbtitel",
      "company": "Företagsnamn",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM eller tom sträng om nuvarande",
      "current": true/false,
      "description": "Beskrivning av arbetsuppgifter i HTML-format (använd <ul><li> för punktlistor)",
      "location": "Plats"
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "school": "Skolnamn",
      "degree": "Examen/Utbildning",
      "startDate": "YYYY",
      "endDate": "YYYY",
      "description": "Beskrivning",
      "location": "Plats"
    }
  ],
  "skills": [
    {
      "id": "skill_1",
      "name": "Kompetensnamn",
      "level": 4
    }
  ],
  "languages": [
    {
      "id": "lang_1",
      "name": "Språk",
      "level": "Flytande"
    }
  ]
}

VIKTIGT:
- Returnera ENDAST JSON, inga förklaringar
- Använd svenska för alla texter
- Generera unika ID:n för varje objekt
- Om information saknas, använd tom sträng eller tom array
- För skills, uppskatta level 1-5 baserat på erfarenhet
- För languages, använd: "Grundläggande", "Goda kunskaper", "Flytande", eller "Modersmål"`;

        let resultText = "";
        try {
            const result = await ai.models.generateContent({
                model: modelId,
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: "application/json" }
            });
            resultText = typeof result.text === 'string' ? result.text : JSON.stringify(result);
        } catch (initialError: any) {
            if (initialError?.status === 503 || initialError?.status === 429 || initialError?.message?.includes('503') || initialError?.message?.includes('429')) {
                console.warn(`Model ${modelId} hit rate limit or unavailable. Retrying with gemini-1.5-flash...`);
                const fallbackResult = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: { parts: [{ text: prompt }] },
                    config: { responseMimeType: "application/json" }
                });
                resultText = typeof fallbackResult.text === 'string' ? fallbackResult.text : JSON.stringify(fallbackResult);
            } else {
                throw initialError;
            }
        }

        try {
            const parsed = JSON.parse(resultText);

            return {
                ...INITIAL_RESUME,
                ...parsed
            };
        } catch (error: any) {
            console.error("LinkedIn parsing failed:", error);

            // Log failure to monitoring system
            const { MonitoringService } = await import("./MonitoringService");
            MonitoringService.logAIError(
                modelId,
                error?.message || "Unknown error",
                'import'
            );

            throw new Error("Kunde inte tolka LinkedIn-profilen med AI.");
        }
    }
}
