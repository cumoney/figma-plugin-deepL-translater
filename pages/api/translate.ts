import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import Cors from 'cors';

interface TranslationRequest {
  text: string | string[];
  target_lang: string;
  source_lang?: string;
}

interface TranslationResponse {
  translations: Array<{
    text: string;
    detected_source_language: string;
  }>;
}

const cors = Cors({
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: Function) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await runMiddleware(req, res, cors);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, target_lang, source_lang } = req.body as TranslationRequest;
    const apiKey = req.headers['authorization'];

    if (!apiKey || !apiKey.startsWith('DeepL-Auth-Key ')) {
      return res.status(401).json({ error: 'Missing or invalid API key format' });
    }

    // 提取完整的API密钥，包括冒号后的部分
    const fullApiKey = apiKey.replace('DeepL-Auth-Key ', '');

    if (!text || !target_lang) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await axios.post<TranslationResponse>(
      DEEPL_API_URL,
      {
        text: Array.isArray(text) ? text : [text],
        target_lang: target_lang.toUpperCase(),
        source_lang: source_lang ? source_lang.toUpperCase() : undefined
      },
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${fullApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json({
      translations: response.data.translations.map(t => ({
        text: t.text,
        detected_source_language: t.detected_source_language
      }))
    });
  } catch (error) {
    console.error('DeepL API Error:', error instanceof axios.AxiosError ? error.response?.data || error.message : error);
    return res.status(500).json({
      error: 'Translation failed',
      details: error instanceof axios.AxiosError ? error.response?.data || error.message : String(error)
    });
  }
}