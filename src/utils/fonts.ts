export const loadFonts = async (node: TextNode) => {
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