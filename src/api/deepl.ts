import { showErrorMessage } from '../utils/notifications';
import { API_ENDPOINT } from '../constants/config';

export interface TranslationResult {
  translated: string;
  detected: string;
}

export const fetchTranslationsWithDetection = async (
  texts: string[],
  target: string,
  apiKey: string
): Promise<TranslationResult[] | undefined> => {
  if (texts.length === 0) {
    showErrorMessage("翻译文本不能为空");
    return undefined;
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: texts,
        target_lang: target,
        source_lang: 'auto'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.translations || result.translations.length === 0) {
      throw new Error("翻译返回数据格式错误");
    }

    return result.translations.map((t: any) => ({
      translated: t.text,
      detected: t.detected_source_language
    }));
  } catch (error) {
    showErrorMessage(`API请求出现问题。\n(${error})`);
    return undefined;
  }
};