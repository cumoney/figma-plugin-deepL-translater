export const API_ENDPOINT = '/api/translate';

export const SUPPORTED_LANGUAGES: { [key: string]: string } = {
  'en': '英语',
  'zh': '中文',
  'ja': '日语',
  'ko': '韩语',
  'fr': '法语',
  'de': '德语',
  'es': '西班牙语',
  'it': '意大利语',
  'ru': '俄语',
  'pt': '葡萄牙语'
};

export const UI_CONFIG = {
  width: 340,
  height: 290,
};

export const MESSAGE_TYPES = {
  translate: 'translate',
  setApiKey: 'setApiKey',
  showFigmaErrorNotify: 'showFigmaErrorNotify',
} as const;

export const FRAME_STYLE = {
  opacity: 0.8,
  verticalPadding: 10,
  horizontalPadding: 10,
  maxWidth: 500,
  defaultFont: {
    family: 'Inter',
    style: 'Regular',
  },
} as const;