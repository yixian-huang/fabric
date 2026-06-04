
import i18n from '@/i18n';

export const formatI18nOptionName = (optionNameMap: any, optionCode: string) => {
    const optionName = optionNameMap[optionCode];
    const optionNameKey = `fabric.${optionCode}`;
    
    // 检查翻译键是否存在于当前语言包中
    const hasTranslation = i18n.global.locale.value && 
      i18n.global.messages[i18n.global.locale.value] && 
      optionNameKey.split('.').reduce((obj: any, key: string) => obj && obj[key], i18n.global.messages[i18n.global.locale]);
    
    // 如果翻译不存在，直接返回optionName
    if (!hasTranslation && optionName) {
      return optionName;
    }
    // 使用t函数尝试翻译，同时提供兜底
    return i18n.global.t(optionNameKey, { [optionNameKey]: optionName }) || optionName || optionCode;
  };

