<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="bg-white rounded-lg shadow p-6">
      <h1 class="text-xl font-semibold text-gray-800 mb-6">供应商管理</h1>

      <div class="flex justify-between items-center mb-6">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索供应商名称、联系人..."
            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <el-icon class="absolute left-3 top-2.5 text-gray-400">
            <Search />
          </el-icon>
        </div>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon class="mr-1"><Plus /></el-icon>添加供应商
        </el-button>
      </div>

      <el-table :data="pagedSuppliers" stripe style="width: 100%" v-loading="loading">
        <el-table-column label="供应商名称" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center">
              <el-avatar :size="40" class="mr-3">{{ row.name?.charAt(0) || '?' }}</el-avatar>
              <div>
                <div class="font-medium text-gray-900">{{ row.name }}</div>
                <div class="text-xs text-gray-500">{{ row.vendor_id }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="联系人" prop="contact" min-width="120" />
        <el-table-column label="电话" prop="phone" min-width="140" />
        <el-table-column label="地址" prop="address" min-width="200" show-overflow-tooltip />
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="viewSupplier(row)">
              <el-icon><View /></el-icon>
            </el-button>
            <el-button size="small" text type="primary" @click="editSupplier(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row.vendor_id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-500">共 {{ filteredSuppliers.length }} 个供应商</div>
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filteredSuppliers.length"
          layout="prev, pager, next"
        />
      </div>
    </div>

    <el-dialog v-model="showViewDialog" title="供应商详情" width="640px">
      <div v-if="currentSupplier" class="space-y-4">
        <div>
          <div class="text-xs text-gray-500">名称</div>
          <div class="font-medium">{{ currentSupplier.name }}</div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-gray-500">联系人</div>
            <div>{{ currentSupplier.contact || '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">电话</div>
            <div>{{ currentSupplier.phone || '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">邮箱</div>
            <div>{{ currentSupplier.email || '-' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">创建时间</div>
            <div>{{ formatDate(currentSupplier.created_at) }}</div>
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-500">地址</div>
          <div>{{ currentSupplier.address || '-' }}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">备注</div>
          <div>{{ currentSupplier.remark || '暂无备注' }}</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showViewDialog = false">关闭</el-button>
        <el-button type="primary" @click="editSupplier(currentSupplier!)">编辑</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showFormDialog"
      :title="isEdit ? '编辑供应商' : '添加供应商'"
      width="560px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="供应商名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入供应商名称" />
        </el-form-item>
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="联系人" prop="contact">
            <el-input v-model="form.contact" placeholder="联系人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" placeholder="联系电话" />
          </el-form-item>
        </div>
        <el-form-item label="电子邮箱" prop="email">
          <el-input v-model="form.email" placeholder="电子邮箱（可选）" />
        </el-form-item>
        <el-form-item label="公司地址" prop="address">
          <el-input v-model="form.address" placeholder="公司地址" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFormDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveSupplier">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Edit, Delete, Search, View } from '@element-plus/icons-vue'
import {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  type Vendor,
  type VendorInput,
} from '@/api/vendor'
import { unwrapData } from '@/api/utils'

const suppliers = ref<Vendor[]>([])
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const showViewDialog = ref(false)
const showFormDialog = ref(false)
const isEdit = ref(false)
const currentSupplier = ref<Vendor | null>(null)
const editingId = ref('')

const formRef = ref<FormInstance>()
const form = ref<VendorInput>({
  name: '',
  contact: '',
  phone: '',
  address: '',
  email: '',
  remark: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
}

const filteredSuppliers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return suppliers.value
  return suppliers.value.filter((v) =>
    [v.name, v.contact, v.phone, v.address, v.email]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q))
  )
})

const pagedSuppliers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSuppliers.value.slice(start, start + pageSize.value)
})

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

async function loadSuppliers() {
  loading.value = true
  try {
    const res = await listVendors()
    suppliers.value = unwrapData<Vendor[]>(res) ?? []
  } catch (error) {
    console.error('加载供应商失败', error)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  isEdit.value = false
  editingId.value = ''
  showFormDialog.value = true
}

function viewSupplier(row: Vendor) {
  currentSupplier.value = row
  showViewDialog.value = true
}

function editSupplier(row: Vendor) {
  isEdit.value = true
  editingId.value = row.vendor_id
  currentSupplier.value = row
  form.value = {
    name: row.name,
    contact: row.contact ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    email: row.email ?? '',
    remark: row.remark ?? '',
  }
  showViewDialog.value = false
  showFormDialog.value = true
}

async function handleDelete(vendorId: string) {
  try {
    await ElMessageBox.confirm('确定要删除该供应商吗？', '删除确认', { type: 'warning' })
    await deleteVendor(vendorId)
    suppliers.value = suppliers.value.filter((v) => v.vendor_id !== vendorId)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消
  }
}

async function saveSupplier() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (isEdit.value && editingId.value) {
      const updated = await updateVendor(editingId.value, form.value)
      const payload = unwrapData<Vendor>(updated)
      const index = suppliers.value.findIndex((v) => v.vendor_id === editingId.value)
      if (index >= 0 && payload) suppliers.value[index] = payload
      ElMessage.success('更新成功')
    } else {
      const created = await createVendor(form.value)
      const payload = unwrapData<Vendor>(created)
      if (payload) suppliers.value.unshift(payload)
      ElMessage.success('创建成功')
    }
    showFormDialog.value = false
  } catch (error) {
    console.error('保存供应商失败', error)
  } finally {
    saving.value = false
  }
}

function resetForm() {
  form.value = { name: '', contact: '', phone: '', address: '', email: '', remark: '' }
  formRef.value?.resetFields()
}

onMounted(loadSuppliers)
</script>
