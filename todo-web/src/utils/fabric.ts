import { useI18n } from 'vue-i18n';

/**
 * 格式化面料选项的国际化显示
 * @param optionCode 选项代码
 * @param optionName 选项名称（可选）
 * @returns 格式化后的国际化文本
 */
export function formatI18nOptionName(optionCode: string, optionName?: string): string {
  const { t } = useI18n();
  const optionNameKey = `fabric.${optionCode}`;
  
  // 使用t函数尝试翻译，同时提供兜底
  const translated = t(optionNameKey);
  
  // 如果翻译结果与键名相同，说明没有找到翻译
  if (translated === optionNameKey && optionName) {
    return optionName;
  }
  
  return translated || optionName || optionCode;
}

/**
 * 格式化面料成分数据
 * @param composition 成分数组
 * @returns 格式化后的成分字符串
 */
export function formatComposition(
  composition: { name: string; percentage: number; option_code?: string }[] | undefined
): string {
  if (!composition) {
    return "";
  }
  
  return composition
    .map((comp) => {
      let text = `${comp.percentage}% `;
      if (comp.option_code) {
        text += formatI18nOptionName(comp.option_code, comp.name);
      } else {
        text += comp.name;
      }
      return text;
    })
    .join(" ");
} 