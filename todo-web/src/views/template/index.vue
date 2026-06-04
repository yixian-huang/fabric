<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="bg-white rounded-lg shadow p-6">
      <h1 class="text-xl font-semibold text-gray-800 mb-6">模板管理</h1>
      
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input
              type="text"
              placeholder="搜索模板..."
              v-model="searchQuery"
              class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <el-icon class="absolute left-3 top-2.5 text-gray-400">
              <Search />
            </el-icon>
          </div>
        </div>
        <el-button type="primary" @click="showAddDialog = true" class="!rounded-button whitespace-nowrap">
          <el-icon class="mr-1"><Plus /></el-icon>新建模板
        </el-button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="template in templates" :key="template.id" class="border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
          <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-start">
              <h3 class="text-lg font-medium text-gray-800">{{ template.name }}</h3>
              <div class="flex space-x-2">
                <button @click="editTemplate(template)" class="text-blue-600 hover:text-blue-900">
                  <el-icon><Edit /></el-icon>
                </button>
                <button @click="deleteTemplate(template.id)" class="text-red-600 hover:text-red-900">
                  <el-icon><Delete /></el-icon>
                </button>
              </div>
            </div>
            <p class="text-sm text-gray-500 mt-1">{{ template.description }}</p>
          </div>
          <div class="p-4">
            <h4 class="text-sm font-medium text-gray-700 mb-2">模板内容</h4>
            <div class="space-y-2">
              <div v-for="(field, index) in template.fields" :key="index" class="flex items-center text-sm">
                <span class="text-gray-700 font-medium mr-2">{{ field.name }}:</span>
                <span class="text-gray-600">{{ field.type }}</span>
              </div>
            </div>
          </div>
          <div class="p-4 bg-gray-50 border-t border-gray-200">
            <div class="flex justify-between items-center">
              <span class="text-xs text-gray-500">创建于: {{ formatDate(template.createdAt) }}</span>
              <el-button size="small" @click="useTemplate(template)" class="!rounded-button whitespace-nowrap">
                使用模板
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 新建/编辑模板对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingTemplate ? '编辑模板' : '新建模板'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="newTemplate" label-position="top">
        <el-form-item label="模板名称">
          <el-input v-model="newTemplate.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板描述">
          <el-input
            v-model="newTemplate.description"
            type="textarea"
            rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-medium text-gray-700">字段设置</h3>
            <el-button 
              size="small" 
              @click="addField" 
              class="!rounded-button whitespace-nowrap"
            >
              <el-icon class="mr-1"><Plus /></el-icon>添加字段
            </el-button>
          </div>
          
          <div v-for="(field, index) in newTemplate.fields" :key="index" class="bg-gray-50 p-3 rounded-lg mb-3">
            <div class="flex justify-between items-center mb-2">
              <h4 class="text-sm font-medium">字段 {{ index + 1 }}</h4>
              <el-button 
                size="small" 
                type="danger" 
                @click="removeField(index)" 
                class="!rounded-button whitespace-nowrap"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <el-form-item label="字段名称">
                <el-input v-model="field.name" placeholder="请输入字段名称" />
              </el-form-item>
              <el-form-item label="字段类型">
                <el-select v-model="field.type" placeholder="请选择字段类型" class="w-full">
                  <el-option label="文本" value="text" />
                  <el-option label="数字" value="number" />
                  <el-option label="日期" value="date" />
                  <el-option label="选择" value="select" />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item v-if="field.type === 'select'" label="选项值">
              <div v-for="(option, optionIndex) in field.options" :key="optionIndex" class="flex mb-2">
                <el-input v-model="field.options[optionIndex]" placeholder="选项值" class="mr-2" />
                <el-button
                  @click="field.options.splice(optionIndex, 1)"
                  type="danger"
                  icon="Delete"
                  circle
                  class="!rounded-button whitespace-nowrap"
                />
              </div>
              <el-button @click="field.options.push('')" class="!rounded-button whitespace-nowrap">
                <el-icon class="mr-1"><Plus /></el-icon>添加选项
              </el-button>
            </el-form-item>
          </div>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="saveTemplate" class="!rounded-button whitespace-nowrap">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue';

// 模板数据
const templates = ref([
  {
    id: 1,
    name: '项目任务模板',
    description: '适用于常规项目管理的任务模板',
    createdAt: '2025-04-01',
    fields: [
      { name: '优先级', type: 'select', options: ['低', '中', '高'] },
      { name: '难度', type: 'select', options: ['简单', '中等', '复杂'] },
      { name: '预计工时', type: 'number' }
    ]
  },
  {
    id: 2,
    name: '市场活动模板',
    description: '适用于市场营销活动的任务模板',
    createdAt: '2025-03-15',
    fields: [
      { name: '负责部门', type: 'select', options: ['市场', '销售', '客服'] },
      { name: '预算', type: 'number' },
      { name: '预计效果', type: 'text' }
    ]
  },
  {
    id: 3,
    name: '产品发布模板',
    description: '适用于产品发布流程的任务模板',
    createdAt: '2025-02-20',
    fields: [
      { name: '版本号', type: 'text' },
      { name: '负责团队', type: 'select', options: ['研发', '设计', '测试', '运营'] },
      { name: '发布时间', type: 'date' }
    ]
  }
]);

// 状态
const searchQuery = ref('');
const showAddDialog = ref(false);
const editingTemplate = ref(null);
const newTemplate = ref({
  name: '',
  description: '',
  fields: []
});

// 方法
const formatDate = (dateString) => {
  if (!dateString) return '未设置';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const editTemplate = (template) => {
  editingTemplate.value = template;
  newTemplate.value = {
    name: template.name,
    description: template.description,
    fields: JSON.parse(JSON.stringify(template.fields))
  };
  showAddDialog.value = true;
};

const deleteTemplate = (id) => {
  if (confirm('确定要删除这个模板吗？')) {
    const index = templates.value.findIndex(t => t.id === id);
    if (index !== -1) {
      templates.value.splice(index, 1);
      ElMessage.success('模板删除成功');
    }
  }
};

const useTemplate = (template) => {
  ElMessage.success(`您选择了"${template.name}"模板，可以基于此模板创建项目`);
  // 这里可以添加导航到项目创建页面，并带上模板信息的逻辑
};

const addField = () => {
  newTemplate.value.fields.push({
    name: '',
    type: 'text',
    options: []
  });
};

const removeField = (index) => {
  newTemplate.value.fields.splice(index, 1);
};

const saveTemplate = () => {
  if (!newTemplate.value.name) {
    ElMessage.warning('请输入模板名称');
    return;
  }
  
  if (newTemplate.value.fields.length === 0) {
    ElMessage.warning('请至少添加一个字段');
    return;
  }
  
  for (const field of newTemplate.value.fields) {
    if (!field.name) {
      ElMessage.warning('请填写所有字段的名称');
      return;
    }
    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      ElMessage.warning(`请为${field.name}字段添加选项值`);
      return;
    }
  }
  
  if (editingTemplate.value) {
    // 更新模板
    const index = templates.value.findIndex(t => t.id === editingTemplate.value.id);
    if (index !== -1) {
      templates.value[index] = {
        ...editingTemplate.value,
        name: newTemplate.value.name,
        description: newTemplate.value.description,
        fields: newTemplate.value.fields
      };
    }
    ElMessage.success('模板更新成功');
  } else {
    // 创建新模板
    const templateId = templates.value.length > 0 
      ? Math.max(...templates.value.map(t => t.id)) + 1 
      : 1;
    
    const template = {
      id: templateId,
      name: newTemplate.value.name,
      description: newTemplate.value.description,
      createdAt: formatDate(new Date()),
      fields: newTemplate.value.fields
    };
    
    templates.value.push(template);
    ElMessage.success('模板创建成功');
  }
  
  showAddDialog.value = false;
  editingTemplate.value = null;
  
  // 重置表单
  newTemplate.value = {
    name: '',
    description: '',
    fields: []
  };
};
</script>