import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, target_lang, source_lang } = req.body;
  const apiKey = req.headers.authorization?.replace('DeepL-Auth-Key ', '');

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  if (!text || !target_lang) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const response = await axios.post(
      DEEPL_API_URL,
      {
        text: Array.isArray(text) ? text : [text],
        target_lang: target_lang.toUpperCase(),
        source_lang: source_lang?.toUpperCase() || 'AUTO'
      },
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json({
      translations: response.data.translations.map((t: any) => ({
        text: t.text,
        detected_source_language: t.detected_source_language
      }))
    });
  } catch (error: any) {
    console.error('DeepL API Error:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Translation failed',
      details: error.response?.data || error.message
    });
  }
}