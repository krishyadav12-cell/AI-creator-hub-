import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const promptCache = new Map<string, string>();

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

export const geminiService = {
  async generateChatResponse(messages: { role: 'user' | 'model', content: string }[], useThinking = false) {
    const cacheKey = `chat-${JSON.stringify(messages.slice(-1))}-${useThinking}`;
    if (promptCache.has(cacheKey)) return promptCache.get(cacheKey)!;

    const ai = getAI();
    const model = useThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
    const config = useThinking 
      ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } 
      : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };
    
    const response = await ai.models.generateContent({
      model,
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      config: {
        ...config,
        systemInstruction: "You are an AI assistant that helps users create images, improve prompts, generate content ideas, captions, and scripts. Be modern, helpful, and concise."
      }
    });
    const result = response.text || '';
    promptCache.set(cacheKey, result);
    return result;
  },

  async *generateChatResponseStream(messages: { role: 'user' | 'model', content: string }[], useThinking = false) {
    const ai = getAI();
    const model = useThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
    const config = useThinking 
      ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } 
      : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };
    
    const response = await ai.models.generateContentStream({
      model,
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      config: {
        ...config,
        systemInstruction: "You are an AI assistant that helps users create images, improve prompts, generate content ideas, captions, and scripts. Be modern, helpful, and concise."
      }
    });

    for await (const chunk of response) {
      if (chunk.text) yield chunk.text;
    }
  },

  async generateImage(prompt: string, aspectRatio: string = "1:1", imageSize: string = "1K", style: string = "Realistic") {
    const ai = getAI();
    const styledPrompt = `Style: ${style}. Prompt: ${prompt}`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: styledPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: imageSize as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  },

  async enhancePrompt(text: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Convert this simple text into a detailed, professional AI image generation prompt: "${text}". Return ONLY the enhanced prompt text.`,
    });
    return response.text || text;
  },

  async generateSocialContent(prompt: string, type: 'caption' | 'hashtag') {
    const ai = getAI();
    const instruction = type === 'caption' 
      ? `Generate 3 creative Instagram captions for: "${prompt}". Include emojis.` 
      : `Generate 15 trending Instagram hashtags for: "${prompt}".`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: instruction,
    });
    return response.text || '';
  },

  async generateVideoScript(topic: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short (10s) video script and a visual prompt for a video about: "${topic}". Return as JSON with "script" and "prompt" fields.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            prompt: { type: Type.STRING }
          },
          required: ["script", "prompt"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  async generateVideo(prompt: string) {
    // Try Kling AI proxy first
    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        return await response.blob();
      }
    } catch (e) {
      console.warn("Kling AI failed, falling back to Gemini Veo", e);
    }

    // Fallback to Gemini Veo
    try {
      const ai = getAI();
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video generated");
      
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: { 'x-goog-api-key': apiKey },
      });
      const blob = await response.blob();
      return blob;
    } catch (veoError: any) {
      console.error("Gemini Veo failed:", veoError);
      if (veoError?.message?.includes("PERMISSION_DENIED") || veoError?.status === "PERMISSION_DENIED") {
        throw new Error("Video generation is currently unavailable. Please check your API key permissions or try again later.");
      }
      throw veoError;
    }
  },

  async generateLyrics(topic: string, genre: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate short, catchy song lyrics about: "${topic}". Genre: ${genre}. Return only the lyrics.`,
    });
    return response.text || '';
  },

  async generateSpeech(text: string, voice: string = 'Zephyr') {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    return `data:audio/mpeg;base64,${base64Audio}`;
  }
};
