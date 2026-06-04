<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="bg-white rounded-lg shadow p-6">
      <h1 class="text-xl font-semibold text-gray-800 mb-6">供应商管理</h1>
      
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input
              type="text"
              placeholder="搜索供应商..."
              v-model="searchQuery"
              class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <el-icon class="absolute left-3 top-2.5 text-gray-400">
              <Search />
            </el-icon>
          </div>
          <el-select v-model="filterCategory" placeholder="类别筛选" clearable class="w-36">
            <el-option
              v-for="category in categories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </div>
        <el-button type="primary" @click="showAddDialog = true" class="!rounded-button whitespace-nowrap">
          <el-icon class="mr-1"><Plus /></el-icon>添加供应商
        </el-button>
      </div>
      
      <el-table :data="filteredSuppliers" stripe style="width: 100%" v-loading="loading">
        <el-table-column label="供应商名称" min-width="180">
          <template #default="scope">
            <div class="flex items-center">
              <el-avatar 
                :size="40" 
                :src="scope.row.logo" 
                class="mr-3"
              >{{ scope.row.name.charAt(0) }}</el-avatar>
              <div>
                <div class="font-medium text-gray-900">{{ scope.row.name }}</div>
                <div class="text-xs text-gray-500">{{ scope.row.code }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类别" prop="category" />
        <el-table-column label="联系人" min-width="150">
          <template #default="scope">
            <div>{{ scope.row.contact.name }}</div>
            <div class="text-xs text-gray-500">{{ scope.row.contact.phone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="合作状态">
          <template #default="scope">
            <el-tag 
              :type="getStatusType(scope.row.status)" 
              size="small"
            >
              {{ getStatusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" />
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <div class="flex space-x-2">
              <el-button 
                size="small" 
                @click="viewSupplier(scope.row)"
                text
                type="primary"
              >
                <el-icon><View /></el-icon>
              </el-button>
              <el-button 
                size="small" 
                @click="editSupplier(scope.row)"
                text
                type="primary"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button 
                size="small" 
                @click="deleteSupplier(scope.row.id)"
                text
                type="danger"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-500">
          共 {{ filteredSuppliers.length }} 个供应商
        </div>
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="filteredSuppliers.length"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
    
    <!-- 查看供应商对话框 -->
    <el-dialog
      v-model="showViewDialog"
      title="供应商详情"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="currentSupplier" class="p-4">
        <div class="flex items-center mb-6">
          <el-avatar 
            :size="60" 
            :src="currentSupplier.logo" 
            class="mr-4"
          >{{ currentSupplier.name.charAt(0) }}</el-avatar>
          <div>
            <h2 class="text-xl font-bold text-gray-800">{{ currentSupplier.name }}</h2>
            <p class="text-sm text-gray-500">{{ currentSupplier.code }}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">基本信息</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="mb-3">
                <div class="text-xs text-gray-500">类别</div>
                <div>{{ currentSupplier.category }}</div>
              </div>
              <div class="mb-3">
                <div class="text-xs text-gray-500">创建时间</div>
                <div>{{ currentSupplier.createdAt }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500">合作状态</div>
                <el-tag :type="getStatusType(currentSupplier.status)" size="small">
                  {{ getStatusLabel(currentSupplier.status) }}
                </el-tag>
              </div>
            </div>
          </div>
          
          <div>
            <h3 class="text-sm font-medium text-gray-500 mb-2">联系信息</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="mb-3">
                <div class="text-xs text-gray-500">联系人</div>
                <div>{{ currentSupplier.contact.name }}</div>
              </div>
              <div class="mb-3">
                <div class="text-xs text-gray-500">电话</div>
                <div>{{ currentSupplier.contact.phone }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500">电子邮箱</div>
                <div>{{ currentSupplier.contact.email }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 mb-2">公司地址</h3>
          <div class="bg-gray-50 p-4 rounded-lg">
            {{ currentSupplier.address }}
          </div>
        </div>
        
        <div>
          <h3 class="text-sm font-medium text-gray-500 mb-2">备注</h3>
          <div class="bg-gray-50 p-4 rounded-lg">
            {{ currentSupplier.notes || '暂无备注' }}
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showViewDialog = false" class="!rounded-button whitespace-nowrap">关闭</el-button>
          <el-button type="primary" @click="editSupplier(currentSupplier)" class="!rounded-button whitespace-nowrap">编辑</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 添加/编辑供应商对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑供应商' : '添加供应商'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="supplierForm" label-position="top" :rules="rules" ref="supplierFormRef">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <el-form-item label="供应商名称" prop="name">
            <el-input v-model="supplierForm.name" placeholder="请输入供应商名称" />
          </el-form-item>
          <el-form-item label="供应商编码" prop="code">
            <el-input v-model="supplierForm.code" placeholder="请输入供应商编码" />
          </el-form-item>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <el-form-item label="类别" prop="category">
            <el-select v-model="supplierForm.category" placeholder="请选择类别" class="w-full">
              <el-option
                v-for="category in categories"
                :key="category"
                :label="category"
                :value="category"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="合作状态" prop="status">
            <el-select v-model="supplierForm.status" placeholder="请选择状态" class="w-full">
              <el-option label="潜在" value="potential" />
              <el-option label="活跃" value="active" />
              <el-option label="暂停" value="inactive" />
              <el-option label="终止" value="terminated" />
            </el-select>
          </el-form-item>
        </div>
        
        <el-form-item label="公司地址" prop="address">
          <el-input v-model="supplierForm.address" placeholder="请输入公司地址" />
        </el-form-item>
        
        <h3 class="text-sm font-medium text-gray-700 mt-4 mb-2">联系人信息</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <el-form-item label="联系人姓名" prop="contact.name">
            <el-input v-model="supplierForm.contact.name" placeholder="请输入联系人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="contact.phone">
            <el-input v-model="supplierForm.contact.phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="电子邮箱" prop="contact.email">
            <el-input v-model="supplierForm.contact.email" placeholder="请输入电子邮箱" />
          </el-form-item>
        </div>
        
        <el-form-item label="备注">
          <el-input
            v-model="supplierForm.notes"
            type="textarea"
            rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="saveSupplier" class="!rounded-button whitespace-nowrap">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, Search, View } from '@element-plus/icons-vue';

// 供应商数据
const suppliers = ref([
  {
    id: 1,
    name: '上海科技有限公司',
    code: 'SUP20250101',
    category: '硬件设备',
    status: 'active',
    contact: {
      name: '张三',
      phone: '13800138001',
      email: 'zhangsan@example.com'
    },
    address: '上海市浦东新区张江高科技园区科苑路88号',
    createdAt: '2025-01-01',
    logo: '',
    notes: '主要提供服务器、网络设备等硬件产品'
  },
  {
    id: 2,
    name: '北京软件科技有限公司',
    code: 'SUP20250102',
    category: '软件服务',
    status: 'active',
    contact: {
      name: '李四',
      phone: '13900139001',
      email: 'lisi@example.com'
    },
    address: '北京市海淀区中关村软件园23号',
    createdAt: '2025-01-05',
    logo: '',
    notes: '提供企业级软件开发和定制服务'
  },
  {
    id: 3,
    name: '广州云计算科技有限公司',
    code: 'SUP20250103',
    category: '云服务',
    status: 'potential',
    contact: {
      name: '王五',
      phone: '13700137001',
      email: 'wangwu@example.com'
    },
    address: '广州市天河区软件路128号高新科技园',
    createdAt: '2025-02-10',
    logo: '',
    notes: '提供云服务、数据中心托管服务'
  },
  {
    id: 4,
    name: '深圳电子有限公司',
    code: 'SUP20250104',
    category: '电子元器件',
    status: 'inactive',
    contact: {
      name: '赵六',
      phone: '13600136001',
      email: 'zhaoliu@example.com'
    },
    address: '深圳市南山区科技园南区T2栋',
    createdAt: '2025-02-15',
    logo: '',
    notes: '主要提供电子元器件和电路板组件'
  },
  {
    id: 5,
    name: '杭州网络科技有限公司',
    code: 'SUP20250105',
    category: '网络服务',
    status: 'terminated',
    contact: {
      name: '钱七',
      phone: '13500135001',
      email: 'qianqi@example.com'
    },
    address: '杭州市余杭区文一西路969号',
    createdAt: '2025-03-01',
    logo: '',
    notes: '专注于企业网络解决方案和安全服务'
  }
]);

const categories = [
  '硬件设备',
  '软件服务',
  '云服务',
  '电子元器件',
  '网络服务',
  '办公用品',
  '其他'
];

// 状态
const loading = ref(false);
const searchQuery = ref('');
const filterCategory = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const showViewDialog = ref(false);
const showAddDialog = ref(false);
const isEdit = ref(false);
const currentSupplier = ref(null);

const supplierFormRef = ref(null);
const supplierForm = ref({
  name: '',
  code: '',
  category: '',
  status: 'potential',
  contact: {
    name: '',
    phone: '',
    email: ''
  },
  address: '',
  notes: ''
});

// 验证规则
const rules = {
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入供应商编码', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  address: [{ required: true, message: '请输入公司地址', trigger: 'blur' }],
  'contact.name': [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  'contact.phone': [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  'contact.email': [{ required: true, message: '请输入电子邮箱', trigger: 'blur' }]
};

// 计算属性
const filteredSuppliers = computed(() => {
  let result = suppliers.value;
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(supplier => 
      supplier.name.toLowerCase().includes(query) || 
      supplier.code.toLowerCase().includes(query) ||
      supplier.contact.name.toLowerCase().includes(query)
    );
  }
  
  // 类别过滤
  if (filterCategory.value) {
    result = result.filter(supplier => supplier.category === filterCategory.value);
  }
  
  return result;
});

// 方法
const getStatusType = (status) => {
  switch (status) {
    case 'potential': return 'info';
    case 'active': return 'success';
    case 'inactive': return 'warning';
    case 'terminated': return 'danger';
    default: return 'info';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'potential': return '潜在';
    case 'active': return '活跃';
    case 'inactive': return '暂停';
    case 'terminated': return '终止';
    default: return '未知';
  }
};

const handlePageChange = (page) => {
  currentPage.value = page;
};

const viewSupplier = (supplier) => {
  currentSupplier.value = supplier;
  showViewDialog.value = true;
};

const editSupplier = (supplier) => {
  isEdit.value = true;
  currentSupplier.value = supplier;
  supplierForm.value = {
    name: supplier.name,
    code: supplier.code,
    category: supplier.category,
    status: supplier.status,
    contact: {
      name: supplier.contact.name,
      phone: supplier.contact.phone,
      email: supplier.contact.email
    },
    address: supplier.address,
    notes: supplier.notes
  };
  showAddDialog.value = true;
  showViewDialog.value = false;
};

const deleteSupplier = (id) => {
  ElMessageBox.confirm(
    '确定要删除该供应商吗？此操作不可恢复。',
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      const index = suppliers.value.findIndex(supplier => supplier.id === id);
      if (index !== -1) {
        suppliers.value.splice(index, 1);
        ElMessage.success('供应商删除成功');
      }
    })
    .catch(() => {
      // 取消删除，不需要操作
    });
};

const saveSupplier = () => {
  supplierFormRef.value.validate((valid) => {
    if (valid) {
      if (isEdit.value && currentSupplier.value) {
        // 更新供应商
        const index = suppliers.value.findIndex(supplier => supplier.id === currentSupplier.value.id);
        if (index !== -1) {
          suppliers.value[index] = {
            ...currentSupplier.value,
            name: supplierForm.value.name,
            code: supplierForm.value.code,
            category: supplierForm.value.category,
            status: supplierForm.value.status,
            contact: { ...supplierForm.value.contact },
            address: supplierForm.value.address,
            notes: supplierForm.value.notes
          };
        }
        ElMessage.success('供应商信息更新成功');
      } else {
        // 创建新供应商
        const supplierId = suppliers.value.length > 0 
          ? Math.max(...suppliers.value.map(supplier => supplier.id)) + 1 
          : 1;
        
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const supplier = {
          id: supplierId,
          name: supplierForm.value.name,
          code: supplierForm.value.code,
          category: supplierForm.value.category,
          status: supplierForm.value.status,
          contact: { ...supplierForm.value.contact },
          address: supplierForm.value.address,
          createdAt: formattedDate,
          logo: '',
          notes: supplierForm.value.notes
        };
        
        suppliers.value.push(supplier);
        ElMessage.success('供应商添加成功');
      }
      
      showAddDialog.value = false;
      isEdit.value = false;
      resetForm();
    } else {
      return false;
    }
  });
};

const resetForm = () => {
  supplierForm.value = {
    name: '',
    code: '',
    category: '',
    status: 'potential',
    contact: {
      name: '',
      phone: '',
      email: ''
    },
    address: '',
    notes: ''
  };
  currentSupplier.value = null;
};
</script> 