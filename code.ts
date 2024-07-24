//映射语言中文名
const languageNames: { [key: string]: string } = {
    'en': '英语',
    'zh': '中文',
    'ja': '日语',
    // 可以根据需要添加更多语言
};

const franc = (function() {
    const langData = {
      cmn: /[\u4E00-\u9FFF]/,  // 简体中文
      jpn: /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/,  // 日语
      kor: /[\uAC00-\uD7AF\u1100-\u11FF]/,  // 韩语
      eng: /[a-zA-Z]/,  // 英语
    };
  
    return function detect(input: string): string {
      let maxScore = 0;
      let detectedLang = 'und';  // 未知语言的代码
  
      for (const [lang, regex] of Object.entries(langData)) {
        const score = (input.match(regex) || []).length / input.length;
        if (score > maxScore) {
          maxScore = score;
          detectedLang = lang;
        }
      }
  
      return detectedLang;
    };
})();

enum messageType {
    translate = "translate",
    setApiKey = "setApiKey",
    showFigmaErrorNotify = "showFigmaErrorNotify",
}

let API_KEY: string;
const API_HOST: string = "deepl-translator.p.rapidapi.com";

figma.showUI(__html__, { width: 380, height: 492 });

const init = async () => {
    API_KEY = (await figma.clientStorage.getAsync("API_KEY")) ?? "";
    figma.ui.postMessage({ type: "send-apiKey", payload: API_KEY });
};

figma.ui.onmessage = async (msg) => {
    if (msg.type === messageType.translate) {
        await translateHandler(msg);
    } else if (msg.type === messageType.setApiKey) {
        await setApiKey(msg.apiKey);
    } else if (msg.type === messageType.showFigmaErrorNotify) {
        showErrorMessage(msg.message);
    }
};

const setApiKey = async (apiKey: string) => {
    await figma.clientStorage.setAsync("API_KEY", apiKey);
    figma.notify("API 密钥已保存。");
};

const showErrorMessage = (message: string) => {
    figma.notify(message, { error: true });
    figma.ui.postMessage({ type: "showError", message: message });
};

const showInfoMessage = (message: string) => {
    figma.notify(message);
    figma.ui.postMessage({ type: "showInfo", message: message });
};

const detectLanguage = (text: string): string => {
    const detectedLang = franc(text);
    return mapLanguageCode(detectedLang);
};

const mapLanguageCode = (francCode: string): string => {
    const langMap: { [key: string]: string } = {
        'cmn': 'ZH',
        'jpn': 'JA',
        'kor': 'KO',
        'eng': 'EN',
    };

    return langMap[francCode] || 'EN';
};



const translateHandler = async (messageData: any) => {
    const selectedLayers = figma.currentPage.selection;

    if (messageData.target === "auto" || !messageData.target) {
        figma.notify("请选择一个有效的目标语言。", { error: true });
        return;
    }

    const targetLanguageName = languageNames[messageData.target] || messageData.target;

    const textsToTranslate: { node: TextNode, text: string }[] = [];

    const collectTexts = (node: SceneNode) => {
        if (node.type === "TEXT") {
            const sourceLanguage = detectLanguage(node.characters);
            if (sourceLanguage.toLowerCase() !== messageData.target.toLowerCase()) {
                textsToTranslate.push({ node: node as TextNode, text: node.characters });
            }
        } else if ("children" in node) {
            node.children.forEach(collectTexts);
        }
    };

    selectedLayers.forEach(collectTexts);

    if (textsToTranslate.length === 0) {
        figma.notify(`选中文本已经是${targetLanguageName}，无需翻译。`);
        return;
    }

    figma.notify(`正在翻译 ${textsToTranslate.length} 个文本节点...`);
    const translatedTexts = await fetchTranslations(textsToTranslate.map(item => item.text), messageData.target);

    if (translatedTexts) {
        await updateTextNodes(textsToTranslate, translatedTexts, messageData);
        figma.notify("翻译完成。");
    } else {
        figma.notify("翻译过程中发生错误。", { error: true });
    }
};

const updateTextNodes = async (
    textsToTranslate: { node: TextNode, text: string }[],
    translatedTexts: string[],
    messageData: any
) => {
    for (let i = 0; i < textsToTranslate.length; i++) {
        const { node } = textsToTranslate[i];
        const translatedText = translatedTexts[i];

        // 加载字体
        await loadFonts(node);
        
        if (messageData.isReplace) {
            await replaceTextWithStyle(node, translatedText);
        } else {
            await appendSuggestText(node, translatedText, messageData.target);
        }
    }
};

const replaceTextWithStyle = async (node: TextNode, newText: string) => {
    // 存储原始样式
    const originalStyles = {
        fontName: node.fontName,
        fontSize: node.fontSize,
        textDecoration: node.textDecoration,
        textCase: node.textCase,
        letterSpacing: node.letterSpacing,
        lineHeight: node.lineHeight,
        textAlignHorizontal: node.textAlignHorizontal,
        textAlignVertical: node.textAlignVertical,
        fills: node.fills,
    };

    // 如果文本有多种样式，我们需要逐字符处理
    if (node.hasMissingFont || node.fontName === figma.mixed || node.fontSize === figma.mixed) {
        const chars = node.characters;
        node.characters = newText;


        // 应用原始样式到新文本
        for (let i = 0; i < Math.min(chars.length, newText.length); i++) {
            const fontName = node.getRangeFontName(i, i + 1);
            const fontSize = node.getRangeFontSize(i, i + 1);
            const textDecoration = node.getRangeTextDecoration(i, i + 1);
            const textCase = node.getRangeTextCase(i, i + 1);
            const letterSpacing = node.getRangeLetterSpacing(i, i + 1);
            const lineHeight = node.getRangeLineHeight(i, i + 1);
            const fills = node.getRangeFills(i, i + 1);

            if (fontName !== figma.mixed) node.setRangeFontName(i, i + 1, fontName);
            if (fontSize !== figma.mixed) node.setRangeFontSize(i, i + 1, fontSize);
            if (textDecoration !== figma.mixed) node.setRangeTextDecoration(i, i + 1, textDecoration);
            if (textCase !== figma.mixed) node.setRangeTextCase(i, i + 1, textCase);
            if (letterSpacing !== figma.mixed) node.setRangeLetterSpacing(i, i + 1, letterSpacing);
            if (lineHeight !== figma.mixed) node.setRangeLineHeight(i, i + 1, lineHeight);
            if (fills !== figma.mixed) node.setRangeFills(i, i + 1, fills);
        }
    } else {
        // 如果整个文本使用相同的样式，我们可以直接应用
        node.characters = newText;
        if (originalStyles.fontName !== figma.mixed) node.fontName = originalStyles.fontName as FontName;
        if (originalStyles.fontSize !== figma.mixed) node.fontSize = originalStyles.fontSize as number;
        if (originalStyles.textDecoration !== figma.mixed) node.textDecoration = originalStyles.textDecoration as TextDecoration;
        if (originalStyles.textCase !== figma.mixed) node.textCase = originalStyles.textCase as TextCase;
        if (originalStyles.letterSpacing !== figma.mixed) node.letterSpacing = originalStyles.letterSpacing as LetterSpacing;
        if (originalStyles.lineHeight !== figma.mixed) node.lineHeight = originalStyles.lineHeight as LineHeight;
        if (typeof originalStyles.textAlignHorizontal === 'string') node.textAlignHorizontal = originalStyles.textAlignHorizontal as "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
        if (typeof originalStyles.textAlignVertical === 'string') node.textAlignVertical = originalStyles.textAlignVertical as "TOP" | "CENTER" | "BOTTOM";
        if (originalStyles.fills !== figma.mixed) node.fills = originalStyles.fills as Paint[];
    }
};

const fetchTranslations = async (texts: string[], target: string): Promise<string[] | undefined> => {
    if (texts.length === 0) {
        showErrorMessage("翻译文本不能为空");
        return undefined;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/translate`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "X-RapidAPI-Key": API_KEY,
                "X-RapidAPI-Host": API_HOST,
            },
            body: JSON.stringify({
                texts: texts,
                target_lang: target
            }),
        });

        if (response.ok) {
            const result = await response.json();
            if (result.translations && result.translations.length > 0) {
                return result.translations.map((t: any) => t.text);
            }
        }
        throw new Error("翻译失败");
    } catch (error) {
        showErrorMessage(`API 请求出现问题。\n(${error})`);
        return undefined;
    }
};

const loadFonts = async (node: TextNode) => {
    const fontName = node.fontName;
    if (fontName === figma.mixed) {
        // 处理混合字体情况
        const uniqueFonts = new Set<string>();
        for (let i = 0; i < node.characters.length; i++) {
            const font = node.getRangeFontName(i, i + 1);
            if (font !== figma.mixed) {
                uniqueFonts.add(JSON.stringify(font));
            }
        }
        for (const fontString of uniqueFonts) {
            const font = JSON.parse(fontString) as FontName;
            if (isFontName(font)) {
                await figma.loadFontAsync(font);
            }
        }
    } else {
        // 处理单一字体情况
        await figma.loadFontAsync(fontName);
    }
};

// 类型守卫函数
function isFontName(obj: any): obj is FontName {
    return typeof obj === 'object' && obj !== null &&
           typeof obj.family === 'string' && typeof obj.style === 'string';
}



const appendSuggestText = async (textLayer: TextNode, translatedText: string, target: string) => {
    const frame = figma.createFrame();
    const translatedSuggestText = figma.createText();

    frame.name = `${target}_${textLayer.name}(${textLayer.characters})`;
    frame.layoutMode = "VERTICAL";
    frame.counterAxisSizingMode = "AUTO";
    frame.opacity = 0.8;
    frame.verticalPadding = 10;
    frame.horizontalPadding = 10;
    frame.strokes = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];

    // 加载字体
    await loadFonts(textLayer);

    if (textLayer.fontName !== figma.mixed) {
        translatedSuggestText.fontName = textLayer.fontName;
    } else {
        // 如果是混合字体，我们可以选择使用默认字体或者文本的第一个字体
        // 这里我们选择使用默认字体
        translatedSuggestText.fontName = { family: "Inter", style: "Regular" };
    }

    translatedSuggestText.characters = translatedText;

    frame.appendChild(translatedSuggestText);

    if (frame.width > 500) {
        frame.counterAxisSizingMode = "FIXED";
        frame.resizeWithoutConstraints(500, frame.height);
        translatedSuggestText.resizeWithoutConstraints(frame.width - 20, translatedSuggestText.height);
    }

    frame.x = textLayer.absoluteTransform[0][2] - frame.width - 100;
    frame.y = textLayer.absoluteTransform[1][2];
};

init();