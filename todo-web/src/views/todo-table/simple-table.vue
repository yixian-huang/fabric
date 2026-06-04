<!-- The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work. -->
<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- 顶部操作区 -->
    <div
      class="bg-white border-b border-gray-200 py-3 px-6 flex justify-between items-center shadow-sm"
    >
      <div class="flex items-center space-x-2">
        <h1 class="text-xl font-semibold text-gray-800">项目管理极简表</h1>
        <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
          >2025-04-04</span
        >
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="addNewRow"
          class="px-3 py-1.5 bg-blue-600 text-white rounded-md flex items-center space-x-1 hover:bg-blue-700 transition cursor-pointer whitespace-nowrap !rounded-button"
        >
          <el-icon><Plus /></el-icon>
          <span>新增行</span>
        </button>
        <button
          @click="addNewColumn"
          class="px-3 py-1.5 bg-blue-600 text-white rounded-md flex items-center space-x-1 hover:bg-blue-700 transition cursor-pointer whitespace-nowrap !rounded-button"
        >
          <el-icon><Plus /></el-icon>
          <span>新增列</span>
        </button>
        <button
          @click="deleteSelectedItems"
          :disabled="!hasSelection"
          :class="[
            !hasSelection
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 cursor-pointer',
          ]"
          class="px-3 py-1.5 text-white rounded-md flex items-center space-x-1 transition whitespace-nowrap !rounded-button"
        >
          <el-icon><Delete /></el-icon>
          <span>删除选中</span>
        </button>
        <button
          @click="generateShareLink"
          class="px-3 py-1.5 bg-green-600 text-white rounded-md flex items-center space-x-1 hover:bg-green-700 transition cursor-pointer whitespace-nowrap !rounded-button"
        >
          <el-icon><Share /></el-icon>
          <span>分享链接</span>
        </button>
      </div>
    </div>
    <!-- 样式工具栏 -->
    <div
      class="bg-white border-b border-gray-200 py-2 px-6 flex items-center space-x-4"
    >
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">文字颜色</span>
        <div class="flex items-center space-x-1">
          <div
            v-for="color in textColors"
            :key="`text-${color.value}`"
            @click="applyTextColor(color.value)"
            :style="{ backgroundColor: color.bg }"
            class="w-6 h-6 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-400"
          ></div>
        </div>
      </div>
      <div class="h-6 border-r border-gray-300"></div>
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600">背景颜色</span>
        <div class="flex items-center space-x-1">
          <div
            v-for="color in bgColors"
            :key="`bg-${color.value}`"
            @click="applyBgColor(color.value)"
            :style="{ backgroundColor: color.bg }"
            class="w-6 h-6 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-400"
          ></div>
        </div>
      </div>
      <div class="h-6 border-r border-gray-300"></div>
      <button
        @click="clearCellFormat"
        :disabled="selectedCells.length === 0"
        :class="[
          selectedCells.length === 0
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-700 hover:text-blue-600 cursor-pointer',
        ]"
        class="flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap !rounded-button"
      >
        <el-icon><Close /></el-icon>
        <span>清除格式</span>
      </button>
    </div>
    <!-- 表格容器 -->
    <div class="flex-1 overflow-auto">
      <div class="table-container" ref="tableRef">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th
                class="sticky top-0 left-0 z-20 bg-gray-100 border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 w-16"
              >
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    @click="toggleAllRows"
                    class="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  序号
                </div>
              </th>
              <th
                v-for="(column, colIndex) in columns"
                :key="column.id"
                class="sticky top-0 z-10 bg-gray-100 border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700"
                :class="{ 'selected-column': isColumnSelected(colIndex) }"
                @click="handleColumnClick(colIndex, $event)"
                @contextmenu.prevent="showColumnContextMenu(colIndex, $event)"
              >
                <div class="flex items-center justify-between">
                  <span>{{ column.title }}</span>
                  <div class="flex items-center space-x-1">
                    <button
                      @click.stop="resizeColumn(colIndex)"
                      class="text-gray-500 hover:text-gray-700 cursor-pointer whitespace-nowrap !rounded-button"
                    >
                      <el-icon><ArrowsLeftRight /></el-icon>
                    </button>
                  </div>
                </div>
                <div
                  class="resize-handle"
                  @mousedown.stop="startResizing(colIndex, $event)"
                  title="拖拽调整列宽"
                ></div>
              </th>
              <th
                class="sticky top-0 z-10 bg-gray-100 border border-gray-300 w-12 text-center"
              >
                <button
                  @click="addNewColumn"
                  class="text-gray-500 hover:text-blue-600 cursor-pointer whitespace-nowrap !rounded-button"
                >
                  <el-icon><Plus /></el-icon>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in rows"
              :key="row.id"
              :class="{ 'selected-row': isRowSelected(rowIndex) }"
            >
              <td
                class="sticky left-0 z-10 bg-gray-50 border border-gray-300 px-4 py-2 text-sm text-gray-700"
                @click="handleRowClick(rowIndex, $event)"
                @contextmenu.prevent="showRowContextMenu(rowIndex, $event)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <input
                      type="checkbox"
                      :checked="isRowSelected(rowIndex)"
                      @click.stop="toggleRowSelection(rowIndex)"
                      class="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span>{{ rowIndex + 1 }}</span>
                  </div>
                  <button
                    @click.stop="deleteRow(rowIndex)"
                    class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer whitespace-nowrap !rounded-button"
                  >
                    <el-icon><Delete /></el-icon>
                  </button>
                </div>
              </td>
              <td
                v-for="(column, colIndex) in columns"
                :key="`${row.id}-${column.id}`"
                class="border border-gray-300 px-2 py-2 text-sm"
                :class="{
                  'selected-cell': isCellSelected(rowIndex, colIndex),
                  'image-cell': row.data[column.id]?.type === 'image',
                  'file-cell': row.data[column.id]?.type === 'file',
                }"
                :style="getCellStyle(rowIndex, colIndex)"
                @click="selectCell(rowIndex, colIndex, $event)"
                @dblclick="editCell(rowIndex, colIndex)"
                @contextmenu.prevent="
                  showCellContextMenu(rowIndex, colIndex, $event)
                "
                @dragover.prevent
                @drop="handleDrop(rowIndex, colIndex, $event)"
              >
                <!-- 图片单元格 -->
                <div
                  v-if="row.data[column.id]?.type === 'image'"
                  class="w-full h-full flex items-center justify-center"
                >
                  <img
                    :src="row.data[column.id]?.value"
                    class="max-w-full max-h-20 object-contain"
                    alt="样式图"
                  />
                </div>
                <!-- 文件单元格 -->
                <div
                  v-else-if="row.data[column.id]?.type === 'file'"
                  class="w-full h-full flex items-center"
                >
                  <a
                    :href="row.data[column.id]?.value"
                    target="_blank"
                    class="text-blue-600 hover:underline flex items-center"
                  >
                    <el-icon class="mr-1"><Document /></el-icon>
                    {{ row.data[column.id]?.fileName || "文件" }}
                  </a>
                </div>
                <!-- 文本单元格 -->
                <div
                  v-else-if="!isEditing(rowIndex, colIndex)"
                  class="cell-content"
                >
                  {{ row.data[column.id]?.value || "" }}
                </div>
                <!-- 编辑状态 -->
                <div v-else class="w-full h-full">
                  <input
                    ref="cellInputRef"
                    v-model="editingValue"
                    class="w-full h-full border-none focus:outline-none px-2 text-sm"
                    @blur="saveEdit"
                    @keydown.enter="saveEdit"
                    @keydown.esc="cancelEdit"
                  />
                </div>
              </td>
              <td class="border border-gray-300 w-12 bg-gray-50"></td>
            </tr>
            <!-- 添加行按钮 -->
            <tr>
              <td
                class="sticky left-0 z-10 bg-gray-50 border border-gray-300 text-center py-2"
              >
                <button
                  @click="addNewRow"
                  class="text-gray-500 hover:text-blue-600 cursor-pointer whitespace-nowrap !rounded-button"
                >
                  <el-icon><Plus /></el-icon>
                </button>
              </td>
              <td
                v-for="column in columns"
                :key="`add-${column.id}`"
                class="border border-gray-300 bg-gray-50"
              ></td>
              <td class="border border-gray-300 bg-gray-50"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- 底部状态栏 -->
    <div
      class="border-t border-gray-200 bg-white py-3 px-6 flex justify-between items-center"
    >
      <div class="text-sm text-gray-600">
        {{
          selectedCells.length > 0
            ? `已选择 ${selectedCells.length} 个单元格`
            : "点击单元格开始编辑"
        }}
      </div>
      <div class="flex items-center space-x-4">
        <button
          @click="copySelectedCells"
          :disabled="selectedCells.length === 0"
          :class="[
            selectedCells.length === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-blue-600 cursor-pointer',
          ]"
          class="flex items-center space-x-1 whitespace-nowrap !rounded-button"
        >
          <el-icon><CopyDocument /></el-icon>
          <span>复制</span>
        </button>
        <button
          @click="pasteToSelectedCell"
          :disabled="!clipboardData"
          :class="[
            !clipboardData
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-blue-600 cursor-pointer',
          ]"
          class="flex items-center space-x-1 whitespace-nowrap !rounded-button"
        >
          <el-icon><Document /></el-icon>
          <span>粘贴</span>
        </button>
        <button
          @click="undoAction"
          :disabled="!canUndo"
          :class="[
            !canUndo
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-blue-600 cursor-pointer',
          ]"
          class="whitespace-nowrap !rounded-button"
        >
          <el-icon><Back /></el-icon>
          <span>撤销</span>
        </button>
        <button
          @click="redoAction"
          :disabled="!canRedo"
          :class="[
            !canRedo
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:text-blue-600 cursor-pointer',
          ]"
          class="whitespace-nowrap !rounded-button"
        >
          <el-icon><Right /></el-icon>
          <span>重做</span>
        </button>
      </div>
    </div>
    <!-- 上下文菜单 -->
    <div v-if="contextMenu.show" class="context-menu" :style="contextMenuStyle">
      <div v-if="contextMenu.type === 'cell'">
        <div @click="editCurrentCell" class="context-menu-item">
          <el-icon><Edit /></el-icon>
          <span>编辑单元格</span>
        </div>
        <div @click="clearCellContent" class="context-menu-item">
          <el-icon><Delete /></el-icon>
          <span>清除内容</span>
        </div>
        <div @click="uploadImageToCell" class="context-menu-item">
          <el-icon><Picture /></el-icon>
          <span>上传图片</span>
        </div>
        <div @click="uploadFileToCell" class="context-menu-item">
          <el-icon><Upload /></el-icon>
          <span>上传文件</span>
        </div>
        <div class="context-menu-divider"></div>
        <div
          @click="applyTextColorFromMenu('text-red-500')"
          class="context-menu-item"
        >
          <div class="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
          <span>红色文字</span>
        </div>
        <div
          @click="applyTextColorFromMenu('text-blue-500')"
          class="context-menu-item"
        >
          <div class="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
          <span>蓝色文字</span>
        </div>
        <div
          @click="applyTextColorFromMenu('text-green-500')"
          class="context-menu-item"
        >
          <div class="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
          <span>绿色文字</span>
        </div>
        <div class="context-menu-divider"></div>
        <div
          @click="applyBgColorFromMenu('bg-red-100')"
          class="context-menu-item"
        >
          <div class="w-4 h-4 rounded-full bg-red-100 mr-2"></div>
          <span>红色背景</span>
        </div>
        <div
          @click="applyBgColorFromMenu('bg-blue-100')"
          class="context-menu-item"
        >
          <div class="w-4 h-4 rounded-full bg-blue-100 mr-2"></div>
          <span>蓝色背景</span>
        </div>
        <div
          @click="applyBgColorFromMenu('bg-green-100')"
          class="context-menu-item"
        >
          <div class="w-4 h-4 rounded-full bg-green-100 mr-2"></div>
          <span>绿色背景</span>
        </div>
        <div class="context-menu-divider"></div>
        <div @click="copySelectedCells" class="context-menu-item">
          <el-icon><CopyDocument /></el-icon>
          <span>复制</span>
        </div>
        <div
          @click="pasteToSelectedCell"
          class="context-menu-item"
          :class="{ disabled: !clipboardData }"
        >
          <el-icon><Document /></el-icon>
          <span>粘贴</span>
        </div>
      </div>
      <div v-else-if="contextMenu.type === 'column'">
        <div @click="renameColumn" class="context-menu-item">
          <el-icon><Edit /></el-icon>
          <span>重命名列</span>
        </div>
        <div @click="deleteColumn" class="context-menu-item">
          <el-icon><Delete /></el-icon>
          <span>删除列</span>
        </div>
        <div class="context-menu-divider"></div>
        <div @click="sortColumnAsc" class="context-menu-item">
          <el-icon><Sort /></el-icon>
          <span>升序排序</span>
        </div>
        <div @click="sortColumnDesc" class="context-menu-item">
          <el-icon><Sort /></el-icon>
          <span>降序排序</span>
        </div>
      </div>
      <div v-else-if="contextMenu.type === 'row'">
        <div @click="insertRowAbove" class="context-menu-item">
          <el-icon><Top /></el-icon>
          <span>在上方插入行</span>
        </div>
        <div @click="insertRowBelow" class="context-menu-item">
          <el-icon><Bottom /></el-icon>
          <span>在下方插入行</span>
        </div>
        <div @click="deleteRow(contextMenu.rowIndex)" class="context-menu-item">
          <el-icon><Delete /></el-icon>
          <span>删除行</span>
        </div>
      </div>
    </div>
    <!-- 分享链接对话框 -->
    <el-dialog v-model="shareDialog.show" title="分享链接" width="500px">
      <div class="p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >分享权限</label
          >
          <div class="flex items-center space-x-4">
            <el-radio v-model="shareDialog.permission" label="view"
              >只读</el-radio
            >
            <el-radio v-model="shareDialog.permission" label="edit"
              >可编辑</el-radio
            >
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >有效期</label
          >
          <el-select v-model="shareDialog.expiry" class="w-full">
            <el-option label="1 天" value="1" />
            <el-option label="7 天" value="7" />
            <el-option label="30 天" value="30" />
            <el-option label="永久" value="never" />
          </el-select>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >选中的行</label
          >
          <div class="p-2 bg-gray-50 rounded border border-gray-200 text-sm">
            <span v-if="selectedRows.length > 0">
              {{ selectedRows.map((index) => index + 1).join(", ") }}
            </span>
            <span v-else-if="selectedCells.length > 0">
              {{
                [
                  ...new Set(selectedCells.map((cell) => cell.rowIndex + 1)),
                ].join(", ")
              }}
            </span>
            <span v-else class="text-gray-500">未选中任何行</span>
          </div>
        </div>
        <div v-if="shareDialog.link" class="mt-6 p-3 bg-gray-50 rounded-lg">
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-600 truncate">
              {{ shareDialog.link }}
            </div>
            <button
              @click="copyShareLink"
              class="text-blue-600 hover:text-blue-800 cursor-pointer whitespace-nowrap !rounded-button"
            >
              <el-icon><CopyDocument /></el-icon>
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            @click="shareDialog.show = false"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer whitespace-nowrap !rounded-button"
          >
            关闭
          </button>
          <button
            @click="createShareLink"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none cursor-pointer whitespace-nowrap !rounded-button"
          >
            生成链接
          </button>
        </div>
      </template>
    </el-dialog>
    <!-- 列重命名对话框 -->
    <el-dialog v-model="columnRenameDialog.show" title="重命名列" width="400px">
      <div class="p-4">
        <div class="mb-4">
          <label
            for="columnName"
            class="block text-sm font-medium text-gray-700 mb-1"
            >列名称</label
          >
          <input
            id="columnName"
            v-model="columnRenameDialog.value"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入列名称"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            @click="columnRenameDialog.show = false"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none cursor-pointer whitespace-nowrap !rounded-button"
          >
            取消
          </button>
          <button
            @click="saveColumnRename"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none cursor-pointer whitespace-nowrap !rounded-button"
          >
            保存
          </button>
        </div>
      </template>
    </el-dialog>
    <!-- 隐藏的文件上传输入 -->
    <input
      type="file"
      ref="fileInputRef"
      class="hidden"
      @change="handleFileUpload"
    />
    <!-- 隐藏的文档上传输入 -->
    <input
      type="file"
      ref="documentInputRef"
      class="hidden"
      @change="handleDocumentUpload"
    />
  </div>
</template>
    <script lang="ts" setup>
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import {
  Plus,
  Delete,
  Edit,
  CopyDocument,
  Document,
  Share,
  Back,
  Right,
  Picture,
  ArrowRight as ArrowsLeftRight,
  Sort,
  Top,
  Bottom,
  Close,
  Upload,
} from "@element-plus/icons-vue";
import { Column, Row, SelectedCell, ContextMenu, ShareDialog, ColumnRenameDialog, HistoryState } from "./todo-table/types";
// 表格数据
const columns = ref<Column[]>([
  { id: "col1", title: "序号", width: 80 },
  { id: "col2", title: "客户", width: 120 },
  { id: "col3", title: "成衣款号", width: 120 },
  { id: "col4", title: "样式图", width: 120 },
  { id: "col5", title: "供应商", width: 120 },
  { id: "col6", title: "文件", width: 120 },
  { id: "col7", title: "单价", width: 120 },
  { id: "col8", title: "主面料", width: 150 },
  { id: "col9", title: "主辅料", width: 150 },
  { id: "col10", title: "事宜", width: 200 },
  { id: "col11", title: "完成日期", width: 120 },
  { id: "col12", title: "备注", width: 200 },
]);
const rows = ref<Row[]>([
  {
    id: "row1",
    data: {
      col1: { type: "text", value: "1" },
      col2: { type: "text", value: "SCR" },
      col3: { type: "text", value: "TICHIA" },
      col4: {
        type: "image",
        value:
          "https://public.readdy.ai/ai/img_res/134bf4b6e8ea2838a64d0b1145d5750f.jpg",
      },
      col5: { type: "text", value: "HS" },
      col6: { type: "file", value: "#", fileName: "TICHIA P1" },
      col7: { type: "text", value: "加工费 48 元" },
      col8: { type: "text", value: "K1189-KH" },
      col9: { type: "text", value: "YKK 2#隐拉" },
      col10: { type: "text", value: "打二次样衣" },
      col11: { type: "text", value: "2025/04/10" },
      col12: { type: "text", value: "" },
    },
  },
  {
    id: "row2",
    data: {
      col1: { type: "text", value: "1.1" },
      col2: { type: "text", value: "SCR" },
      col3: { type: "text", value: "TICHIA" },
      col4: {
        type: "image",
        value:
          "https://public.readdy.ai/ai/img_res/538dceaed20d5d25ba9b3b02b2a6a436.jpg",
      },
      col5: { type: "text", value: "KH" },
      col6: { type: "text", value: "" },
      col7: { type: "text", value: "单价 17 元每米" },
      col8: { type: "text", value: "K1189-KH" },
      col9: { type: "text", value: "" },
      col10: { type: "text", value: "打 ABC 色样" },
      col11: { type: "text", value: "2025/04/08" },
      col12: { type: "text", value: "" },
    },
  },
  {
    id: "row3",
    data: {
      col1: { type: "text", value: "1.2" },
      col2: { type: "text", value: "SCR" },
      col3: { type: "text", value: "TICHIA" },
      col4: {
        type: "image",
        value:
          "https://public.readdy.ai/ai/img_res/fb205a06c91a3efdbf8a715baecc6367.jpg",
      },
      col5: { type: "text", value: "YKK" },
      col6: { type: "text", value: "" },
      col7: { type: "text", value: "" },
      col8: { type: "text", value: "" },
      col9: { type: "text", value: "YKK 2#隐拉" },
      col10: { type: "text", value: "配绿色色样", bgColor: "bg-green-100" },
      col11: { type: "text", value: "2025/04/03" },
      col12: { type: "text", value: "" },
    },
  },
  {
    id: "row4",
    data: {
      col1: { type: "text", value: "1.3" },
      col2: { type: "text", value: "SCR" },
      col3: { type: "text", value: "TICHIA" },
      col4: {
        type: "image",
        value:
          "https://public.readdy.ai/ai/img_res/8cd436562ddf9faf79e30020c5183564.jpg",
      },
      col5: { type: "text", value: "NT" },
      col6: { type: "text", value: "" },
      col7: { type: "text", value: "" },
      col8: { type: "text", value: "100%TENCEL 90gsm" },
      col9: { type: "text", value: "" },
      col10: { type: "text", value: "找相同的面料", bgColor: "bg-red-100" },
      col11: { type: "text", value: "2025/04/08" },
      col12: { type: "text", value: "" },
    },
  },
  {
    id: "row5",
    data: {
      col1: { type: "text", value: "2" },
      col2: { type: "text", value: "TD" },
      col3: { type: "text", value: "CHARIL" },
      col4: {
        type: "image",
        value:
          "https://public.readdy.ai/ai/img_res/3fbf259a377f3c010782d54ae0d31bb3.jpg",
      },
      col5: { type: "text", value: "HSD" },
      col6: { type: "text", value: "" },
      col7: { type: "text", value: "" },
      col8: { type: "text", value: "K1834-KH" },
      col9: { type: "text", value: "4H-BTN-P" },
      col10: { type: "text", value: "打头样" },
      col11: { type: "text", value: "2025/04/12" },
      col12: { type: "text", value: "" },
    },
  },
  {
    id: "row6",
    data: {
      col1: { type: "text", value: "2.1" },
      col2: { type: "text", value: "TD" },
      col3: { type: "text", value: "CHARIL" },
      col4: {
        type: "image",
        value:
          "https://public.readdy.ai/ai/img_res/7fbf63eebbd5a7e37e42f0a19cb116b4.jpg",
      },
      col5: { type: "text", value: "KH" },
      col6: { type: "text", value: "" },
      col7: { type: "text", value: "单价 18 元每米" },
      col8: { type: "text", value: "1834-KH" },
      col9: { type: "text", value: "" },
      col10: {
        type: "text",
        value: "安原样色确认 放样 50 米",
        bgColor: "bg-green-100",
      },
      col11: { type: "text", value: "2025/04/12" },
      col12: { type: "text", value: "" },
    },
  },
]);
// 状态变量
const selectedCells = ref<SelectedCell[]>([]);
const editingCell = ref<SelectedCell | null>(null);
const editingValue = ref("");
const isResizing = ref(false);
const resizingColumn = ref(-1);
const startX = ref(0);
const startWidth = ref(0);
const clipboardData = ref<any>(null);
const tableRef = ref<HTMLElement | null>(null);
const cellInputRef = ref<HTMLInputElement[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const documentInputRef = ref<HTMLInputElement | null>(null);
const selectedColumns = ref<number[]>([]);
const selectedRows = ref<number[]>([]);
// 颜色选项
const textColors = [
  { value: "text-black", bg: "#000000" },
  { value: "text-red-500", bg: "#ef4444" },
  { value: "text-blue-500", bg: "#3b82f6" },
  { value: "text-green-500", bg: "#22c55e" },
  { value: "text-yellow-500", bg: "#eab308" },
  { value: "text-purple-500", bg: "#a855f7" },
];
const bgColors = [
  { value: "bg-white", bg: "#ffffff" },
  { value: "bg-red-100", bg: "#fee2e2" },
  { value: "bg-blue-100", bg: "#dbeafe" },
  { value: "bg-green-100", bg: "#dcfce7" },
  { value: "bg-yellow-100", bg: "#fef9c3" },
  { value: "bg-purple-100", bg: "#f3e8ff" },
];
// 历史记录
const history = ref<HistoryState[]>([]);
const historyIndex = ref(-1);
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);
// 上下文菜单
const contextMenu = reactive<ContextMenu>({
  show: false,
  type: "cell",
  x: 0,
  y: 0,
  rowIndex: -1,
  colIndex: -1,
});
const contextMenuStyle = computed(() => {
  return {
    top: `${contextMenu.y}px`,
    left: `${contextMenu.x}px`,
  };
});
// 分享对话框
const shareDialog = reactive<ShareDialog>({
  show: false,
  permission: "view",
  expiry: "7",
  link: "",
});
// 列重命名对话框
const columnRenameDialog = reactive<ColumnRenameDialog>({
  show: false,
  colIndex: -1,
  value: "",
});
// 是否有选中项
const hasSelection = computed(() => {
  return (
    selectedCells.value.length > 0 ||
    selectedRows.value.length > 0 ||
    selectedColumns.value.length > 0
  );
});
// 获取单元格样式
const getCellStyle = (rowIndex: number, colIndex: number) => {
  const columnId = columns.value[colIndex].id;
  const cellData = rows.value[rowIndex].data[columnId];
  if (!cellData) return {};
  const style: Record<string, string> = {};
  if (cellData.textColor) {
    style.color = getColorValue(cellData.textColor);
  }
  if (cellData.bgColor) {
    style.backgroundColor = getColorValue(cellData.bgColor);
  }
  return style;
};
// 获取颜色值
const getColorValue = (colorClass: string) => {
  // 简单的颜色映射
  const colorMap: Record<string, string> = {
    "text-red-500": "#ef4444",
    "text-blue-500": "#3b82f6",
    "text-green-500": "#22c55e",
    "text-yellow-500": "#eab308",
    "text-purple-500": "#a855f7",
    "bg-red-100": "#fee2e2",
    "bg-blue-100": "#dbeafe",
    "bg-green-100": "#dcfce7",
    "bg-yellow-100": "#fef9c3",
    "bg-purple-100": "#f3e8ff",
  };
  return colorMap[colorClass] || "";
};
// 方法
const addNewColumn = () => {
  saveHistoryState();
  const newId = `col${Date.now()}`;
  columns.value.push({
    id: newId,
    title: "新列",
    width: 150,
  });
};
const toggleRowSelection = (rowIndex: number) => {
  const existingIndex = selectedRows.value.indexOf(rowIndex);
  if (existingIndex >= 0) {
    selectedRows.value.splice(existingIndex, 1);
  } else {
    selectedRows.value.push(rowIndex);
  }
  // 清除单元格和列的选择
  selectedCells.value = [];
  selectedColumns.value = [];
};
const toggleAllRows = () => {
  if (selectedRows.value.length === rows.value.length) {
    selectedRows.value = [];
  } else {
    selectedRows.value = rows.value.map((_: Row, index: number) => index);
  }
  selectedCells.value = [];
  selectedColumns.value = [];
};
const addNewRow = () => {
  saveHistoryState();
  const newRow: Row = {
    id: `row${Date.now()}`,
    data: {},
  };
  columns.value.forEach((column: Column) => {
    newRow.data[column.id] = { type: "text", value: "" };
  });
  rows.value.push(newRow);
};
const selectCell = (rowIndex: number, colIndex: number, event: MouseEvent) => {
  // 关闭上下文菜单
  contextMenu.show = false;
  // 如果正在编辑，先保存编辑
  if (editingCell.value) {
    saveEdit();
  }
  // 处理多选
  if (event.shiftKey && selectedCells.value.length > 0) {
    // Shift 键多选 - 选择区域
    const lastSelected = selectedCells.value[selectedCells.value.length - 1];
    const startRow = Math.min(lastSelected.rowIndex, rowIndex);
    const endRow = Math.max(lastSelected.rowIndex, rowIndex);
    const startCol = Math.min(lastSelected.colIndex, colIndex);
    const endCol = Math.max(lastSelected.colIndex, colIndex);
    // 清除当前选择
    selectedCells.value = [];
    // 选择区域内的所有单元格
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        selectedCells.value.push({ rowIndex: r, colIndex: c });
      }
    }
  } else if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd 键多选 - 添加/移除单个单元格
    const existingIndex = selectedCells.value.findIndex(
      (cell: SelectedCell) => cell.rowIndex === rowIndex && cell.colIndex === colIndex
    );
    if (existingIndex >= 0) {
      // 如果已经选中，则取消选中
      selectedCells.value.splice(existingIndex, 1);
    } else {
      // 否则添加到选中列表
      selectedCells.value.push({ rowIndex, colIndex });
    }
  } else {
    // 普通点击 - 选择单个单元格
    selectedCells.value = [{ rowIndex, colIndex }];
  }
  // 清除行和列的选择
  selectedRows.value = [];
  selectedColumns.value = [];
};
const handleRowClick = (rowIndex: number, event: MouseEvent) => {
  // 关闭上下文菜单
  contextMenu.show = false;
  // 如果正在编辑，先保存编辑
  if (editingCell.value) {
    saveEdit();
  }
  // 处理行选择
  if (event.shiftKey && selectedRows.value.length > 0) {
    // Shift 键多选 - 选择连续行
    const lastSelected = selectedRows.value[selectedRows.value.length - 1];
    const startRow = Math.min(lastSelected, rowIndex);
    const endRow = Math.max(lastSelected, rowIndex);
    selectedRows.value = [];
    for (let r = startRow; r <= endRow; r++) {
      selectedRows.value.push(r);
    }
  } else if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd 键多选 - 添加/移除单个行
    const existingIndex = selectedRows.value.indexOf(rowIndex);
    if (existingIndex >= 0) {
      selectedRows.value.splice(existingIndex, 1);
    } else {
      selectedRows.value.push(rowIndex);
    }
  } else {
    // 普通点击 - 选择单个行
    selectedRows.value = [rowIndex];
  }
  // 清除单元格和列的选择
  selectedCells.value = [];
  selectedColumns.value = [];
};
const handleColumnClick = (colIndex: number, event: MouseEvent) => {
  // 关闭上下文菜单
  contextMenu.show = false;
  // 如果正在编辑，先保存编辑
  if (editingCell.value) {
    saveEdit();
  }
  // 处理列选择
  if (event.shiftKey && selectedColumns.value.length > 0) {
    const lastSelected = selectedColumns.value[selectedColumns.value.length - 1];
    const startCol = Math.min(lastSelected, colIndex);
    const endCol = Math.max(lastSelected, colIndex);
    selectedColumns.value = [];
    for (let c = startCol; c <= endCol; c++) {
      selectedColumns.value.push(c);
    }
  } else if (event.ctrlKey || event.metaKey) {
    // Ctrl/Cmd 键多选 - 添加/移除单个列
    const existingIndex = selectedColumns.value.indexOf(colIndex);
    if (existingIndex >= 0) {
      selectedColumns.value.splice(existingIndex, 1);
    } else {
      selectedColumns.value.push(colIndex);
    }
  } else {
    // 普通点击 - 选择单个列
    selectedColumns.value = [colIndex];
  }
  // 清除单元格和行的选择
  selectedCells.value = [];
  selectedRows.value = [];
};
const editCell = (rowIndex: number, colIndex: number) => {
  // 如果是图片单元格，打开上传对话框
  const cellData = rows.value[rowIndex].data[columns.value[colIndex].id];
  if (cellData?.type === "image") {
    uploadImageToCell();
    return;
  }
  // 如果是文件单元格，打开上传对话框
  if (cellData?.type === "file") {
    uploadFileToCell();
    return;
  }
  // 设置编辑状态
  editingCell.value = { rowIndex, colIndex };
  editingValue.value = cellData?.value || "";
  // 确保单元格被选中
  selectedCells.value = [{ rowIndex, colIndex }];
  // 等待 DOM 更新后聚焦输入框
  nextTick(() => {
    // 确保元素已经渲染
    setTimeout(() => {
      console.log(cellInputRef.value);
      if (cellInputRef.value && cellInputRef.value.length > 0) {
        cellInputRef.value[0].focus();
      }
    }, 0);
  });
};
const saveEdit = () => {
  if (!editingCell.value) return;
  const { rowIndex, colIndex } = editingCell.value;
  const columnId = columns.value[colIndex].id;
  // 保存历史状态
  saveHistoryState();
  // 更新数据
  if (!rows.value[rowIndex].data[columnId]) {
    rows.value[rowIndex].data[columnId] = { type: "text", value: "" };
  }
  rows.value[rowIndex].data[columnId].value = editingValue.value;
  // 重置编辑状态
  editingCell.value = null;
  editingValue.value = "";
};
const cancelEdit = () => {
  editingCell.value = null;
  editingValue.value = "";
};
const isEditing = (rowIndex: number, colIndex: number) => {
  return (
    editingCell.value?.rowIndex === rowIndex &&
    editingCell.value?.colIndex === colIndex
  );
};
const isCellSelected = (rowIndex: number, colIndex: number) => {
  return selectedCells.value.some(
    (cell: SelectedCell) => cell.rowIndex === rowIndex && cell.colIndex === colIndex
  );
};
const isRowSelected = (rowIndex: number) => {
  return selectedRows.value.includes(rowIndex);
};
const isColumnSelected = (colIndex: number) => {
  return selectedColumns.value.includes(colIndex);
};
const startResizing = (colIndex: number, event: MouseEvent) => {
  isResizing.value = true;
  resizingColumn.value = colIndex;
  startX.value = event.clientX;
  startWidth.value = columns.value[colIndex].width;
  // 添加鼠标移动和松开事件监听
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  // 阻止事件传播
  event.stopPropagation();
  // 添加拖拽样式
  document.body.style.cursor = "col-resize";
};
const handleMouseMove = (event: MouseEvent) => {
  if (!isResizing.value) return;
  const diff = event.clientX - startX.value;
  const newWidth = Math.max(80, startWidth.value + diff); // 最小宽度为80px
  columns.value[resizingColumn.value].width = newWidth;
};
const handleMouseUp = () => {
  if (isResizing.value) {
    isResizing.value = false;
    // 移除事件监听
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    // 恢复默认光标
    document.body.style.cursor = "default";
    // 保存历史状态
    saveHistoryState();
  }
};
const resizeColumn = (colIndex: number) => {
  // 自动调整列宽以适应内容
  let maxWidth = 80; // 最小宽度
  // 遍历所有行，找出最长的内容
  rows.value.forEach((row) => {
    const cellData = row.data[columns.value[colIndex].id];
    if (cellData?.type === "text" && cellData.value) {
      // 估算文本宽度 (简单实现，实际可能需要更复杂的计算)
      const textWidth = cellData.value.length * 8 + 20; // 每个字符约8px，加上padding
      maxWidth = Math.max(maxWidth, textWidth);
    }
  });
  // 保存历史状态
  saveHistoryState();
  // 更新列宽
  columns.value[colIndex].width = maxWidth;
};
const deleteRow = (rowIndex: number) => {
  // 保存历史状态
  saveHistoryState();
  // 删除行
  rows.value.splice(rowIndex, 1);
  // 清除选择
  selectedCells.value = [];
  selectedRows.value = [];
  // 关闭上下文菜单
  contextMenu.show = false;
};
const insertRowAbove = () => {
  if (contextMenu.rowIndex < 0) return;
  // 保存历史状态
  saveHistoryState();
  const newRow: Row = {
    id: `row${Date.now()}`,
    data: {},
  };
  columns.value.forEach((column: Column) => {
    newRow.data[column.id] = { type: "text", value: "" };
  });
  // 在当前行之前插入新行
  rows.value.splice(contextMenu.rowIndex, 0, newRow);
  // 关闭上下文菜单
  contextMenu.show = false;
};
const insertRowBelow = () => {
  if (contextMenu.rowIndex < 0) return;
  // 保存历史状态
  saveHistoryState();
  const newRow: Row = {
    id: `row${Date.now()}`,
    data: {},
  };
  columns.value.forEach((column: Column) => {
    newRow.data[column.id] = { type: "text", value: "" };
  });
  // 在当前行之后插入新行
  rows.value.splice(contextMenu.rowIndex + 1, 0, newRow);
  // 关闭上下文菜单
  contextMenu.show = false;
};
const deleteColumn = () => {
  if (contextMenu.colIndex < 0 || columns.value.length <= 1) return;
  // 保存历史状态
  saveHistoryState();
  const columnId = columns.value[contextMenu.colIndex].id;
  // 删除列
  columns.value.splice(contextMenu.colIndex, 1);
  rows.value.forEach((row: Row) => {
    delete row.data[columnId];
  });
  // 清除选择
  selectedCells.value = [];
  selectedColumns.value = [];
  // 关闭上下文菜单
  contextMenu.show = false;
};
const renameColumn = () => {
  if (contextMenu.colIndex < 0) return;
  columnRenameDialog.colIndex = contextMenu.colIndex;
  columnRenameDialog.value = columns.value[contextMenu.colIndex].title;
  columnRenameDialog.show = true;
  // 关闭上下文菜单
  contextMenu.show = false;
};
const saveColumnRename = () => {
  if (columnRenameDialog.colIndex < 0 || !columnRenameDialog.value.trim())
    return;
  // 保存历史状态
  saveHistoryState();
  columns.value[columnRenameDialog.colIndex].title = columnRenameDialog.value.trim();
  columnRenameDialog.show = false;
};
const sortColumnAsc = () => {
  if (contextMenu.colIndex < 0) return;
  // 保存历史状态
  saveHistoryState();
  const columnId = columns.value[contextMenu.colIndex].id;
  rows.value.sort((a: Row, b: Row) => {
    const valueA = a.data[columnId]?.value || "";
    const valueB = b.data[columnId]?.value || "";
    return valueA.localeCompare(valueB);
  });
  // 关闭上下文菜单
  contextMenu.show = false;
};
const sortColumnDesc = () => {
  if (contextMenu.colIndex < 0) return;
  // 保存历史状态
  saveHistoryState();
  const columnId = columns.value[contextMenu.colIndex].id;
  rows.value.sort((a: Row, b: Row) => {
    const valueA = a.data[columnId]?.value || "";
    const valueB = b.data[columnId]?.value || "";
    return valueB.localeCompare(valueA);
  });
  // 关闭上下文菜单
  contextMenu.show = false;
};
const showCellContextMenu = (
  rowIndex: number,
  colIndex: number,
  event: MouseEvent
) => {
  // 设置上下文菜单位置和类型
  contextMenu.type = "cell";
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.rowIndex = rowIndex;
  contextMenu.colIndex = colIndex;
  contextMenu.show = true;
  // 确保单元格被选中
  if (!isCellSelected(rowIndex, colIndex)) {
    selectedCells.value = [{ rowIndex, colIndex }];
  }
};
const showColumnContextMenu = (colIndex: number, event: MouseEvent) => {
  // 设置上下文菜单位置和类型
  contextMenu.type = "column";
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.colIndex = colIndex;
  contextMenu.show = true;
  // 阻止事件冒泡
  event.stopPropagation();
};
const showRowContextMenu = (rowIndex: number, event: MouseEvent) => {
  // 设置上下文菜单位置和类型
  contextMenu.type = "row";
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.rowIndex = rowIndex;
  contextMenu.show = true;
  // 阻止事件冒泡
  event.stopPropagation();
};
const editCurrentCell = () => {
  if (contextMenu.rowIndex >= 0 && contextMenu.colIndex >= 0) {
    editCell(contextMenu.rowIndex, contextMenu.colIndex);
  }
  // 关闭上下文菜单
  contextMenu.show = false;
};
const clearCellContent = () => {
  if (contextMenu.rowIndex >= 0 && contextMenu.colIndex >= 0) {
    // 保存历史状态
    saveHistoryState();
    const columnId = columns.value[contextMenu.colIndex].id;
    if (rows.value[contextMenu.rowIndex].data[columnId]) {
      rows.value[contextMenu.rowIndex].data[columnId] = {
        type: "text",
        value: "",
      };
    }
  }
  // 关闭上下文菜单
  contextMenu.show = false;
};
const uploadImageToCell = () => {
  // 设置接受的文件类型
  if (fileInputRef.value) {
    fileInputRef.value.accept = "image/*";
    fileInputRef.value.click();
  }
  // 关闭上下文菜单
  contextMenu.show = false;
};
const uploadFileToCell = () => {
  // 设置接受的文件类型
  if (documentInputRef.value) {
    documentInputRef.value.accept =
      ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
    documentInputRef.value.click();
  }
  // 关闭上下文菜单
  contextMenu.show = false;
};
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  if (!file.type.startsWith("image/")) {
    ElMessage.error("请选择图片文件");
    return;
  }
  // 读取文件为 Data URL
  const reader = new FileReader();
  reader.onload = (e) => {
    if (!e.target?.result) return;
    // 保存历史状态
    saveHistoryState();
    // 获取当前选中的单元格
    const cell = selectedCells.value[0];
    if (!cell) return;
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    // 更新单元格数据为图片
    rows.value[rowIndex].data[columnId] = {
      type: "image",
      value: e.target.result as string,
    };
    // 清除文件输入
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  };
  reader.readAsDataURL(file);
};
const handleDocumentUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  // 读取文件为 Data URL (实际项目中可能需要上传到服务器)
  const reader = new FileReader();
  reader.onload = (e) => {
    if (!e.target?.result) return;
    // 保存历史状态
    saveHistoryState();
    // 获取当前选中的单元格
    const cell = selectedCells.value[0];
    if (!cell) return;
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    // 更新单元格数据为文件
    rows.value[rowIndex].data[columnId] = {
      type: "file",
      value: e.target.result as string,
      fileName: file.name,
    };
    // 清除文件输入
    if (documentInputRef.value) {
      documentInputRef.value.value = "";
    }
  };
  reader.readAsDataURL(file);
};
const handleDrop = (rowIndex: number, colIndex: number, event: DragEvent) => {
  event.preventDefault();
  // 检查是否有文件被拖放
  if (!event.dataTransfer?.files.length) return;
  const file = event.dataTransfer.files[0];
  // 根据文件类型处理
  if (file.type.startsWith("image/")) {
    // 处理图片文件
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      // 保存历史状态
      saveHistoryState();
      const columnId = columns.value[colIndex].id;
      // 更新单元格数据为图片
      rows.value[rowIndex].data[columnId] = {
        type: "image",
        value: e.target.result as string,
      };
    };
    reader.readAsDataURL(file);
  } else {
    // 处理其他文件
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      // 保存历史状态
      saveHistoryState();
      const columnId = columns.value[colIndex].id;
      // 更新单元格数据为文件
      rows.value[rowIndex].data[columnId] = {
        type: "file",
        value: e.target.result as string,
        fileName: file.name,
      };
    };
    reader.readAsDataURL(file);
  }
  // 选中目标单元格
  selectedCells.value = [{ rowIndex, colIndex }];
};
const copySelectedCells = () => {
  if (selectedCells.value.length === 0) return;
  const copyData = selectedCells.value.map((cell: SelectedCell) => {
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    return {
      rowIndex,
      colIndex,
      columnId,
      data: rows.value[rowIndex].data[columnId] || { type: "text", value: "" },
    };
  });
  // 存储到剪贴板数据
  clipboardData.value = {
    type: "cells",
    data: copyData,
  };
  ElMessage.success("已复制选中单元格");
};
const pasteToSelectedCell = () => {
  if (!clipboardData.value || selectedCells.value.length === 0) return;
  // 保存历史状态
  saveHistoryState();
  // 获取目标单元格
  const targetCell = selectedCells.value[0];
  const { rowIndex: targetRow, colIndex: targetCol } = targetCell;
  // 处理粘贴数据
  if (clipboardData.value.type === "cells") {
    // 获取复制数据的范围
    const copyData = clipboardData.value.data;
    const rowOffset = Math.min(...copyData.map((item: any) => item.rowIndex));
    const colOffset = Math.min(...copyData.map((item: any) => item.colIndex));
    // 粘贴数据
    copyData.forEach((item: any) => {
      const newRowIndex = targetRow + (item.rowIndex - rowOffset);
      const newColIndex = targetCol + (item.colIndex - colOffset);
      // 检查目标位置是否有效
      if (
        newRowIndex >= 0 &&
        newRowIndex < rows.value.length &&
        newColIndex >= 0 &&
        newColIndex < columns.value.length
      ) {
        const targetColumnId = columns.value[newColIndex].id;
        // 更新单元格数据
        rows.value[newRowIndex].data[targetColumnId] = { ...item.data };
      }
    });
    ElMessage.success("已粘贴数据");
  }
};
const generateShareLink = () => {
  shareDialog.show = true;
  shareDialog.link = ""; // 清空之前的链接
};
const createShareLink = () => {
  // 生成分享数据
  const shareData = {
    columns: columns.value,
    rows: rows.value,
    permission: shareDialog.permission,
    expiry: shareDialog.expiry,
  };
  // 生成分享链接 (模拟)
  const shareId = Math.random().toString(36).substring(2, 10);
  shareDialog.link = `${window.location.origin}/shared/${shareId}`;
  ElMessage.success("分享链接已生成");
};
const copyShareLink = () => {
  navigator.clipboard
    .writeText(shareDialog.link)
    .then(() => {
      ElMessage.success("链接已复制到剪贴板");
    })
    .catch(() => {
      ElMessage.error("复制失败，请手动复制链接");
    });
};
// 应用文字颜色
const applyTextColor = (colorClass: string) => {
  if (selectedCells.value.length === 0) return;
  // 保存历史状态
  saveHistoryState();
  selectedCells.value.forEach((cell: SelectedCell) => {
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    if (!rows.value[rowIndex].data[columnId]) {
      rows.value[rowIndex].data[columnId] = { type: "text", value: "" };
    }
    rows.value[rowIndex].data[columnId].textColor = colorClass;
  });
};
// 应用背景颜色
const applyBgColor = (colorClass: string) => {
  if (selectedCells.value.length === 0) return;
  // 保存历史状态
  saveHistoryState();
  selectedCells.value.forEach((cell: SelectedCell) => {
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    if (!rows.value[rowIndex].data[columnId]) {
      rows.value[rowIndex].data[columnId] = { type: "text", value: "" };
    }
    rows.value[rowIndex].data[columnId].bgColor = colorClass;
  });
};
// 从上下文菜单应用文字颜色
const applyTextColorFromMenu = (colorClass: string) => {
  // 保存历史状态
  saveHistoryState();
  selectedCells.value.forEach((cell: SelectedCell) => {
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    if (!rows.value[rowIndex].data[columnId]) {
      rows.value[rowIndex].data[columnId] = { type: "text", value: "" };
    }
    rows.value[rowIndex].data[columnId].textColor = colorClass;
  });
  // 关闭上下文菜单
  contextMenu.show = false;
};
// 从上下文菜单应用背景颜色
const applyBgColorFromMenu = (colorClass: string) => {
  // 保存历史状态
  saveHistoryState();
  selectedCells.value.forEach((cell: SelectedCell) => {
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    if (!rows.value[rowIndex].data[columnId]) {
      rows.value[rowIndex].data[columnId] = { type: "text", value: "" };
    }
    rows.value[rowIndex].data[columnId].bgColor = colorClass;
  });
  // 关闭上下文菜单
  contextMenu.show = false;
};
// 清除单元格格式
const clearCellFormat = () => {
  if (selectedCells.value.length === 0) return;
  // 保存历史状态
  saveHistoryState();
  // 清除所有选中单元格的格式
  selectedCells.value.forEach((cell) => {
    const { rowIndex, colIndex } = cell;
    const columnId = columns.value[colIndex].id;
    if (rows.value[rowIndex].data[columnId]) {
      delete rows.value[rowIndex].data[columnId].textColor;
      delete rows.value[rowIndex].data[columnId].bgColor;
    }
  });
};
// 删除选中项
const deleteSelectedItems = () => {
  // 保存历史状态
  saveHistoryState();
  // 删除选中的行
  if (selectedRows.value.length > 0) {
    // 从后往前删除，避免索引变化
    [...selectedRows.value]
      .sort((a, b) => b - a)
      .forEach((rowIndex) => {
        rows.value.splice(rowIndex, 1);
      });
    selectedRows.value = [];
  }
  if (selectedColumns.value.length > 0 && columns.value.length > selectedColumns.value.length) {
    const columnsToDelete = [...selectedColumns.value].sort((a, b) => b - a);
    const columnIdsToDelete = columnsToDelete.map(
      (colIndex) => columns.value[colIndex].id
    );
    // 删除列
    columnsToDelete.forEach((colIndex) => {
      columns.value.splice(colIndex, 1);
    });
    rows.value.forEach((row: Row) => {
      columnIdsToDelete.forEach((columnId) => {
        delete row.data[columnId];
      });
    });
    selectedColumns.value = [];
  }
  // 清除选中的单元格内容
  if (selectedCells.value.length > 0) {
    selectedCells.value.forEach((cell: SelectedCell) => {
      const { rowIndex, colIndex } = cell;
      const columnId = columns.value[colIndex].id;
      if (rows.value[rowIndex].data[columnId]) {
        rows.value[rowIndex].data[columnId] = { type: "text", value: "" };
      }
    });
  }
};
// 历史记录管理
const saveHistoryState = () => {
  // 创建当前状态的深拷贝
  const currentState: HistoryState = {
    columns: JSON.parse(JSON.stringify(columns.value)),
    rows: JSON.parse(JSON.stringify(rows.value)),
  };
  if (historyIndex.value >= 0 && historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1);
  }
  // 添加新的历史记录
  history.value.push(currentState);
  historyIndex.value = history.value.length - 1;
  // 限制历史记录数量
  if (history.value.length > 50) {
    history.value.shift();
    historyIndex.value--;
  }
};
const undoAction = () => {
  if (!canUndo.value) return;
  // 移动到上一个历史状态
  historyIndex.value--;
  // 恢复状态
  const state = history.value[historyIndex.value];
  columns.value = JSON.parse(JSON.stringify(state.columns));
  rows.value = JSON.parse(JSON.stringify(state.rows));
  // 清除选择
  selectedCells.value = [];
  selectedRows.value = [];
  selectedColumns.value = [];
};
const redoAction = () => {
  if (!canRedo.value) return;
  // 移动到下一个历史状态
  historyIndex.value++;
  // 恢复状态
  const state = history.value[historyIndex.value];
  columns.value = JSON.parse(JSON.stringify(state.columns));
  rows.value = JSON.parse(JSON.stringify(state.rows));
  // 清除选择
  selectedCells.value = [];
  selectedRows.value = [];
  selectedColumns.value = [];
};
// 初始化
onMounted(() => {
  // 保存初始状态
  saveHistoryState();
  // 点击页面其他区域关闭上下文菜单
  document.addEventListener("click", () => {
    contextMenu.show = false;
  });
  // 监听键盘事件
  document.addEventListener("keydown", (event) => {
    // Esc 键取消编辑
    if (event.key === "Escape" && editingCell.value) {
      cancelEdit();
    }
    // Ctrl+Z 撤销
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      undoAction();
    }
    // Ctrl+Y 或 Ctrl+Shift+Z 重做
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === "y" || (event.key === "z" && event.shiftKey))
    ) {
      event.preventDefault();
      redoAction();
    }
    // Ctrl+C 复制
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "c" &&
      selectedCells.value.length > 0
    ) {
      event.preventDefault();
      copySelectedCells();
    }
    // Ctrl+V 粘贴
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "v" &&
      clipboardData.value &&
      selectedCells.value.length > 0
    ) {
      event.preventDefault();
      pasteToSelectedCell();
    }
    // Delete 或 Backspace 清除选中单元格内容
    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      !editingCell.value
    ) {
      if (
        selectedCells.value.length > 0 ||
        selectedRows.value.length > 0 ||
        selectedColumns.value.length > 0
      ) {
        event.preventDefault();
        deleteSelectedItems();
      }
    }
  });
});
</script>
    <style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  min-height: 600px;
}
table {
  table-layout: fixed;
}
th,
td {
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
th {
  height: 48px;
}
td {
  height: 60px;
}
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 1;
}
.resize-handle:hover {
  background-color: #3b82f6;
}
th:hover .resize-handle {
  background-color: rgba(59, 130, 246, 0.5);
}
.selected-cell {
  background-color: rgba(59, 130, 246, 0.1);
  outline: 2px solid #3b82f6;
}
.selected-row td {
  background-color: rgba(59, 130, 246, 0.1);
}
.selected-column {
  background-color: rgba(59, 130, 246, 0.1);
}
.cell-content {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.image-cell {
  padding: 2px;
}
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  min-width: 180px;
}
.context-menu-item {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #4b5563;
}
.context-menu-item:hover {
  background-color: #f3f4f6;
}
.context-menu-item.disabled {
  color: #9ca3af;
  cursor: not-allowed;
}
.context-menu-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 4px 0;
}
</style>
    