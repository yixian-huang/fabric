<template>
  <el-dialog
    v-model="visible"
    :title="t('fabric.inquiryTitle')"
    width="480px"
    destroy-on-close
    @closed="resetForm"
  >
    <p v-if="referenceCode" class="inquiry-ref">
      {{ t('fabric.referenceNo') }}: <strong>{{ referenceCode }}</strong>
    </p>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-form-item :label="t('fabric.inquiryEmail')" prop="email">
        <el-input
          v-model="form.email"
          type="email"
          :placeholder="t('fabric.inquiryEmailPlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="t('fabric.inquiryMessage')" prop="message">
        <el-input
          v-model="form.message"
          type="textarea"
          :rows="4"
          maxlength="5000"
          show-word-limit
          :placeholder="t('fabric.inquiryMessagePlaceholder')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ t('fabric.inquirySubmit') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { submitFabricInquiry } from '@/api/fabric';

const props = defineProps<{
  modelValue: boolean;
  referenceCode: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  success: [];
}>();

const { t } = useI18n();
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  email: '',
  message: '',
});

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const rules = computed<FormRules>(() => ({
  email: [
    { required: true, message: t('fabric.inquiryEmailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' },
  ],
  message: [
    { required: true, message: t('fabric.inquiryMessageRequired'), trigger: 'blur' },
    { min: 3, message: t('fabric.inquiryMessageRequired'), trigger: 'blur' },
  ],
}));

const resetForm = () => {
  form.email = '';
  form.message = '';
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const res = await submitFabricInquiry({
      reference_code: props.referenceCode,
      email: form.email.trim(),
      message: form.message.trim(),
    });
    if (res.code === 200) {
      ElMessage.success(t('fabric.inquirySuccess'));
      visible.value = false;
      emit('success');
    } else {
      ElMessage.error(res.message || t('fabric.inquiryFailed'));
    }
  } catch {
    ElMessage.error(t('fabric.inquiryFailed'));
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.inquiry-ref {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--fabric-muted);
}

.inquiry-ref strong {
  color: var(--fabric-ink);
  font-family: var(--font-display);
}
</style>
