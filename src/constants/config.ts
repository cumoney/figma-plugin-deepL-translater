export const API_ENDPOINT = 'http://localhost:30000/server.mjs';

export const SUPPORTED_LANGUAGES = {
  'en': '英语',
  'zh': '中文',
  'ja': '日语',
  'ko': '韩语',
  'ru': '俄语',
} as const;

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