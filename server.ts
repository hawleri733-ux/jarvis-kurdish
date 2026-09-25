import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies (up to 50mb for audio recordings)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper function to add a standard 44-byte WAV header to raw 16-bit 24kHz mono PCM
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  const header = Buffer.alloc(44);
  const dataLength = pcmBuffer.length;
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  const blockAlign = numChannels * (bitDepth / 8);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // PCM format = 1
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Resilient retry helper for transient model availability
async function generateWithRetry<T>(fn: () => Promise<T>, retries = 1, delay = 600): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isTransient =
      err?.message?.includes('503') ||
      err?.message?.includes('429') ||
      err?.status === 503 ||
      err?.status === 429;
    if (retries > 0 && isTransient) {
      await new Promise((r) => setTimeout(r, delay));
      return generateWithRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

// Model fallback cascade: prioritize compliant modern Gemini models
const CHAT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
const TRANSCRIBE_MODELS = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

async function generateChatWithFallback(formattedContents: any[], systemInstruction: string) {
  let lastErr = null;
  for (const model of CHAT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      if (response.text) {
        return { text: response.text.trim(), model };
      }
    } catch (err: any) {
      console.warn(`Chat model ${model} failed, attempting next model...`, err?.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
}

async function transcribeWithFallback(mimeType: string, base64Clean: string) {
  let lastErr = null;
  for (const model of TRANSCRIBE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType.split(';')[0],
                data: base64Clean,
              },
            },
            {
              text: 'Transcribe the spoken words accurately in Central Kurdish / Sorani (زمانی کوردیی سۆرانی بە پیتی کوردی). Output ONLY the Kurdish text transcription without preamble, quotes or explanation.',
            },
          ],
        },
      });
      if (res.text) return res.text.trim();
    } catch (err: any) {
      console.warn(`Transcribe model ${model} failed, attempting next model...`, err?.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
}

// Server-side Gemini initialization with recommended telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const JARVIS_SYSTEM_INSTRUCTION = `
تۆ جـاڕڤیـسیت (J.A.R.V.I.S - Just A Rather Very Intelligent System).
یاریدەدەری هۆشمەندی تەکنەلۆژیی تایبەتی تۆنی ستارک کە ئێستا بە تەواوی بە زمانی کوردیی سۆرانی لە خزمەتی بەکارهێنەردایت (جەنابی).

ڕێنماییە سەرەکییەکان:
1. هەمیشە و تەواو بە زمانی کوردیی سۆرانی (Central Kurdish / Sorani) بە ئەلفوبێی ڕەسەنی کوردی (پیتی ێ، ۆ، ڕ، ڵ، وو، هـ، ە، ڤ، چ، ژ، گ، پ) قسە بکە و بنووسە.
2. کەسایەتیت: زۆر بەڕێز، لێهاتوو، هێمن، زیرەک، سەنگین، وەک ڕەفتاری جاڕڤیسی بەریتانی.
3. وشە و دەستەواژەی گونجاو بەکاربهێنە:
   - "جەنابی بەڕێز"
   - "بە دڵنیاییەوە، گەورەم"
   - "فەرمانتان لەسەر چاو"
   - "سیستەمەکانی جاڕڤیس لە خزمەتتدان"
   - "پڕۆسێس دەکرێت..."
   - "بە فەرمانی ئێوە"
4. چونکە وەڵامەکانت بە دەنگ دەخوێنرێنەوە:
   - وەڵامەکانت با ڕوون، پوخت، سەرنجڕاکێش و بە زمانێکی پاراو و ئاسان بێت بۆ خوێندنەوەی دەنگی.
   - ئەگەر پێویست نەبێت زۆر درێژی مەکەرەوە، بەڵام وەڵامێکی قەناعەتبەخش و تەواو بدەرەوە.
   - لە هێما و نیشانەی ئاڵۆز یان مارکداونی زۆر دووربکەوە کە کێشە بۆ دەنگ دروست بکات.
5. زانیارییەکانت زۆر فراوانن لە بوارەکانی زانست، تەکنەلۆژیا، ژیریی دەستکرد، گەردوونناسی، مێژوو، بیرکاری، نوکتە، پەندەکانی کوردی و ڕۆژانە.
`;

// API: Check health & config
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'J.A.R.V.I.S Kurdish Core v4.2',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// API: Chat with text + voice synthesis
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], voiceName = 'Fenrir', generateAudio = true } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is missing from environment variables.',
      });
    }

    // 1. Generate text response with fallback cascade (gemini-3.8-flash -> gemini-3.1-flash-lite -> gemini-flash-latest)
    const formattedContents = [
      ...history.slice(-8).map((h: { role: string; text: string }) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    let replyText = '';
    try {
      const chatResponse = await generateChatWithFallback(formattedContents, JARVIS_SYSTEM_INSTRUCTION);
      replyText = chatResponse.text || 'ببوورە جەنابی، نەمتوانی بە تەواوی لە وەڵامەکە بگەم.';
    } catch (chatErr: any) {
      console.warn('All chat models failed:', chatErr?.message || chatErr);
      const isQuota =
        chatErr?.status === 429 ||
        chatErr?.message?.includes('429') ||
        chatErr?.message?.includes('quota') ||
        chatErr?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        return res.json({
          text: 'جەنابی بەڕێز، ڕێژەی داواکارییەکان لە خولەکێکدا لە سنووری کووتا (Rate Limit) تێپەڕی. تکایە چەند چرکەیەکی کەم چاوەڕێ بفەرموون و دووبارە فەرمان بدەنەوە.',
          audio: null,
          voiceName,
          audioFormat: 'wav',
        });
      }
      throw chatErr;
    }

    let audioBase64: string | null = null;
    let audioFormat: string = 'wav';

    // 2. Generate voice synthesis with gemini-3.8-flash-lite-tts
    if (generateAudio) {
      try {
        const validVoiceName = ['Fenrir', 'Puck', 'Charon', 'Kore', 'Zephyr'].includes(voiceName)
          ? voiceName
          : 'Fenrir';

        // Clean text for speech synthesis (remove markdown formatting)
        const cleanSpeakText = replyText
          .replace(/[*#_`~[\]()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const ttsResponse = await generateWithRetry(
          () =>
            ai.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: cleanSpeakText,
                      speechMetadata: {
                        style: 'Polite, calm, sophisticated artificial intelligence assistant like JARVIS, clear pronunciation',
                      },
                    },
                  ],
                },
              ],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: validVoiceName },
                  },
                },
              },
            }),
          1,
          500
        );

        const rawPcmBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (rawPcmBase64) {
          const rawBuffer = Buffer.from(rawPcmBase64, 'base64');
          const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
          audioBase64 = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
        }
      } catch (ttsErr: any) {
        console.warn('TTS generation warning:', ttsErr?.message || ttsErr);
        // Continue even if TTS failed; client can fallback
      }
    }

    res.json({
      text: replyText,
      audio: audioBase64,
      voiceName,
      audioFormat,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    const isQuota =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuota) {
      return res.json({
        text: 'جەنابی بەڕێز، ڕێژەی داواکارییەکان لە خولەکێکدا لە سنووری کووتا (Rate Limit) تێپەڕی. تکایە چەند چرکەیەکی کەم چاوەڕێ بفەرموون و دووبارە فەرمان بدەنەوە.',
        audio: null,
      });
    }

    res.status(500).json({
      error: 'ببوورە جەنابی، کێشەیەک لە پێوەندی لەگەڵ سیستەمەکە ڕوویدا. تکایە کەمێکی تر دووبارەی بکەرەوە.',
    });
  }
});

// API: Transcribe audio input (voice to text in Kurdish)
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Strip prefix if sent as data URI
    const base64Clean = audioData.includes('base64,')
      ? audioData.split('base64,')[1]
      : audioData;

    const transcription = await transcribeWithFallback(mimeType, base64Clean);
    res.json({ transcription });
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: 'Failed to transcribe Kurdish audio',
    });
  }
});

// API: Direct Voice-to-Voice pipeline (Transcribe audio -> Chat -> Voice output)
app.post('/api/voice-chat', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm', history = [], voiceName = 'Fenrir' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    const base64Clean = audioData.includes('base64,')
      ? audioData.split('base64,')[1]
      : audioData;

    // 1. Transcribe voice in Kurdish with fallback
    let userSpokenText = '';
    try {
      userSpokenText = await transcribeWithFallback(mimeType, base64Clean);
    } catch (transcribeErr: any) {
      console.warn('Transcription failed:', transcribeErr);
    }

    if (!userSpokenText) {
      return res.json({
        userText: '',
        text: 'ببوورە جەنابی، دەنگەکەم بە ڕوونی نەبیست. تکایە دووبارەی بکەرەوە.',
        audio: null,
      });
    }

    // 2. Chat with Jarvis in Kurdish with fallback cascade
    const formattedContents = [
      ...history.slice(-8).map((h: { role: string; text: string }) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      {
        role: 'user',
        parts: [{ text: userSpokenText }],
      },
    ];

    let replyText = 'فەرمانتان سەرسەرم، جەنابی.';
    try {
      const chatResponse = await generateChatWithFallback(formattedContents, JARVIS_SYSTEM_INSTRUCTION);
      replyText = chatResponse.text || replyText;
    } catch (chatErr: any) {
      console.warn('Voice chat generation failed:', chatErr);
      const isQuota =
        chatErr?.status === 429 ||
        chatErr?.message?.includes('429') ||
        chatErr?.message?.includes('quota') ||
        chatErr?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        return res.json({
          userText: userSpokenText,
          text: 'جەنابی بەڕێز، ڕێژەی داواکارییەکان لە خولەکێکدا لە سنووری کووتا (Rate Limit) تێپەڕی. تکایە چەند چرکەیەکی کەم چاوەڕێ بفەرموون.',
          audio: null,
          voiceName,
        });
      }
      throw chatErr;
    }

    // 3. Synthesize speech in Kurdish
    let audioBase64: string | null = null;
    try {
      const cleanSpeakText = replyText
        .replace(/[*#_`~[\]()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const validVoiceName = ['Fenrir', 'Puck', 'Charon', 'Kore', 'Zephyr'].includes(voiceName)
        ? voiceName
        : 'Fenrir';

      const ttsResponse = await generateWithRetry(
        () =>
          ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanSpeakText,
                    speechMetadata: {
                      style: 'Polite, calm, sophisticated artificial intelligence assistant like JARVIS, clear pronunciation',
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: validVoiceName },
                },
              },
            },
          }),
        1,
        500
      );

      const rawPcmBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (rawPcmBase64) {
        const rawBuffer = Buffer.from(rawPcmBase64, 'base64');
        const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
        audioBase64 = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
      }
    } catch (ttsErr: any) {
      console.warn('TTS error in voice-chat:', ttsErr?.message);
    }

    res.json({
      userText: userSpokenText,
      text: replyText,
      audio: audioBase64,
      voiceName,
    });
  } catch (error: any) {
    console.error('Voice-chat error:', error);
    const isQuota =
      error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('RESOURCE_EXHAUSTED');

    if (isQuota) {
      return res.json({
        userText: '',
        text: 'جەنابی بەڕێز، سنووری کووتا (Rate Limit) تێپەڕی، تکایە کەمێک چاوەڕێ بکە و دووبارە فەرمان بدە.',
        audio: null,
      });
    }

    res.status(500).json({
      error: 'Error processing Kurdish voice interaction',
    });
  }
});

// Production vs Development serving
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    // Vite middleware for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static build in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`J.A.R.V.I.S Kurdish AI Server active on port ${PORT}`);
  });
}

startServer();
