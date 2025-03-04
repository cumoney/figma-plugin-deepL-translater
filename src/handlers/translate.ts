import { fetchTranslationsWithDetection, TranslationResult } from '../api/deepl';
import { showErrorMessage, showInfoMessage } from '../utils/notifications';
import { SUPPORTED_LANGUAGES } from '../constants/config';
import { loadFonts } from '../utils/fonts';

interface TranslateMessage {
  target: string;
  isReplace: boolean;
  apiKey: string;
}

type TextNodeWithContent = {
  node: TextNode;
  text: string;
};

export const translateHandler = async (messageData: TranslateMessage) => {
  try {
    const selectedLayers = figma.currentPage.selection;
    
    if (messageData.target === "auto" || !messageData.target) {
      throw new Error("请选择一个有效的目标语言。");
    }

    const targetLanguageName = SUPPORTED_LANGUAGES[messageData.target] || messageData.target;
    const textsToTranslate = collectTextNodes(selectedLayers);

    if (textsToTranslate.length === 0) {
      throw new Error("没有选中文本节点。");
    }

    showInfoMessage(`正在翻译${textsToTranslate.length}个文本节点...`);
    const translationResults = await fetchTranslationsWithDetection(
      textsToTranslate.map(item => item.text),
      messageData.target,
      messageData.apiKey
    );

    if (!translationResults) {
      throw new Error("翻译过程中出现错误");
    }

    await processTranslationResults(
      textsToTranslate,
      translationResults,
      messageData,
      targetLanguageName
    );
  } catch (error) {
    showErrorMessage(error instanceof Error ? error.message : String(error));
  }
};

const collectTextNodes = (nodes: readonly SceneNode[]): TextNodeWithContent[] => {
  const textsToTranslate: TextNodeWithContent[] = [];

  const collectTexts = (node: SceneNode) => {
    if (node.type === "TEXT") {
      textsToTranslate.push({ node: node as TextNode, text: node.characters });
    } else if ("children" in node) {
      for (const child of node.children) {
        collectTexts(child);
      }
    }
  };

  nodes.forEach(collectTexts);
  return textsToTranslate;
};

const replaceTextWithStyle = async (node: TextNode, translatedText: string) => {
  node.characters = translatedText;
};

const appendSuggestText = async (node: TextNode, translatedText: string, targetLang: string) => {
  const originalText = node.characters;
  node.characters = `${originalText}\n[${targetLang}] ${translatedText}`;
};

const processTranslationResults = async (
  textsToTranslate: TextNodeWithContent[],
  translationResults: TranslationResult[],
  messageData: TranslateMessage,
  targetLanguageName: string
) => {
  const nodesToUpdate = textsToTranslate.filter((_, index) =>
    translationResults[index].detected.toLowerCase() !== messageData.target.toLowerCase()
  );

  if (nodesToUpdate.length === 0) {
    showInfoMessage(`没有需要翻译的节点：所选文本已经是${targetLanguageName}。`);
    return;
  }

  const translatedTexts = nodesToUpdate.map((_, index) => translationResults[index].translated);
  await updateTextNodes(nodesToUpdate, translatedTexts, messageData);
  showInfoMessage(`翻译完成。${nodesToUpdate.length}个节点已更新。`);
};

const updateTextNodes = async (
  textsToTranslate: TextNodeWithContent[],
  translatedTexts: string[],
  messageData: TranslateMessage
) => {
  for (let i = 0; i < textsToTranslate.length; i++) {
    const { node } = textsToTranslate[i];
    const translatedText = translatedTexts[i];

    await loadFonts(node);
    
    if (messageData.isReplace) {
      await replaceTextWithStyle(node, translatedText);
    } else {
      await appendSuggestText(node, translatedText, messageData.target);
    }
  }
};