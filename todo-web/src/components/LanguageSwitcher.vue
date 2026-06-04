<template>
  <div class="language-switcher">
    <el-dropdown trigger="click" @command="handleLanguageChange">
      <span class="language-button">
        <el-icon class="mr-1"><ChatLineRound /></el-icon>
        {{ currentLanguageLabel }}
        <el-icon class="ml-1"><ArrowDown /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="en" :disabled="currentLanguage === 'en'">English</el-dropdown-item>
          <el-dropdown-item command="zh" :disabled="currentLanguage === 'zh'">中文</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { ChatLineRound, ArrowDown } from '@element-plus/icons-vue';
import { setLanguage } from '@/i18n';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const currentLanguage = computed(() => locale.value);
const currentLanguageLabel = computed(() => {
  return currentLanguage.value === 'zh' ? '中文' : 'English';
});

const handleLanguageChange = (lang: string) => {
  if (lang !== currentLanguage.value) {
    setLanguage(lang);
  }
};
</script>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
}

.language-button {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.language-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style> 