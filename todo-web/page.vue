<!-- The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work. -->

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航栏 -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="flex items-center justify-between h-16 px-6">
        <div class="flex items-center">
          <h1 class="text-xl font-semibold text-gray-800">{{ currentProject ? currentProject.name : '我的项目' }}</h1>
        </div>
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input
              type="text"
              placeholder="搜索任务..."
              v-model="searchQuery"
              class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <el-icon class="absolute left-3 top-2.5 text-gray-400">
              <Search />
            </el-icon>
          </div>
          <el-button type="primary" @click="showNewProjectDialog = true" class="!rounded-button whitespace-nowrap">
            <el-icon class="mr-1"><Plus /></el-icon>新建项目
          </el-button>
          <div class="flex items-center border border-gray-300 rounded-lg p-1">
            <button
              @click="viewMode = 'list'"
              :class="[
                'px-3 py-1.5 rounded-md cursor-pointer whitespace-nowrap',
                viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600'
              ]"
            >
              <el-icon class="mr-1"><List /></el-icon>列表
            </button>
            <button
              @click="viewMode = 'board'"
              :class="[
                'px-3 py-1.5 rounded-md cursor-pointer whitespace-nowrap',
                viewMode === 'board' ? 'bg-blue-500 text-white' : 'text-gray-600'
              ]"
            >
              <el-icon class="mr-1"><Grid /></el-icon>看板
            </button>
          </div>
          <el-dropdown trigger="click">
            <el-button class="!rounded-button whitespace-nowrap">
              <el-icon class="mr-1"><Filter /></el-icon>筛选
              <el-icon class="ml-1"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="filterTasks('all')">全部任务</el-dropdown-item>
                <el-dropdown-item @click="filterTasks('pending')">待处理</el-dropdown-item>
                <el-dropdown-item @click="filterTasks('inProgress')">进行中</el-dropdown-item>
                <el-dropdown-item @click="filterTasks('completed')">已完成</el-dropdown-item>
                <el-dropdown-item @click="filterTasks('delayed')">已延期</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown trigger="click">
            <el-button class="!rounded-button whitespace-nowrap">
              <el-icon class="mr-1"><Sort /></el-icon>排序
              <el-icon class="ml-1"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="sortTasks('dateCreated')">创建时间</el-dropdown-item>
                <el-dropdown-item @click="sortTasks('dueDate')">截止日期</el-dropdown-item>
                <el-dropdown-item @click="sortTasks('priority')">优先级</el-dropdown-item>
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
            <img
              :src="userAvatar"
              alt="用户头像"
              class="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p class="font-medium text-gray-800">{{ userName }}</p>
              <p class="text-sm text-gray-500">项目管理员</p>
            </div>
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
          <div class="mb-4">
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
          </div>
          <div class="mb-4">
            <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">团队</h3>
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
          <img
            :src="emptyStateImage"
            alt="选择或创建项目"
            class="w-64 h-64 object-contain mb-6"
          />
          <h2 class="text-xl font-medium text-gray-700 mb-2">还没有选择项目</h2>
          <p class="text-gray-500 mb-4">请从左侧选择一个项目或创建新项目开始工作</p>
          <el-button type="primary" @click="showNewProjectDialog = true" class="!rounded-button whitespace-nowrap">
            <el-icon class="mr-1"><Plus /></el-icon>创建新项目
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
                  <el-icon class="mr-1"><Plus /></el-icon>添加任务
                </el-button>
                <el-button @click="showAddColumnDialog = true" class="!rounded-button whitespace-nowrap">
                  <el-icon class="mr-1"><Plus /></el-icon>添加列
                </el-button>
                <el-button v-if="selectedTasks.length > 0" @click="showShareDialog = true" class="!rounded-button whitespace-nowrap">
                  <el-icon class="mr-1"><Share /></el-icon>分享
                </el-button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        :checked="isAllSelected"
                        @change="toggleSelectAll"
                        class="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      任务名称
                    </th>
                    <th
                      v-for="column in currentProject.columns"
                      :key="column.id"
                      scope="col"
                      class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {{ column.name }}
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      负责人
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      截止日期
                    </th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="task in filteredTasks" :key="task.id" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        :checked="selectedTasks.includes(task.id)"
                        @change="toggleTaskSelection(task.id)"
                        class="h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">{{ task.name }}</div>
                    </td>
                    <td
                      v-for="column in currentProject.columns"
                      :key="column.id"
                      class="px-6 py-4 whitespace-nowrap"
                    >
                      <div class="text-sm text-gray-500">{{ task.columnValues[column.id] || '-' }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span
                        :class="[
                          'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                          task.status === 'pending' ? 'bg-gray-100 text-gray-800' : 
                          task.status === 'inProgress' ? 'bg-blue-100 text-blue-800' : 
                          task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          'bg-red-100 text-red-800'
                        ]"
                      >
                        {{ 
                          task.status === 'pending' ? '待处理' : 
                          task.status === 'inProgress' ? '进行中' : 
                          task.status === 'completed' ? '已完成' : '已延期'
                        }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img
                          v-if="task.assignee"
                          :src="getTeamMemberById(task.assignee).avatar"
                          alt="负责人头像"
                          class="h-6 w-6 rounded-full object-cover"
                        />
                        <span class="ml-2 text-sm text-gray-500">{{ task.assignee ? getTeamMemberById(task.assignee).name : '未分配' }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-500">{{ formatDate(task.dueDate) }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div class="flex space-x-2">
                        <button @click="editTask(task)" class="text-blue-600 hover:text-blue-900 cursor-pointer">
                          <el-icon><Edit /></el-icon>
                        </button>
                        <button @click="deleteTask(task.id)" class="text-red-600 hover:text-red-900 cursor-pointer">
                          <el-icon><Delete /></el-icon>
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
                  <el-icon class="mr-1"><Plus /></el-icon>添加任务
                </el-button>
                <el-button v-if="selectedTasks.length > 0" @click="showShareDialog = true" class="!rounded-button whitespace-nowrap">
                  <el-icon class="mr-1"><Share /></el-icon>分享
                </el-button>
              </div>
            </div>
            <div class="flex space-x-4 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
              <div
                v-for="status in statusColumns"
                :key="status.value"
                class="bg-gray-100 rounded-lg p-3 min-w-[300px] max-w-[300px] flex flex-col"
              >
                <div class="flex items-center justify-between mb-3">
                  <h3 
                    :class="[
                      'font-medium text-sm px-2 py-1 rounded-md',
                      status.value === 'pending' ? 'bg-gray-200 text-gray-700' :
                      status.value === 'inProgress' ? 'bg-blue-100 text-blue-700' :
                      status.value === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    ]"
                  >
                    {{ status.label }}
                  </h3>
                  <span class="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {{ getTasksByStatus(status.value).length }}
                  </span>
                </div>
                <div class="overflow-y-auto flex-1">
                  <div
                    v-for="task in getTasksByStatus(status.value)"
                    :key="task.id"
                    class="bg-white p-3 rounded-lg shadow-sm mb-2 cursor-pointer"
                    @click="editTask(task)"
                    draggable="true"
                    @dragstart="onDragStart($event, task)"
                    @dragover.prevent
                    @drop="onDrop($event, status.value)"
                  >
                    <div class="flex justify-between items-start mb-2">
                      <h4 class="font-medium text-gray-800">{{ task.name }}</h4>
                      <input
                        type="checkbox"
                        :checked="selectedTasks.includes(task.id)"
                        @change="toggleTaskSelection(task.id)"
                        @click.stop
                        class="h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                    <div v-if="task.columnValues && Object.keys(task.columnValues).length > 0" class="mb-2">
                      <div
                        v-for="(value, columnId) in task.columnValues"
                        :key="columnId"
                        class="text-xs text-gray-500 mb-1"
                      >
                        <span class="font-medium">{{ getColumnName(columnId) }}:</span> {{ value }}
                      </div>
                    </div>
                    <div class="flex justify-between items-center mt-2">
                      <div class="flex items-center">
                        <img
                          v-if="task.assignee"
                          :src="getTeamMemberById(task.assignee).avatar"
                          alt="负责人头像"
                          class="h-6 w-6 rounded-full object-cover"
                        />
                        <span v-else class="text-xs text-gray-500">未分配</span>
                      </div>
                      <span class="text-xs text-gray-500">{{ formatDate(task.dueDate) }}</span>
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
    <el-dialog
      v-model="showNewProjectDialog"
      title="新建项目"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="newProject" label-position="top">
        <el-form-item label="项目名称">
          <el-input v-model="newProject.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input
            v-model="newProject.description"
            type="textarea"
            rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showNewProjectDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="createProject" class="!rounded-button whitespace-nowrap">创建</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加列对话框 -->
    <el-dialog
      v-model="showAddColumnDialog"
      title="添加列"
      width="500px"
      :close-on-click-modal="false"
    >
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
            <el-button
              @click="newColumn.options.splice(index, 1)"
              type="danger"
              icon="Delete"
              circle
              class="!rounded-button whitespace-nowrap"
            />
          </div>
          <el-button @click="newColumn.options.push('')" class="!rounded-button whitespace-nowrap">
            <el-icon class="mr-1"><Plus /></el-icon>添加选项
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddColumnDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="addColumn" class="!rounded-button whitespace-nowrap">添加</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加/编辑任务对话框 -->
    <el-dialog
      v-model="showAddTaskDialog"
      :title="editingTask ? '编辑任务' : '添加任务'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="newTask" label-position="top">
        <el-form-item label="任务名称">
          <el-input v-model="newTask.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input
            v-model="newTask.description"
            type="textarea"
            rows="3"
            placeholder="请输入任务描述"
          />
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
            <el-option
              v-for="member in teamMembers"
              :key="member.id"
              :label="member.name"
              :value="member.id"
            >
              <div class="flex items-center">
                <img :src="member.avatar" alt="成员头像" class="w-6 h-6 rounded-full mr-2 object-cover" />
                <span>{{ member.name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="newTask.dueDate"
            type="date"
            placeholder="选择截止日期"
            class="w-full"
          />
        </el-form-item>
        <div v-if="currentProject && currentProject.columns.length > 0">
          <h3 class="text-sm font-medium text-gray-700 mb-3">自定义字段</h3>
          <el-form-item
            v-for="column in currentProject.columns"
            :key="column.id"
            :label="column.name"
          >
            <el-input
              v-if="column.type === 'text'"
              v-model="newTask.columnValues[column.id]"
              :placeholder="`请输入${column.name}`"
            />
            <el-input-number
              v-else-if="column.type === 'number'"
              v-model="newTask.columnValues[column.id]"
              :placeholder="`请输入${column.name}`"
              class="w-full"
            />
            <el-date-picker
              v-else-if="column.type === 'date'"
              v-model="newTask.columnValues[column.id]"
              type="date"
              :placeholder="`请选择${column.name}`"
              class="w-full"
            />
            <el-select
              v-else-if="column.type === 'select'"
              v-model="newTask.columnValues[column.id]"
              :placeholder="`请选择${column.name}`"
              class="w-full"
            >
              <el-option
                v-for="option in column.options"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddTaskDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="saveTask" class="!rounded-button whitespace-nowrap">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分享任务对话框 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享任务"
      width="500px"
      :close-on-click-modal="false"
    >
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
              <el-option
                v-for="member in teamMembers"
                :key="member.id"
                :label="member.name"
                :value="member.id"
              >
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
            <el-button
              @click="copyShareLink"
              type="primary"
              class="ml-2 !rounded-button whitespace-nowrap"
            >
              复制
            </el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showShareDialog = false" class="!rounded-button whitespace-nowrap">取消</el-button>
          <el-button type="primary" @click="generateShareLink" class="!rounded-button whitespace-nowrap">
            {{ shareLink ? '更新链接' : '生成链接' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
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
  ArrowDown 
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 用户信息
const userName = ref('张明');
const userAvatar = ref('https://public.readdy.ai/ai/img_res/c290d610bfbdb42c370c9cfddc1593b7.jpg');

// 团队成员
const teamMembers = ref([
  { 
    id: 1, 
    name: '张明', 
    avatar: 'https://public.readdy.ai/ai/img_res/16759be1f8d2ee8d7cb08f2758ed2a72.jpg' 
  },
  { 
    id: 2, 
    name: '李华', 
    avatar: 'https://public.readdy.ai/ai/img_res/b654ae3362194b94470223788fded08a.jpg' 
  },
  { 
    id: 3, 
    name: '王刚', 
    avatar: 'https://public.readdy.ai/ai/img_res/8be0c36cab81de95e229dad23907b989.jpg' 
  },
  { 
    id: 4, 
    name: '赵敏', 
    avatar: 'https://public.readdy.ai/ai/img_res/4baeaeed5cf24cc65df3a4edbd81ab2e.jpg' 
  }
]);

// 空状态图片
const emptyStateImage = ref('https://public.readdy.ai/ai/img_res/f55060b0f3db3d0cf7ee3105ef4698ca.jpg');

// 项目数据
const projects = ref([
  {
    id: 1,
    name: '服饰纺织面料 TODO List 项目一',
    description: '对公司官网进行全面重构，提升用户体验和性能',
    columns: [
      { id: 'priority', name: '优先级', type: 'select', options: ['低', '中', '高'] },
      { id: 'difficulty', name: '难度', type: 'select', options: ['简单', '中等', '复杂'] },
      { id: 'estimatedHours', name: '预计工时', type: 'number' }
    ],
    tasks: [
      {
        id: 1,
        name: '首页设计',
        description: '设计新版首页布局和视觉效果',
        status: 'completed',
        assignee: 2,
        dueDate: '2025-04-10',
        columnValues: {
          priority: '高',
          difficulty: '中等',
          estimatedHours: 8
        }
      },
      {
        id: 2,
        name: '用户认证系统开发',
        description: '实现新的用户登录和注册功能',
        status: 'inProgress',
        assignee: 1,
        dueDate: '2025-04-15',
        columnValues: {
          priority: '高',
          difficulty: '复杂',
          estimatedHours: 24
        }
      },
      {
        id: 3,
        name: '性能优化',
        description: '提升网站加载速度和响应性能',
        status: 'pending',
        assignee: 3,
        dueDate: '2025-04-20',
        columnValues: {
          priority: '中',
          difficulty: '复杂',
          estimatedHours: 16
        }
      },
      {
        id: 4,
        name: '移动端适配',
        description: '确保网站在各种移动设备上正常显示',
        status: 'delayed',
        assignee: 4,
        dueDate: '2025-04-08',
        columnValues: {
          priority: '高',
          difficulty: '中等',
          estimatedHours: 12
        }
      }
    ]
  },
  {
    id: 2,
    name: '产品发布计划',
    description: '新产品上线前的各项准备工作',
    columns: [
      { id: 'department', name: '负责部门', type: 'select', options: ['研发', '市场', '设计', '运营'] },
      { id: 'budget', name: '预算', type: 'number' }
    ],
    tasks: [
      {
        id: 1,
        name: '市场调研',
        description: '收集用户需求和竞品分析',
        status: 'completed',
        assignee: 4,
        dueDate: '2025-04-05',
        columnValues: {
          department: '市场',
          budget: 5000
        }
      },
      {
        id: 2,
        name: '产品设计',
        description: '设计产品原型和视觉效果',
        status: 'completed',
        assignee: 2,
        dueDate: '2025-04-12',
        columnValues: {
          department: '设计',
          budget: 8000
        }
      },
      {
        id: 3,
        name: '功能开发',
        description: '实现产品核心功能',
        status: 'inProgress',
        assignee: 1,
        dueDate: '2025-04-25',
        columnValues: {
          department: '研发',
          budget: 20000
        }
      },
      {
        id: 4,
        name: '上线准备',
        description: '准备发布材料和营销活动',
        status: 'pending',
        assignee: 4,
        dueDate: '2025-05-01',
        columnValues: {
          department: '运营',
          budget: 10000
        }
      }
    ]
  }
]);

// 状态和视图
const currentProject = ref(null);
const viewMode = ref('list');
const searchQuery = ref('');
const selectedTasks = ref([]);
const currentFilter = ref('all');
const currentSort = ref('dateCreated');

// 对话框状态
const showNewProjectDialog = ref(false);
const showAddColumnDialog = ref(false);
const showAddTaskDialog = ref(false);
const showShareDialog = ref(false);

// 表单数据
const newProject = ref({
  name: '',
  description: '',
  columns: []
});

const newColumn = ref({
  name: '',
  type: 'text',
  options: []
});

const newTask = ref({
  name: '',
  description: '',
  status: 'pending',
  assignee: null,
  dueDate: '',
  columnValues: {}
});

const shareSettings = ref({
  password: '',
  assignee: null,
  expiration: '7'
});

const shareLink = ref('');
const editingTask = ref(null);

// 看板视图的状态列
const statusColumns = [
  { label: '待处理', value: 'pending' },
  { label: '进行中', value: 'inProgress' },
  { label: '已完成', value: 'completed' },
  { label: '已延期', value: 'delayed' }
];

// 拖拽相关
const draggedTask = ref(null);

// 计算属性
const filteredTasks = computed(() => {
  if (!currentProject.value) return [];
  
  let tasks = [...currentProject.value.tasks];
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    tasks = tasks.filter(task => 
      task.name.toLowerCase().includes(query) || 
      task.description.toLowerCase().includes(query)
    );
  }
  
  // 状态过滤
  if (currentFilter.value !== 'all') {
    tasks = tasks.filter(task => task.status === currentFilter.value);
  }
  
  // 排序
  if (currentSort.value === 'dueDate') {
    tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  } else if (currentSort.value === 'priority') {
    const priorityOrder = { '低': 0, '中': 1, '高': 2 };
    tasks.sort((a, b) => {
      const aPriority = a.columnValues && a.columnValues.priority ? priorityOrder[a.columnValues.priority] : -1;
      const bPriority = b.columnValues && b.columnValues.priority ? priorityOrder[b.columnValues.priority] : -1;
      return bPriority - aPriority;
    });
  }
  
  return tasks;
});

const isAllSelected = computed(() => {
  if (!filteredTasks.value.length) return false;
  return filteredTasks.value.every(task => selectedTasks.value.includes(task.id));
});

// 方法
const selectProject = (project) => {
  currentProject.value = project;
  selectedTasks.value = [];
};

const createProject = () => {
  if (!newProject.value.name) {
    ElMessage.warning('请输入项目名称');
    return;
  }
  
  const projectId = projects.value.length + 1;
  const project = {
    id: projectId,
    name: newProject.value.name,
    description: newProject.value.description,
    columns: [],
    tasks: []
  };
  
  projects.value.push(project);
  currentProject.value = project;
  showNewProjectDialog.value = false;
  
  // 重置表单
  newProject.value = {
    name: '',
    description: '',
    columns: []
  };
  
  ElMessage.success('项目创建成功');
};

const addColumn = () => {
  if (!newColumn.value.name) {
    ElMessage.warning('请输入列名称');
    return;
  }
  
  const columnId = `col_${Date.now()}`;
  const column = {
    id: columnId,
    name: newColumn.value.name,
    type: newColumn.value.type,
    options: newColumn.value.type === 'select' ? [...newColumn.value.options] : []
  };
  
  currentProject.value.columns.push(column);
  showAddColumnDialog.value = false;
  
  // 重置表单
  newColumn.value = {
    name: '',
    type: 'text',
    options: []
  };
  
  ElMessage.success('列添加成功');
};

const editTask = (task) => {
  editingTask.value = task;
  newTask.value = {
    name: task.name,
    description: task.description,
    status: task.status,
    assignee: task.assignee,
    dueDate: task.dueDate,
    columnValues: { ...task.columnValues }
  };
  showAddTaskDialog.value = true;
};

const saveTask = () => {
  if (!newTask.value.name) {
    ElMessage.warning('请输入任务名称');
    return;
  }
  
  if (editingTask.value) {
    // 更新任务
    const taskIndex = currentProject.value.tasks.findIndex(t => t.id === editingTask.value.id);
    if (taskIndex !== -1) {
      currentProject.value.tasks[taskIndex] = {
        ...editingTask.value,
        name: newTask.value.name,
        description: newTask.value.description,
        status: newTask.value.status,
        assignee: newTask.value.assignee,
        dueDate: newTask.value.dueDate,
        columnValues: newTask.value.columnValues
      };
    }
    ElMessage.success('任务更新成功');
  } else {
    // 创建新任务
    const taskId = currentProject.value.tasks.length > 0 
      ? Math.max(...currentProject.value.tasks.map(t => t.id)) + 1 
      : 1;
    
    const task = {
      id: taskId,
      name: newTask.value.name,
      description: newTask.value.description,
      status: newTask.value.status,
      assignee: newTask.value.assignee,
      dueDate: newTask.value.dueDate,
      columnValues: newTask.value.columnValues
    };
    
    currentProject.value.tasks.push(task);
    ElMessage.success('任务创建成功');
  }
  
  showAddTaskDialog.value = false;
  editingTask.value = null;
  
  // 重置表单
  newTask.value = {
    name: '',
    description: '',
    status: 'pending',
    assignee: null,
    dueDate: '',
    columnValues: {}
  };
};

const deleteTask = (taskId) => {
  if (confirm('确定要删除这个任务吗？')) {
    const taskIndex = currentProject.value.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      currentProject.value.tasks.splice(taskIndex, 1);
      // 从选中任务中移除
      selectedTasks.value = selectedTasks.value.filter(id => id !== taskId);
      ElMessage.success('任务删除成功');
    }
  }
};

const toggleTaskSelection = (taskId) => {
  const index = selectedTasks.value.indexOf(taskId);
  if (index === -1) {
    selectedTasks.value.push(taskId);
  } else {
    selectedTasks.value.splice(index, 1);
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedTasks.value = [];
  } else {
    selectedTasks.value = filteredTasks.value.map(task => task.id);
  }
};

const filterTasks = (filter) => {
  currentFilter.value = filter;
};

const sortTasks = (sort) => {
  currentSort.value = sort;
};

const formatDate = (dateString) => {
  if (!dateString) return '未设置';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getTeamMemberById = (id) => {
  return teamMembers.value.find(member => member.id === id) || { name: '未知', avatar: '' };
};

const getColumnName = (columnId) => {
  const column = currentProject.value.columns.find(col => col.id === columnId);
  return column ? column.name : '';
};

const getTasksByStatus = (status) => {
  return filteredTasks.value.filter(task => task.status === status);
};

const generateShareLink = () => {
  if (!shareSettings.value.password) {
    ElMessage.warning('请设置访问密码');
    return;
  }
  
  if (!shareSettings.value.assignee) {
    ElMessage.warning('请选择负责人');
    return;
  }
  
  // 生成分享链接
  const taskIds = selectedTasks.value.join(',');
  const expiration = shareSettings.value.expiration;
  const password = shareSettings.value.password;
  const assignee = shareSettings.value.assignee;
  
  shareLink.value = `https://projectmanager.example.com/share?tasks=${taskIds}&assignee=${assignee}&exp=${expiration}`;
  
  // 更新任务的负责人
  selectedTasks.value.forEach(taskId => {
    const task = currentProject.value.tasks.find(t => t.id === taskId);
    if (task) {
      task.assignee = assignee;
    }
  });
  
  ElMessage.success('分享链接生成成功');
};

const copyShareLink = () => {
  navigator.clipboard.writeText(shareLink.value)
    .then(() => {
      ElMessage.success('链接已复制到剪贴板');
    })
    .catch(() => {
      ElMessage.error('复制失败，请手动复制');
    });
};

const onDragStart = (event, task) => {
  draggedTask.value = task;
  event.dataTransfer.effectAllowed = 'move';
};

const onDrop = (event, status) => {
  event.preventDefault();
  if (draggedTask.value) {
    const taskId = draggedTask.value.id;
    const task = currentProject.value.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      ElMessage.success(`任务状态已更新为: ${
        status === 'pending' ? '待处理' : 
        status === 'inProgress' ? '进行中' : 
        status === 'completed' ? '已完成' : '已延期'
      }`);
    }
    draggedTask.value = null;
  }
};

// 生命周期钩子
onMounted(() => {
  // 默认选择第一个项目
  if (projects.value.length > 0) {
    currentProject.value = projects.value[0];
  }
});
</script>
<style scoped>
/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 移除number input的箭头 */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}

input[type=number] {
  -moz-appearance: textfield;
}

/* 拖拽样式 */
[draggable=true] {
  cursor: move;
}
</style>

