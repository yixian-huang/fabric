<!-- The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work. -->
<template>
  <div class="min-h-screen bg-gray-50 py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h1 class="text-2xl font-bold text-gray-800 mb-8">{{ pageTitle }}</h1>
        <el-form
          ref="formRef"
          :model="fabricData"
          :rules="rules"
          label-position="top"
          @submit.prevent="submitForm"
        >
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <!-- 左侧图片上传区域 -->
            <div class="lg:col-span-1">
              <div
                class="border-2 border-dashed border-gray-300 rounded-lg p-4 h-80 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                @click="handleImageClick"
                @dragover.prevent
                @drop.prevent="handleImageDrop"
              >
                <div v-if="!imagePreview" class="text-center">
                  <el-icon class="text-gray-400 text-4xl mb-4"
                    ><Upload
                  /></el-icon>
                  <p class="text-gray-500 mb-2">{{ $t('fabric.uploadImage') }}</p>
                  <p class="text-gray-400 text-xs">
                    {{ $t('fabric.uploadImageHint') }}
                  </p>
                </div>
                <img
                  v-else
                  :src="imagePreview"
                  :alt="$t('fabric.photo')"
                  class="max-h-full max-w-full object-contain"
                />
                <input
                  type="file"
                  ref="fileInput"
                  class="hidden"
                  accept="image/*"
                  @change="handleImageChange"
                />
              </div>
            </div>
            <!-- 右侧基础信息区域 -->
            <div class="lg:col-span-2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- 第一行 -->
                <div>
                  <el-form-item
                    :label="$t('fabric.fabricCode')"
                    prop="code"
                    :rules="[
                      { required: true, message: $t('fabric.fabricCodeRequired'), trigger: 'blur' },
                      { validator: validateFabricCode, trigger: 'blur' }
                    ]"
                  >
                    <el-input
                      v-model="fabricData.code"
                      :placeholder="$t('fabric.fabricCode')"
                      class="w-full !rounded-button"
                    />
                  </el-form-item>
                </div>
                <div>
                  <el-form-item :label="$t('fabric.merchantCode')" prop="merchant_code">
                    <el-input
                      v-model="fabricData.merchant_code"
                      :placeholder="$t('fabric.merchantCode')"
                      class="w-full !rounded-button"
                    />
                  </el-form-item>
                </div>
                <!-- 第二行 -->
                <div>
                  <el-form-item :label="$t('fabric.referenceCode')" prop="reference_code">
                    <el-input
                      v-model="fabricData.reference_code"
                      :placeholder="$t('fabric.autoGenerate')"
                      disabled
                      class="w-full !rounded-button bg-gray-50"
                    />
                  </el-form-item>
                </div>
                <div>
                  <el-form-item :label="$t('fabric.width')" prop="width">
                    <div class="flex items-center">
                      <el-input
                        v-model="fabricData.width"
                        :placeholder="$t('fabric.width')"
                        class="w-full !rounded-button"
                      />
                      <span class="ml-2 text-gray-600 whitespace-nowrap">{{ $t('fabric.inch') }}</span>
                    </div>
                  </el-form-item>
                </div>
                <!-- 第三行 -->
                <div>
                  <el-form-item :label="$t('fabric.yarnCount')" prop="yarn_count">
                    <el-input
                      v-model="fabricData.yarn_count"
                      :placeholder="$t('fabric.yarnCount')"
                      class="w-full !rounded-button"
                    />
                  </el-form-item>
                </div>
                <div>
                  <el-form-item :label="$t('fabric.density')" prop="density">
                    <el-input
                      v-model="fabricData.density"
                      :placeholder="$t('fabric.density')"
                      class="w-full !rounded-button"
                    />
                  </el-form-item>
                </div>
                <!-- 第四行 -->
                <div>
                  <el-form-item
                    :label="$t('fabric.weight')"
                    prop="weight"
                    :rules="[{ required: true, message: $t('fabric.weightRequired'), trigger: 'blur' }]"
                  >
                    <div class="flex items-center">
                      <el-input-number
                        v-model="fabricData.weight"
                        class="w-full !rounded-button"
                        :placeholder="$t('fabric.weight')"
                        :min="1"
                      />
                      <el-select
                        v-model="fabricData.weight_unit"
                        placeholder="单位"
                        class="ml-2 w-24 !rounded-button"
                      >
                        <el-option label="g/m2" value="g/m2" />
                        <el-option label="gsm" value="gsm" />
                        <el-option label="mm" value="mm" />
                      </el-select>
                    </div>
                  </el-form-item>
                </div>
                <div>
                  <el-form-item
                    :label="$t('fabric.fabricTypeField')"
                    prop="fabric_type"
                    :rules="[{ required: true, message: $t('fabric.fabricTypeRequired'), trigger: 'change' }]"
                  >
                    <div class="flex space-x-6 mt-2">
                      <el-radio-group
                        v-model="fabricData.fabric_type"
                        class="flex space-x-6"
                      >
                        <el-radio
                          :value="1"
                          class="!rounded-button whitespace-nowrap"
                          >{{ $t('fabric.knitted') }}</el-radio
                        >
                        <el-radio
                          :value="2"
                          class="!rounded-button whitespace-nowrap"
                          >{{ $t('fabric.woven') }}</el-radio
                        >
                        <el-radio
                          :value="3"
                          class="!rounded-button whitespace-nowrap"
                          >{{ $t('fabric.lace') }}</el-radio
                        >
                        <el-radio
                          :value="4"
                          class="!rounded-button whitespace-nowrap"
                          >{{ $t('fabric.velvet') }}</el-radio
                        >
                      </el-radio-group>
                    </div>
                  </el-form-item>
                </div>
              </div>
            </div>
          </div>
          <!-- 面料成分区域 -->
          <div class="mb-8">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-medium text-gray-800">
                {{ $t('fabric.fabricComponentField') }} <span class="text-red-500">*</span>
              </h2>
              <div class="flex items-center">
                <span
                  class="text-sm mr-4"
                  :class="totalPercentage === 100 ? 'text-green-600' : 'text-red-500'"
                >
                  {{ $t('fabric.totalPercentage') }}: {{ totalPercentage }}%
                </span>
                <el-button
                  type="primary"
                  @click="addComponent"
                  class="!rounded-button whitespace-nowrap"
                  :disabled="components.length >= 5"
                  size="small"
                >
                  {{ $t('fabric.addComponent') }}
                </el-button>
              </div>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div
                v-for="(component, index) in components"
                :key="index"
                class="grid grid-cols-12 gap-4 mb-3"
              >
                <div class="col-span-5">
                  <el-form-item
                    :prop="'components.' + index + '.option_code'"
                  >
                    <el-select
                      v-model="component.option_code"
                      :placeholder="$t('fabric.selectFabricComponent')"
                      class="w-full !rounded-button"
                      @change="handleComponentCodeChange(index, $event)"
                    >
                      <el-option
                        v-for="item in componentOptionsWithCode"
                        :key="item.option_code"
                        :label="formatI18nOptionName(item.option_code)"
                        :value="item.option_code"
                      />
                    </el-select>
                  </el-form-item>
                </div>
                <div class="col-span-5">
                  <el-form-item
                    :prop="'components.' + index + '.percentage'"
                  >
                    <div class="flex items-center">
                      <el-input-number
                        v-model="component.percentage"
                        :min="1"
                        :max="100"
                        controls-position="right"
                        @change="validateTotalPercentage"
                        class="w-full !rounded-button"
                      />
                      <span class="ml-2 text-gray-600">%</span>
                    </div>
                  </el-form-item>
                </div>
                <div class="col-span-2 flex items-center">
                  <el-button
                    type="danger"
                    @click="removeComponent(index)"
                    class="!rounded-button whitespace-nowrap"
                    size="small"
                    :disabled="components.length <= 1"
                  >
                    {{ $t('fabric.deleteBtn') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <!-- 工艺信息区域 -->
          <div class="mb-8">
            <h2 class="text-lg font-medium text-gray-800 mb-4">{{ $t('fabric.craftInfo') }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <el-form-item :label="$t('fabric.surfaceStyle')" prop="style_codes">
                  <div class="flex flex-wrap gap-4">
                    <el-checkbox-group v-model="fabricData.style_codes">
                      <el-checkbox
                        v-for="(option, index) in fabricStyleOptions"
                        :key="index"
                        :label="formatI18nOptionName(option.option_code)"
                        :value="option.option_code"
                      />
                    </el-checkbox-group>
                  </div>
                </el-form-item>
              </div>
              <div>
                <el-form-item :label="$t('fabric.processOptions')" prop="process_codes">
                  <div class="flex flex-wrap gap-4">
                    <el-checkbox-group v-model="fabricData.process_codes">
                      <el-checkbox
                        v-for="(option, index) in craftOptions"
                        :key="index"
                        :label="formatI18nOptionName(option.option_code)"
                        :value="option.option_code"
                      />
                    </el-checkbox-group>
                  </div>
                </el-form-item>
              </div>
            </div>
          </div>
          <!-- 备注区域 -->
          <div class="mb-8">
            <el-form-item :label="$t('fabric.remarks')" prop="remark">
              <el-input
                v-model="fabricData.remark"
                type="textarea"
                :rows="3"
                :placeholder="$t('fabric.enterRemarks')"
                class="w-full !rounded-button"
              />
            </el-form-item>
          </div>
          <!-- 操作按钮 -->
          <div class="flex justify-end space-x-4">
            <el-button @click="cancel" class="!rounded-button whitespace-nowrap">
              {{ $t('fabric.cancelBtn') }}
            </el-button>
            <el-button
              type="primary"
              @click="submitForm"
              :disabled="!isFormValid"
              class="!rounded-button whitespace-nowrap"
            >
              {{ isEditMode ? $t('fabric.update') : $t('fabric.save') }}
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, toRefs, onUnmounted } from "vue";
import { ElMessage, ElLoading } from "element-plus";
import { Upload } from "@element-plus/icons-vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from 'vue-i18n';
// 引入 API
import { addFabric, uploadFabricImage, getFabricDetail, updateFabric, getOptions, checkFabricCode } from "@/api/fabric";
import { filterOptionsByCategory, OPTION_CATEGORY } from "@/utils/fabric";

const router = useRouter();
const route = useRoute();
const { t, locale, messages } = useI18n();

// 判断是新增还是编辑模式
const isEditMode = ref(false);
const fabricId = ref<string | null>(null);
const pageTitle = computed(() => isEditMode.value ? t("fabric.editTitle") : t("fabric.addTitle"));

// 文件上传相关
const fileInput = ref<HTMLInputElement | null>(null);
const imagePreview = ref<string>("");
const uploadedImageUrl = ref<string>("");
const imageFile = ref<File | null>(null);
const imageFileId = ref<string | null>(null);

const fabricData = reactive({
    code: "",
    merchant_code: "",
    reference_code: "",
    width: "",
    yarn_count: "",
    density: "",
    weight: 1,
    weight_unit: "g/m2",
    fabric_type: 2,
    style_codes: [], // 布面风格选项编码（传递给后端）
    process_codes: [], // 工艺选项编码（传递给后端）
    remark: "",
    image_url: ""
  })

// 成分选项
const componentOptions = ref<any[]>([]);
// 转换为包含option_code的数组
const componentOptionsWithCode = computed(() => {
  return componentOptions.value.map(item => ({
    option_name: item.option_name,
    option_code: item.option_code
  }));
});

// 工艺选项
const craftOptions = ref<any[]>([]);
// 布面风格选项
const fabricStyleOptions = ref<any[]>([]);

// 选项字典 - 用于快速查找编码
const optionCodeMap = ref<{[key: string]: string}>({});
const optionNameMap = ref<{[key: string]: string}>({});

// 面料成分
const components = ref([{ name: "棉", percentage: 100, option_code: "COMP001" }]);

// 添加成分
const addComponent = () => {
  if (components.value.length < 5) {
    components.value.push({ name: "", percentage: 0, option_code: "" });
    validateTotalPercentage();
  }
};

const formatI18nOptionName = (optionCode: string) => {
  const optionName = optionNameMap.value[optionCode];
  const optionNameKey = `fabric.${optionCode}`;
  
  // 检查翻译键是否存在于当前语言包中
  const hasTranslation = locale.value && 
    messages.value[locale.value] && 
    optionNameKey.split('.').reduce((obj, key) => obj && obj[key], messages.value[locale.value]);
  
  // 如果翻译不存在，直接返回optionName
  if (!hasTranslation && optionName) {
    return optionName;
  }
  // 使用t函数尝试翻译，同时提供兜底
  return t(optionNameKey, { [optionNameKey]: optionName }) || optionName || optionCode;
};

// 处理成分选择，自动关联name
const handleComponentCodeChange = (index: number, value: string) => {
  // 根据option_code设置name
  if (value) {
    const componentOption = componentOptionsWithCode.value.find(item => item.option_code === value);
    if (componentOption) {
      components.value[index].name = componentOption.option_name;
    }
  } else {
    components.value[index].name = '';
  }
};

// 移除成分
const removeComponent = (index: number) => {
  if (components.value.length > 1) {
    components.value.splice(index, 1);
    validateTotalPercentage();
  }
};

// 计算总百分比
const totalPercentage = computed(() => {
  return components.value.reduce(
    (sum, item) => sum + (item.percentage || 0),
    0,
  );
});

// 添加表单引用
const formRef = ref();

// 添加表单验证规则
const rules = {
  code: [
    { required: true, message: t('fabric.fabricCodeRequired'), trigger: 'blur' }
  ],
  weight: [
    { required: true, message: t('fabric.weightRequired'), trigger: 'blur' }
  ],
  fabric_type: [
    { required: true, message: t('fabric.fabricTypeRequired'), trigger: 'change' }
  ]
};

// 修改面料编号验证方法
const validateFabricCode = async (rule: any, value: string, callback: any) => {
  if (isEditMode.value) {
    callback();
    return;
  }
  if (!value) {
    callback(new Error(t('fabric.fabricCodeRequired')));
    return;
  }
  
  try {
    const result = await checkFabricCode(value);
    if (result.code === 200 && result.data) {
      callback(new Error(t('fabric.fabricCodeExists')));
    } else {
      callback();
    }
  } catch (error) {
    callback(new Error(t('fabric.unknownError')));
  }
};

// 修改表单提交方法
const submitForm = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    await saveForm();
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

// 图片上传相关方法
const handleImageClick = () => {
  fileInput.value?.click();
};
const handleImageChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (file.size > 50 * 1024 * 1024) { // 50MB
      ElMessage.error(t('fabric.imageSizeLimit'));
      return;
    }
    imageFile.value = file; // 保存文件引用
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        imagePreview.value = e.target.result as string;
        uploadedImageUrl.value = ""; // 清除已上传的 URL，表示需要重新上传
      }
    };
    reader.readAsDataURL(file);
  }
};
const handleImageDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type.startsWith("image/")) {
      imageFile.value = file; // 保存文件引用
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          imagePreview.value = e.target.result as string;
          uploadedImageUrl.value = ""; // 清除已上传的 URL，表示需要重新上传
        }
      };
      reader.readAsDataURL(file);
    }
  }
};

// 处理粘贴图片
const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (!file) continue;

      if (file.size > 50 * 1024 * 1024) { // 50MB
        ElMessage.error(t('fabric.imageSizeLimit'));
        return;
      }

      imageFile.value = file; // 保存文件引用
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          imagePreview.value = e.target.result as string;
          uploadedImageUrl.value = ""; // 清除已上传的 URL，表示需要重新上传
        }
      };
      reader.readAsDataURL(file);
      break;
    }
  }
};

// 修改上传图片到服务器的方法
const uploadImage = async (): Promise<string | null> => {
  if (!imageFile.value) {
    // 没有新文件，不需要上传
    return imageFileId.value; // 返回已有的 file_id (如果编辑时已有)
  }

  const loadingInstance = ElLoading.service({ text: t('fabric.imageUploading'), background: 'rgba(0, 0, 0, 0.7)' });
  try {
    // 调用上传图片 API (现在这个 API 返回 file_id 和 url)
    const response = await uploadFabricImage(imageFile.value);
    loadingInstance.close();
    if (response.code === 200 && response.data && response.data.file_id) {
      imageFileId.value = response.data.file_id; // 保存返回的 file_id
      fabricData.image_url = response.data.url; // 更新预览 URL
      imagePreview.value = response.data.url;       // 更新预览
      uploadedImageUrl.value = response.data.url;   // 用于重置逻辑
      return response.data.file_id; // 返回 file_id
    } else {
      throw new Error(response.message || t('fabric.uploadImageFailed'));
    }
  } catch (error: any) {
    loadingInstance.close();
    ElMessage.error(t('fabric.uploadImageFailed') + ': ' + (error.message || t('fabric.unknownError')));
    return null; // 上传失败返回 null
  }
};

// 修改保存表单的方法
const saveForm = async () => {
  if (!isFormValid.value) {
    ElMessage.warning(t('fabric.pleaseComplete'));
    return;
  }

  const loading = ElLoading.service({
    lock: true,
    text: t('fabric.saving'),
    background: 'rgba(255, 255, 255, 0.7)'
  });

  try {
    // 1. 处理图片上传 (现在返回 file_id)
    let finalImageFileId: string | null = imageFileId.value; // 先用已有的
    if (imageFile.value) { // 如果选择了新文件
        finalImageFileId = await uploadImage();
        if (!finalImageFileId) { // 如果上传失败
             throw new Error(t('fabric.uploadImageFailed'));
        }
    } else if (isEditMode.value && !fabricData.image_url) {
        // 编辑模式下，如果删除了图片（没有预览URL了），需要告知后端解绑
        finalImageFileId = null; // 传递 null
    }


    // 2. 准备面料数据，包含 image_file_id
    const fabricFormData: any = { // 使用 any 或更具体的类型
      code: fabricData.code,
      merchant_code: fabricData.merchant_code,
      width: fabricData.width,
      yarn_count: fabricData.yarn_count,
      density: fabricData.density,
      weight: fabricData.weight,
      weight_unit: fabricData.weight_unit,
      fabric_type: fabricData.fabric_type,
      style_codes: fabricData.style_codes, // 发送选项编码数组
      process_codes: fabricData.process_codes, // 发送选项编码数组
      remark: fabricData.remark,
      components: components.value.map(item => ({
        name: item.name,
        percentage: item.percentage,
        option_code: item.option_code
      })),
      image_file_id: finalImageFileId // 发送图片 file_id 或 null
    };

    // 移除后端自动生成的字段
    // delete fabricFormData.reference_code; // 后端自动生成

    let result;
    if (isEditMode.value && fabricId.value) {
      result = await updateFabric(fabricId.value, fabricFormData);
    } else {
      result = await addFabric(fabricFormData);
    }

    loading.close();

    if (result.code === 200) {
      ElMessage.success(isEditMode.value ? t('fabric.updateSuccess') : t('fabric.saveSuccess'));
      router.push("/fabric");
    } else {
      // 处理后端返回的校验错误
      if (result.errors) {
          let errorMsg = isEditMode.value ? (t('fabric.updateFailed') + ': ') : (t('fabric.saveFailed') + ': ');
          // 将 errors 对象转换为可读字符串
          errorMsg += Object.entries(result.errors).map(function(entry) {
            const key = entry[0];
            const value = entry[1];
            return key + ': ' + (Array.isArray(value) ? value.join(', ') : value);
          }).join('; ');
           ElMessage.error(errorMsg);
      } else {
           throw new Error(result.message || (isEditMode.value ? t('fabric.updateFailed') : t('fabric.saveFailed')));
      }
    }
  } catch (error: any) {
    loading.close();
    ElMessage.error((isEditMode.value ? t('fabric.updateFailed') : t('fabric.saveFailed')) + ': ' + (error.message || t('fabric.unknownError')));
    console.error((isEditMode.value ? t('fabric.updateFailed') : t('fabric.saveFailed')) + ':', error);
  }
};

// 取消
const cancel = () => {
  router.back();
};

// 获取面料详情（编辑模式）
const fetchFabricDetails = async (id: string) => {
  const loadingInstance = ElLoading.service({ text: t('fabric.loading'), background: 'rgba(0, 0, 0, 0.7)' });
  try {
    const result = await getFabricDetail(id);
    loadingInstance.close();
    if (result.code === 200 && result.data) {
      const fetchedData = result.data;
      // 使用Object.assign保持响应式引用，同时更新所有属性
      Object.assign(fabricData, fetchedData);
      
      // 转换components数据，确保每个component都有option_code
      if (fetchedData.components && fetchedData.components.length) {
        components.value = fetchedData.components.map((comp: any) => ({
          name: comp.name || "",
          percentage: comp.percentage || 0,
          option_code: comp.option_code || ""
        }));
      } else {
        components.value = [{ name: t('fabric.cotton'), percentage: 100, option_code: "COMP001" }];
      }
      
      imagePreview.value = fetchedData.image_url || "";
      uploadedImageUrl.value = fetchedData.image_url || ""; // 用于重置
      // 如果有图片，需要保存其file_id以便后续操作
      imageFileId.value = fetchedData.image_file_id || null;
    } else {
      ElMessage.error(result.message || t('fabric.loadingFailed'));
      router.push('/fabric'); // 获取失败则返回列表页
    }
  } catch (error: any) {
    loadingInstance.close();
    ElMessage.error(t('fabric.loadingFailed') + ': ' + (error.message || t('fabric.unknownError')));
    console.error(t('fabric.loadingFailed')+":", error);
    router.push('/fabric'); // 出错也返回列表页
  }
};

// 获取选项字典
const fetchOptions = async () => {
  try {
    const response = await getOptions();
    if (response.code === 200 && Array.isArray(response.data)) {
      const options = response.data;
      componentOptions.value = filterOptionsByCategory(
        options,
        OPTION_CATEGORY.component,
      );
      craftOptions.value = filterOptionsByCategory(
        options,
        OPTION_CATEGORY.process,
      );
      fabricStyleOptions.value = filterOptionsByCategory(
        options,
        OPTION_CATEGORY.style,
      );

      options.forEach((item: any) => {
        optionCodeMap.value[item.option_name] = item.option_code;
        optionNameMap.value[item.option_code] = item.option_name;
      });
      
      // 如果已有组件，尝试设置其option_code（如果还没有）
      components.value.forEach((comp, index) => {
        if (comp.name && !comp.option_code) {
          components.value[index].option_code = optionCodeMap.value[comp.name] || "";
        } else if (comp.option_code && !comp.name) {
          components.value[index].name = optionNameMap.value[comp.option_code] || "";
        }
      });
    }
  } catch (error) {
    console.error("获取选项字典失败", error);
  }
};

// 表单验证
const isFormValid = computed(() => {
  return (
    !!fabricData.code &&
    !!fabricData.weight &&
    totalPercentage.value === 100
  );
});

// 验证总百分比
const validateTotalPercentage = () => {
  if (totalPercentage.value !== 100) {
    // 可以在这里添加提示，但不阻止用户操作
  }
};

// 初始化
onMounted(() => {
  // 获取选项字典
  fetchOptions();
  
  // 添加粘贴事件监听器
  document.addEventListener('paste', handlePaste);
  
  const idFromRoute = route.params.id as string | undefined;
  if (idFromRoute) {
    isEditMode.value = true;
    fabricId.value = idFromRoute;
    fetchFabricDetails(idFromRoute); // 获取面料详情
  } else {
    isEditMode.value = false;
    // 新增模式下不需要额外操作，因为 fabricData 已经初始化
  }
});

// 组件卸载时移除事件监听器
onUnmounted(() => {
  document.removeEventListener('paste', handlePaste);
});
</script>

<style scoped>
:deep(.el-input-number .el-input__inner) {
  text-align: left;
}
:deep(.el-input-number .el-input-number__decrease),
:deep(.el-input-number .el-input-number__increase) {
  border: none;
  background-color: transparent;
}
:deep(input[type="number"]::-webkit-inner-spin-button),
:deep(input[type="number"]::-webkit-outer-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
:deep(input[type="number"]) {
  -moz-appearance: textfield;
}
</style>
