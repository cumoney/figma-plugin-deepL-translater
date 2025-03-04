import { showErrorMessage } from '../utils/notifications';
import { API_ENDPOINT } from '../constants/config';

export interface TranslationResult {
  translated: string;
  detected: string;
}

interface DeepLResponse {
  translations: Array<{
    text: string;
    detected_source_language: string;
  }>;
}

interface DeepLError {
  message: string;
  code?: number;
  status?: number;
}

export const fetchTranslationsWithDetection = async (
  texts: string[],
  target: string,
  apiKey: string
): Promise<TranslationResult[] | undefined> => {
  if (!texts || texts.length === 0) {
    showErrorMessage("翻译文本不能为空");
    return undefined;
  }

  if (!target) {
    showErrorMessage("目标语言不能为空");
    return undefined;
  }

  if (!apiKey) {
    showErrorMessage("API密钥不能为空");
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
      const errorData = await response.json() as DeepLError;
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || '未知错误'}`);
    }

    const result = await response.json() as DeepLResponse;
    if (!result.translations || result.translations.length === 0) {
      throw new Error("翻译返回数据格式错误");
    }

    return result.translations.map(t => ({
      translated: t.text,
      detected: t.detected_source_language
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    showErrorMessage(`API请求出现问题：${errorMessage}`);
    return undefined;
  }
};