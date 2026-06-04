<script setup lang="ts">
import { useProjectStore } from "@/stores/project";
import type { Task } from "@/stores/project";
import { ref, computed } from "vue";

// @vue/component
import {
  Plus,
  Edit,
  Delete,
  Search,
  Filter,
  Sort,
  List,
  Grid,
  Folder,
  User,
  Calendar,
  Share,
  ArrowDown,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

// 使用 useStore 获取 store 实例
const store = useProjectStore();

// 视图状态
const viewMode = ref<"list" | "board">("list");

// 对话框状态
const showNewProjectDialog = ref(false);
const showAddColumnDialog = ref(false);
const showAddTaskDialog = ref(false);
const showShareDialog = ref(false);

// 从 store 中获取方法
const selectProject = (project: Project) => {
  store.selectProject(project);
};

const projects = ref(store.projects);
// 从 store 中获取状态
const emptyStateImage = computed(() => store.emptyStateImage);
const teamMembers = computed(() => store.teamMembers);
const currentProject = computed(() => store.currentProject);
const searchQuery = computed({
  get: () => store.searchQuery,
  set: (value) => (store.searchQuery = value),
});
const selectedTasks = computed(() => store.selectedTasks);
const newProject = computed({
  get: () => store.newProject,
  set: (value) => (store.newProject = value),
});
const newColumn = computed({
  get: () => store.newColumn,
  set: (value) => (store.newColumn = value),
});
const newTask = computed({
  get: () => store.newTask,
  set: (value) => (store.newTask = value),
});
const shareSettings = computed({
  get: () => store.shareSettings,
  set: (value) => (store.shareSettings = value),
});
const shareLink = computed(() => store.shareLink);
const editingTask = computed(() => store.editingTask);
const statusColumns = computed(() => store.statusColumns);
const filteredTasks = computed(() => store.filteredTasks);
const isAllSelected = computed(() => store.isAllSelected);

// 方法
const handleCreateProject = () => {
  store.createProject();
  showNewProjectDialog.value = false;
};

const handleAddColumn = () => {
  store.addColumn();
  showAddColumnDialog.value = false;
};

const handleSaveTask = () => {
  store.saveTask();
  showAddTaskDialog.value = false;
};

const handleFilterTasks = (
  filter: "all" | "pending" | "inProgress" | "completed" | "delayed"
) => {
  store.filterTasks(filter);
};

const handleSortTasks = (sort: "dateCreated" | "dueDate" | "priority") => {
  store.sortTasks(sort);
};

const handleToggleTaskSelection = (taskId: number) => {
  store.toggleTaskSelection(taskId);
};

const handleToggleSelectAll = () => {
  store.toggleSelectAll();
};

const handleDeleteTask = (taskId: number) => {
  store.deleteTask(taskId);
};

const handleEditTask = (task: Task) => {
  store.editTask(task);
  showAddTaskDialog.value = true;
};

const handleGenerateShareLink = () => {
  store.generateShareLink();
  showShareDialog.value = false;
};

const handleCopyShareLink = () => {
  store.copyShareLink();
};

const handleDragStart = (event: DragEvent, task: Task) => {
  store.onDragStart(event, task);
};

const handleDrop = (
  event: DragEvent,
  status: "pending" | "inProgress" | "completed" | "delayed"
) => {
  store.onDrop(event, status);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "未设置";
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const getColumnName = (columnId: string) => {
  if (!currentProject.value) return "";
  const column = currentProject.value.columns.find(
    (col) => col.id === columnId
  );
  return column ? column.name : "";
};

const getTasksByStatus = (status: Task["status"]) => {
  return filteredTasks.value.filter((task) => task.status === status);
};

const getTeamMemberById = (id: number) => {
  return (
    teamMembers.value.find((member) => member.id === id) || {
      name: "未知",
      avatar: "",
    }
  );
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航栏 -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex items-center">
          <h1 class="text-xl font-semibold text-gray-800">
            {{ currentProject?.name || "我的项目" }}
          </h1>
        </div>
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input type="text" placeholder="搜索任务..." v-model="searchQuery"
              class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <el-icon class="absolute left-3 top-2.5 text-gray-400">
              <Search />
            </el-icon>
          </div>
          <el-button type="primary" @click="showNewProjectDialog = true" class="!rounded-button whitespace-nowrap">
            <el-icon class="mr-1">
              <Plus />
            </el-icon>新建项目
          </el-button>
          <div class="flex items-center border border-gray-300 rounded-lg p-1">
            <button @click="viewMode = 'list'" :class="[
              'px-3 py-1.5 rounded-md cursor-pointer whitespace-nowrap',
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600',
            ]">
              <el-icon class="mr-1">
                <List />
              </el-icon>列表
            </button>
            <button @click="viewMode = 'board'" :class="[
              'px-3 py-1.5 rounded-md cursor-pointer whitespace-nowrap',
              viewMode === 'board'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600',
            ]">
              <el-icon class="mr-1">
                <Grid />
              </el-icon>看板
            </button>
          </div>
          <el-dropdown trigger="click">
            <el-button class="!rounded-button whitespace-nowrap">
              <el-icon class="mr-1">
                <Filter />
              </el-icon>筛选
              <el-icon class="ml-1">
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleFilterTasks('all')">全部任务</el-dropdown-item>
                <el-dropdown-item @click="handleFilterTasks('pending')">待处理</el-dropdown-item>
                <el-dropdown-item @click="handleFilterTasks('inProgress')">进行中</el-dropdown-item>
                <el-dropdown-item @click="handleFilterTasks('completed')">已完成</el-dropdown-item>
                <el-dropdown-item @click="handleFilterTasks('delayed')">已延期</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click">
            <el-button class="!rounded-button whitespace-nowrap">
              <el-icon class="mr-1">
                <Sort />
              </el-icon>排序
              <el-icon class="ml-1">
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleSortTasks('dateCreated')">创建时间</el-dropdown-item>
                <el-dropdown-item @click="handleSortTasks('dueDate')">截止日期</el-dropdown-item>
                <el-dropdown-item @click="handleSortTasks('priority')">优先级</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>
    <div class="flex h-[calc(100vh-4rem)]">
      <!-- 左侧导航栏 -->
      <aside class="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center space-x-3">
            <!-- <img
              :src="userAvatar"
              alt="用户头像"
              class="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p class="font-medium text-gray-800">{{ userName }}</p>
              <p class="text-sm text-gray-500">项目管理员</p>
            </div> -->
          </div>
        </div>
        <nav class="mt-4 px-2">
          <div class="mb-4">
            <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">项目</h3>
            <div class="mt-2 space-y-1">
              <button
                v-for="project in projects"
                :key="project.id"
                @click="selectProject(project)"
                :class="[
                  'flex items-center w-full px-3 py-2 text-sm rounded-md cursor-pointer whitespace-nowrap',
                  currentProject && currentProject.id === project.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                <el-icon class="mr-2"><Folder /></el-icon>
                {{ project.name }}
              </button>
            </div>
          </div>
          <!-- <div class="mb-4">
            <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">视图</h3>
            <div class="mt-2 space-y-1">
              <button
                class="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer whitespace-nowrap"
              >
                <el-icon class="mr-2"><User /></el-icon>
                我的任务
              </button>
              <button
                class="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer whitespace-nowrap"
              >
                <el-icon class="mr-2"><Calendar /></el-icon>
                日历视图
              </button>
            </div>
          </div> -->
          <div class="mb-4">
            <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">供应商</h3>
            <div class="mt-2 space-y-1">
              <button
                v-for="member in teamMembers"
                :key="member.id"
                class="flex items-center w-full px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer whitespace-nowrap"
              >
                <img
                  :src="member.avatar"
                  alt="成员头像"
                  class="w-6 h-6 rounded-full mr-2 object-cover"
                />
                {{ member.name }}
              </button>
            </div>
          </div>
        </nav>
      </aside>
    <!-- 主要内容区域 -->
    <main class="flex-1 overflow-auto bg-gray-50 p-6">
      <div v-if="!currentProject" class="flex flex-col items-center justify-center h-full">
        <img :src="emptyStateImage" alt="选择或创建项目" class="w-64 h-64 object-contain mb-6" />
        <h2 class="text-xl font-medium text-gray-700 mb-2">还没有选择项目</h2>
        <p class="text-gray-500 mb-4">请选择一个项目或创建新项目开始工作</p>
        <el-button type="primary" @click="showNewProjectDialog = true" class="!rounded-button whitespace-nowrap">
          <el-icon class="mr-1">
            <Plus />
          </el-icon>创建新项目
        </el-button>
      </div>

      <div v-else>
        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="bg-white rounded-lg shadow">
          <div class="p-4 border-b border-gray-200 flex justify-between items-center">
            <div class="flex items-center space-x-4">
              <h2 class="text-lg font-medium text-gray-800">任务列表</h2>
              <span class="text-sm text-gray-500">{{ filteredTasks.length }} 个任务</span>
            </div>
            <div class="flex items-center space-x-2">
              <el-button type="primary" @click="showAddTaskDialog = true" class="!rounded-button whitespace-nowrap">
                <el-icon class="mr-1">
                  <Plus />
                </el-icon>添加任务
              </el-button>
              <el-button @click="showAddColumnDialog = true" class="!rounded-button whitespace-nowrap">
                <el-icon class="mr-1">
                  <Plus />
                </el-icon>添加列
              </el-button>
              <el-button v-if="selectedTasks.length > 0" @click="showShareDialog = true"
                class="!rounded-button whitespace-nowrap">
                <el-icon class="mr-1">
                  <Share />
                </el-icon>分享
              </el-button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input type="checkbox" :checked="isAllSelected" @change="handleToggleSelectAll"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                  </th>
                  <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任务名称
                  </th>
                  <th v-for="column in currentProject.columns" :key="column.id" scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {{ column.name }}
                  </th>
                  <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <!-- <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    截止日期
                  </th> -->
                  <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="task in filteredTasks" :key="task.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" :checked="selectedTasks.includes(task.id)"
                      @change="handleToggleTaskSelection(task.id)"
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer" />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">
                      {{ task.name }}
                    </div>
                  </td>
                  <td v-for="column in currentProject.columns" :key="column.id" class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">
                      {{ task.columnValues[column.id] || "-" }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="[
                      'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                      task.status === 'pending'
                        ? 'bg-gray-100 text-gray-800'
                        : task.status === 'inProgress'
                          ? 'bg-blue-100 text-blue-800'
                          : task.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800',
                    ]">
                      {{
                        task.status === "pending"
                          ? "待处理"
                          : task.status === "inProgress"
                            ? "进行中"
                            : task.status === "completed"
                              ? "已完成"
                              : "已延期"
                      }}
                    </span>
                  </td>
                  <!-- <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <img v-if="task.assignee" :src="getTeamMemberById(task.assignee).avatar" alt="负责人头像"
                        class="h-6 w-6 rounded-full object-cover" />
                      <span class="ml-2 text-sm text-gray-500">{{
                        task.assignee
                          ? getTeamMemberById(task.assignee).name
                          : "未分配"
                      }}</span>
                    </div>
                  </td> -->
                  <!-- <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">
                      {{ formatDate(task.dueDate) }}
                    </div>
                  </td> -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex space-x-2">
                      <button @click="handleEditTask(task)" class="text-blue-600 hover:text-blue-900 cursor-pointer">
                        <el-icon>
                          <Edit />
                        </el-icon>
                      </button>
                      <button @click="handleDeleteTask(task.id)" class="text-red-600 hover:text-red-900 cursor-pointer">
                        <el-icon>
                          <Delete />
                        </el-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 看板视图 -->
        <div v-else-if="viewMode === 'board'" class="h-full">
          <div class="mb-4 flex justify-between items-center">
            <h2 class="text-lg font-medium text-gray-800">任务看板</h2>
            <div class="flex space-x-2">
              <el-button type="primary" @click="showAddTaskDialog = true" class="!rounded-button whitespace-nowrap">
                <el-icon class="mr-1">
                  <Plus />
                </el-icon>添加任务
              </el-button>
              <el-button v-if="selectedTasks.length > 0" @click="showShareDialog = true"
                class="!rounded-button whitespace-nowrap">
                <el-icon class="mr-1">
                  <Share />
                </el-icon>分享
              </el-button>
            </div>
          </div>


          <div class="flex space-x-4 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
            <div v-for="status in statusColumns" :key="status.value"
              class="bg-gray-100 rounded-lg p-3 min-w-[300px] max-w-[300px] flex flex-col">
              <div class="flex items-center justify-between mb-3">
                <h3 :class="[
                  'font-medium text-sm px-2 py-1 rounded-md',
                  status.value === 'pending'
                    ? 'bg-gray-200 text-gray-700'
                    : status.value === 'inProgress'
                      ? 'bg-blue-100 text-blue-700'
                      : status.value === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700',
                ]">
                  {{ status.label }}
                </h3>
                <span class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {{ getTasksByStatus(status.value).length }}
                </span>
              </div>
              <div class="overflow-y-auto flex-1">
                <div v-for="task in getTasksByStatus(status.value)" :key="task.id"
                  class="bg-white p-3 rounded-lg shadow-sm mb-2 cursor-pointer" @click="handleEditTask(task)"
                  draggable="true" @dragstart="handleDragStart($event, task)" @dragover.prevent
                  @drop="handleDrop($event, status.value)">
                  <div class="flex justify-between items-start mb-2">
                    <h4 class="font-medium text-gray-800">{{ task.name }}</h4>
                    <input type="checkbox" :checked="selectedTasks.includes(task.id)"
                      @change="handleToggleTaskSelection(task.id)" @click.stop
                      class="h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer" />
                  </div>

                  <div v-if="
                    task.columnValues &&
                    Object.keys(task.columnValues).length > 0
                  " class="mb-2">
                    <div v-for="(value, columnId) in task.columnValues" :key="columnId"
                      class="text-xs text-gray-500 mb-1">
                      <span class="font-medium">{{ getColumnName(columnId) }}:</span>
                      {{ value }}
                    </div>
                  </div>

                  <div class="flex justify-between items-center mt-2">
                    <div class="flex items-center">
                      <img v-if="task.assignee" :src="getTeamMemberById(task.assignee).avatar" alt="负责人头像"
                        class="h-6 w-6 rounded-full object-cover" />
                      <span v-else class="text-xs text-gray-500">未分配</span>
                    </div>
                    <span class="text-xs text-gray-500">{{
                      formatDate(task.dueDate)
                      }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    </div>
    <!-- 新建项目对话框 -->
    <el-dialog v-model="showNewProjectDialog" title="新建项目" width="500px" :close-on-click-modal="false">
      <el-form :model="newProject" label-position="top">
        <el-form-item label="项目名称">
          <el-input v-model="newProject.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input v-model="newProject.description" type="textarea" rows="3" placeholder="请输入项目描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showNewProjectDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="handleCreateProject"
            class="!rounded-button whitespace-nowrap">创建</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加列对话框 -->
    <el-dialog v-model="showAddColumnDialog" title="添加列" width="500px" :close-on-click-modal="false">
      <el-form :model="newColumn" label-position="top">
        <el-form-item label="列名称">
          <el-input v-model="newColumn.name" placeholder="请输入列名称" />
        </el-form-item>
        <el-form-item label="列类型">
          <el-select v-model="newColumn.type" placeholder="请选择列类型" class="w-full">
            <el-option label="文本" value="text" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="选择" value="select" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="newColumn.type === 'select'" label="选项值">
          <div v-for="(option, index) in newColumn.options" :key="index" class="flex mb-2">
            <el-input v-model="newColumn.options[index]" placeholder="选项值" class="mr-2" />
            <el-button @click="newColumn.options.splice(index, 1)" type="danger" icon="Delete" circle
              class="!rounded-button whitespace-nowrap" />
          </div>
          <el-button @click="newColumn.options.push('')" class="!rounded-button whitespace-nowrap">
            <el-icon class="mr-1">
              <Plus />
            </el-icon>添加选项
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddColumnDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="handleAddColumn" class="!rounded-button whitespace-nowrap">添加</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加/编辑任务对话框 -->
    <el-dialog v-model="showAddTaskDialog" :title="editingTask ? '编辑任务' : '添加任务'" width="600px"
      :close-on-click-modal="false">
      <el-form :model="newTask" label-position="top">
        <el-form-item label="任务名称">
          <el-input v-model="newTask.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input v-model="newTask.description" type="textarea" rows="3" placeholder="请输入任务描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="newTask.status" placeholder="请选择状态" class="w-full">
            <el-option label="待处理" value="pending" />
            <el-option label="进行中" value="inProgress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已延期" value="delayed" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="newTask.assignee" placeholder="请选择负责人" class="w-full">
            <el-option v-for="member in teamMembers" :key="member.id" :label="member.name" :value="member.id">
              <div class="flex items-center">
                <img :src="member.avatar" alt="成员头像" class="w-6 h-6 rounded-full mr-2 object-cover" />
                <span>{{ member.name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="newTask.dueDate" type="date" placeholder="选择截止日期" class="w-full" />
        </el-form-item>
        <div v-if="currentProject && currentProject.columns.length > 0">
          <h3 class="text-sm font-medium text-gray-700 mb-3">自定义字段</h3>
          <el-form-item v-for="column in currentProject.columns" :key="column.id" :label="column.name">
            <el-input v-if="column.type === 'text'" v-model="newTask.columnValues[column.id]"
              :placeholder="`请输入${column.name}`" />
            <el-input-number v-else-if="column.type === 'number'" v-model="newTask.columnValues[column.id]"
              :placeholder="`请输入${column.name}`" class="w-full" />
            <el-date-picker v-else-if="column.type === 'date'" v-model="newTask.columnValues[column.id]" type="date"
              :placeholder="`请选择${column.name}`" class="w-full" />
            <el-select v-else-if="column.type === 'select'" v-model="newTask.columnValues[column.id]"
              :placeholder="`请选择${column.name}`" class="w-full">
              <el-option v-for="option in column.options" :key="option" :label="option" :value="option" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddTaskDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="handleSaveTask" class="!rounded-button whitespace-nowrap">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分享任务对话框 -->
    <el-dialog v-model="showShareDialog" title="分享任务" width="500px" :close-on-click-modal="false">
      <div v-if="selectedTasks.length === 0" class="text-center py-4">
        <p class="text-gray-500">请先选择要分享的任务</p>
      </div>
      <div v-else>
        <p class="mb-4">已选择 {{ selectedTasks.length }} 个任务进行分享</p>
        <el-form :model="shareSettings" label-position="top">
          <el-form-item label="设置访问密码">
            <el-input v-model="shareSettings.password" placeholder="请输入访问密码" show-password />
          </el-form-item>
          <el-form-item label="选择负责人">
            <el-select v-model="shareSettings.assignee" placeholder="请选择负责人" class="w-full">
              <el-option v-for="member in teamMembers" :key="member.id" :label="member.name" :value="member.id">
                <div class="flex items-center">
                  <img :src="member.avatar" alt="成员头像" class="w-6 h-6 rounded-full mr-2 object-cover" />
                  <span>{{ member.name }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="链接有效期">
            <el-radio-group v-model="shareSettings.expiration">
              <el-radio label="1">1 天</el-radio>
              <el-radio label="7">7 天</el-radio>
              <el-radio label="30">30 天</el-radio>
              <el-radio label="0">永久</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <div v-if="shareLink" class="mt-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex justify-between items-center">
            <p class="text-gray-700 text-sm break-all">{{ shareLink }}</p>
            <el-button @click="handleCopyShareLink" type="primary" class="ml-2 !rounded-button whitespace-nowrap">
              复制
            </el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showShareDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="handleGenerateShareLink" class="!rounded-button whitespace-nowrap">
            {{ shareLink ? "更新链接" : "生成链接" }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>