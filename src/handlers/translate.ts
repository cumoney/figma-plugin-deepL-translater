import { fetchTranslationsWithDetection, TranslationResult } from '../api/deepl';
import { showErrorMessage, showInfoMessage } from '../utils/notifications';
import { SUPPORTED_LANGUAGES } from '../constants/config';

interface TranslateMessage {
  target: string;
  isReplace: boolean;
  apiKey: string;
}

export const translateHandler = async (messageData: TranslateMessage) => {
  const selectedLayers = figma.currentPage.selection;
  
  if (messageData.target === "auto" || !messageData.target) {
    showErrorMessage("请选择一个有效的目标语言。");
    return;
  }

  const targetLanguageName = SUPPORTED_LANGUAGES[messageData.target] || messageData.target;
  const textsToTranslate: { node: TextNode, text: string }[] = [];

  const collectTexts = (node: SceneNode) => {
    if (node.type === "TEXT") {
      textsToTranslate.push({ node: node as TextNode, text: node.characters });
    } else if ("children" in node) {
      for (const child of node.children) {
        collectTexts(child);
      }
    }
  };

  selectedLayers.forEach(collectTexts);

  if (textsToTranslate.length === 0) {
    showErrorMessage("没有选中文本节点。");
    return;
  }

  showInfoMessage(`正在翻译${textsToTranslate.length}个文本节点...`);
  const translationResults = await fetchTranslationsWithDetection(
    textsToTranslate.map(item => item.text),
    messageData.target,
    messageData.apiKey
  );

  if (translationResults) {
    const nodesToUpdate = textsToTranslate.filter((item, index) =>
      translationResults[index].detected.toLowerCase() !== messageData.target.toLowerCase()
    );

    if (nodesToUpdate.length === 0) {
      showInfoMessage(`没有需要翻译的节点：所选文本已经是${targetLanguageName}。`);
      return;
    }

    const translatedTexts = nodesToUpdate.map((_, index) => translationResults[index].translated);
    await updateTextNodes(nodesToUpdate, translatedTexts, messageData);
    showInfoMessage(`翻译完成。${nodesToUpdate.length}个节点已更新。`);
  }
};

const updateTextNodes = async (
  textsToTranslate: { node: TextNode, text: string }[],
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