import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// 类型定义
export interface TeamMember {
  id: number;
  name: string;
  avatar: string;
}

export interface Column {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
}

export interface Task {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'inProgress' | 'completed' | 'delayed';
  assignee: number | null;
  dueDate: string;
  columnValues: Record<string, any>;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  columns: Column[];
  tasks: Task[];
}

export const useProjectStore = defineStore('project', {
  state: () => ({
    userName: '张明',
    userAvatar: 'https://public.readdy.ai/ai/img_res/c290d610bfbdb42c370c9cfddc1593b7.jpg',
    emptyStateImage: 'https://public.readdy.ai/ai/img_res/f55060b0f3db3d0cf7ee3105ef4698ca.jpg',
    teamMembers: [
      { 
        id: 1, 
        name: 'HS', 
        avatar: 'https://public.readdy.ai/ai/img_res/16759be1f8d2ee8d7cb08f2758ed2a72.jpg' 
      },
      { 
        id: 2, 
        name: 'KH', 
        avatar: 'https://public.readdy.ai/ai/img_res/b654ae3362194b94470223788fded08a.jpg' 
      },
      { 
        id: 3, 
        name: 'YKK', 
        avatar: 'https://public.readdy.ai/ai/img_res/8be0c36cab81de95e229dad23907b989.jpg' 
      },
      { 
        id: 4, 
        name: 'NT', 
        avatar: 'https://public.readdy.ai/ai/img_res/4baeaeed5cf24cc65df3a4edbd81ab2e.jpg' 
      }
    ] as TeamMember[],
    projects: [
      {
        id: 1,
        name: '服饰纺织面料 TODO List A',
        description: '对公司官网进行全面重构，提升用户体验和性能',
        columns: [
          { id: 'customer', name: '客户', type: 'text' },
          { id: 'clothes', name: '成衣款', type: 'text' },
          { id: 'priority', name: '优先级', type: 'select', options: ['低', '中', '高'] },
          { id: 'supplier', name: '供应商', type: 'select', options: ['SCR', 'KH', 'YKK', 'NT'] },
          { id: 'file', name: '文件', type: 'select', options: ['文件1', '文件2', '文件3'] },
          { id: 'price', name: '单价', type: 'text' },
          { id: 'mainMaterial', name: '主面料', type: 'text'},
          { id: 'subMaterial', name: '主辅料', type: 'text' },
          { id: 'remark', name: '事宜', type: 'text'},
          { id: 'finishDate', name: '完成日期', type: 'text'}
        ],
        tasks: [
          {
            id: 1,
            name: '服装A设计',
            description: '设计新版首页布局和视觉效果',
            status: 'completed',
            assignee: 2,
            dueDate: '2025-04-10',
            columnValues: {
              customer: "SCR",
              clothes: "TICHIA",
              supplier: 'HS',
              file: '文件1',
              price: '100',
              mainMaterial: '面料1',
              subMaterial: '辅料1',
              remark: '事宜',
              finishDate: '2025-04-05',
              priority: '高',
              difficulty: '中等',
              estimatedHours: 8
            }
          },
          {
            id: 2,
            name: '服装B设计',
            description: '设计新版首页布局和视觉效果',
            status: 'completed',
            assignee: 2,
            dueDate: '2025-04-10',
            columnValues: {
              customer: "TD",
              clothes: "TICHIA",
              supplier: 'KH',
              file: '文件1',
              price: '100',
              mainMaterial: '面料1',
              subMaterial: '辅料1',
              remark: '事宜',
              finishDate: '2025-04-05',
              priority: '高',
              difficulty: '中等',
              estimatedHours: 8
            }
          },
        ]
      },
      {
        id: 2,
        name: '服饰纺织面料 TODO List B',
        description: '对公司官网进行全面重构，提升用户体验和性能',
        columns: [
          { id: 'customer', name: '客户', type: 'text' },
          { id: 'clothes', name: '成衣款', type: 'text' },
          { id: 'priority', name: '优先级', type: 'select', options: ['低', '中', '高'] },
          { id: 'supplier', name: '供应商', type: 'select', options: ['SCR', 'KH', 'YKK', 'NT'] },
          { id: 'file', name: '文件', type: 'select', options: ['文件1', '文件2', '文件3'] },
          { id: 'price', name: '单价', type: 'text' },
          { id: 'mainMaterial', name: '主面料', type: 'text'},
          { id: 'subMaterial', name: '主辅料', type: 'text' },
          { id: 'remark', name: '事宜', type: 'text'},
          { id: 'finishDate', name: '完成日期', type: 'text'}
        ],
        tasks: [
          {
            id: 1,
            name: '服装B设计',
            description: '设计新版首页布局和视觉效果',
            status: 'completed',
            assignee: 2,
            dueDate: '2025-04-10',
            columnValues: {
              customer: "客户名称",
              clothes: "TICHIA",
              supplier: 'SCR',
              file: '文件1',
              price: '100',
              mainMaterial: '面料1',
              subMaterial: '辅料1',
              remark: '事宜',
              finishDate: '2025-04-05',
              priority: '高',
              difficulty: '中等',
              estimatedHours: 8
            }
          },
        ]
      },
    ] as Project[],
    currentProject: null as Project | null,
    viewMode: 'list' as 'list' | 'board',
    searchQuery: '',
    selectedTasks: [] as number[],
    currentFilter: 'all' as 'all' | 'pending' | 'inProgress' | 'completed' | 'delayed',
    currentSort: 'dateCreated' as 'dateCreated' | 'dueDate' | 'priority',
    newProject: {
      name: '',
      description: '',
      columns: []
    },
    newColumn: {
      name: '',
      type: 'text' as Column['type'],
      options: []
    },
    newTask: {
      name: '',
      description: '',
      status: 'pending' as Task['status'],
      assignee: null as number | null,
      dueDate: '',
      columnValues: {}
    },
    shareSettings: {
      password: '',
      assignee: null as number | null,
      expiration: '7'
    },
    shareLink: '',
    editingTask: null as Task | null,
    statusColumns: [
      { label: '待处理', value: 'pending' },
      { label: '进行中', value: 'inProgress' },
      { label: '已完成', value: 'completed' },
      { label: '已延期', value: 'delayed' }
    ] as const,
    draggedTask: null as Task | null
  }),

  getters: {
    filteredTasks: (state) => {
      if (!state.currentProject) return [];
      
      let tasks = [...state.currentProject.tasks];
      
      // 搜索过滤
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        tasks = tasks.filter(task => 
          task.name.toLowerCase().includes(query) || 
          task.description.toLowerCase().includes(query)
        );
      }
      
      // 状态过滤
      if (state.currentFilter !== 'all') {
        tasks = tasks.filter(task => task.status === state.currentFilter);
      }
      
      // 排序
      if (state.currentSort === 'dueDate') {
        tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      } else if (state.currentSort === 'priority') {
        const priorityOrder = { '低': 0, '中': 1, '高': 2 };
        tasks.sort((a, b) => {
          const aPriority = a.columnValues && a.columnValues.priority ? priorityOrder[a.columnValues.priority as keyof typeof priorityOrder] : -1;
          const bPriority = b.columnValues && b.columnValues.priority ? priorityOrder[b.columnValues.priority as keyof typeof priorityOrder] : -1;
          return bPriority - aPriority;
        });
      }
      
      return tasks;
    },
    
    isAllSelected: (state) => {
      if (!state.filteredTasks.length) return false;
      return state.filteredTasks.every(task => state.selectedTasks.includes(task.id));
    }
  },

  actions: {
    selectProject(project: Project) {
      this.currentProject = project;
      this.selectedTasks = [];
    },
    createProject() {
      if (!this.newProject.name || !this.currentProject) return;
      
      const projectId = this.projects.length + 1;
      const project = {
        id: projectId,
        name: this.newProject.name,
        description: this.newProject.description,
        columns: [],
        tasks: []
      };
      
      this.projects.push(project);
      this.currentProject = project;
      
      // 重置表单
      this.newProject = {
        name: '',
        description: '',
        columns: []
      };
    },
    addColumn() {
      if (!this.newColumn.name || !this.currentProject) return;
      
      const columnId = `col_${Date.now()}`;
      const column = {
        id: columnId,
        name: this.newColumn.name,
        type: this.newColumn.type,
        options: this.newColumn.type === 'select' ? [...this.newColumn.options] : []
      };
      
      this.currentProject.columns.push(column);
      
      // 重置表单
      this.newColumn = {
        name: '',
        type: 'text',
        options: []
      };
    },
    editTask(task: Task) {
      this.editingTask = task;
      this.newTask = {
        name: task.name,
        description: task.description,
        status: task.status,
        assignee: task.assignee,
        dueDate: task.dueDate,
        columnValues: { ...task.columnValues }
      };
    },
    saveTask() {
      if (!this.newTask.name || !this.currentProject) return;
      
      if (this.editingTask) {
        const taskIndex = this.currentProject.tasks.findIndex(t => t.id === this.editingTask?.id);
        if (taskIndex !== -1) {
          this.currentProject.tasks[taskIndex] = {
            ...this.editingTask,
            name: this.newTask.name,
            description: this.newTask.description,
            status: this.newTask.status,
            assignee: this.newTask.assignee,
            dueDate: this.newTask.dueDate,
            columnValues: this.newTask.columnValues
          };
        }
      } else {
        const taskId = this.currentProject.tasks.length > 0 
          ? Math.max(...this.currentProject.tasks.map(t => t.id)) + 1 
          : 1;
        
        const task = {
          id: taskId,
          name: this.newTask.name,
          description: this.newTask.description,
          status: this.newTask.status,
          assignee: this.newTask.assignee,
          dueDate: this.newTask.dueDate,
          columnValues: this.newTask.columnValues
        };
        
        this.currentProject.tasks.push(task);
      }
      
      this.editingTask = null;
      
      // 重置表单
      this.newTask = {
        name: '',
        description: '',
        status: 'pending',
        assignee: null,
        dueDate: '',
        columnValues: {}
      };
    },
    deleteTask(taskId: number) {
      if (!this.currentProject) return;
      const taskIndex = this.currentProject.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        this.currentProject.tasks.splice(taskIndex, 1);
        this.selectedTasks = this.selectedTasks.filter(id => id !== taskId);
      }
    },
    toggleTaskSelection(taskId: number) {
      const index = this.selectedTasks.indexOf(taskId);
      if (index === -1) {
        this.selectedTasks.push(taskId);
      } else {
        this.selectedTasks.splice(index, 1);
      }
    },
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedTasks = [];
      } else {
        this.selectedTasks = this.filteredTasks.map(task => task.id);
      }
    },
    filterTasks(filter: 'all' | 'pending' | 'inProgress' | 'completed' | 'delayed') {
      this.currentFilter = filter;
    },
    sortTasks(sort: 'dateCreated' | 'dueDate' | 'priority') {
      this.currentSort = sort;
    },
    generateShareLink() {
      if (!this.shareSettings.password || !this.shareSettings.assignee || !this.currentProject) return;
      
      const taskIds = this.selectedTasks.join(',');
      const expiration = this.shareSettings.expiration;
      const password = this.shareSettings.password;
      const assignee = this.shareSettings.assignee;
      
      this.shareLink = `https://projectmanager.example.com/share?tasks=${taskIds}&assignee=${assignee}&exp=${expiration}`;
      
      this.selectedTasks.forEach(taskId => {
        const task = this.currentProject?.tasks.find(t => t.id === taskId);
        if (task) {
          task.assignee = assignee;
        }
      });
    },
    copyShareLink() {
      navigator.clipboard.writeText(this.shareLink);
    },
    onDragStart(event: DragEvent, task: Task) {
      this.draggedTask = task;
      event.dataTransfer.effectAllowed = 'move';
    },
    onDrop(event: DragEvent, status: Task['status']) {
      event.preventDefault();
      if (this.draggedTask && this.currentProject) {
        const taskId = this.draggedTask.id;
        const task = this.currentProject.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = status;
        }
        this.draggedTask = null;
      }
    }
  }
}); 