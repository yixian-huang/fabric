import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getProjectDetail, getProjectTodoDetail, ProjectDetail } from '@/lib/projectService'

interface ProjectState {
  // 状态
  projectId: string | undefined
  projectName: string
  isLoading: boolean
  error: string | null
  
  // 操作
  setProjectId: (id: string | undefined) => void
  setProjectName: (name: string) => void
  fetchProjectDetail: (id: string) => Promise<ProjectDetail | undefined>
  fetchTodoProject: () => Promise<ProjectDetail | undefined>
  resetProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // 初始状态
      projectId: undefined,
      projectName: '',
      isLoading: false,
      error: null,
      
      // 操作方法
      setProjectId: (id) => set({ projectId: id }),
      setProjectName: (name) => set({ projectName: name }),
      
      // 获取项目详情
      fetchProjectDetail: async (id) => {
        if (!id) return undefined
        
        try {
          set({ isLoading: true, error: null })
          const data = await getProjectDetail(id)
          set({ 
            projectId: data.project_id,
            projectName: data.name,
            isLoading: false 
          })
          return data
        } catch (error) {
          console.error('获取项目详情失败:', error)
          set({ 
            error: error instanceof Error ? error.message : '获取项目详情失败',
            isLoading: false 
          })
          return undefined
        }
      },
      
      // 获取待办项目
      fetchTodoProject: async () => {
        try {
          set({ isLoading: true, error: null })
          const data = await getProjectTodoDetail()
          set({ 
            projectId: data.project_id,
            projectName: data.name,
            isLoading: false 
          })
          return data
        } catch (error) {
          console.error('获取待办项目失败:', error)
          set({ 
            error: error instanceof Error ? error.message : '获取待办项目失败',
            isLoading: false 
          })
          return undefined
        }
      },
      
      // 重置项目状态
      resetProject: () => set({ 
        projectId: undefined,
        projectName: '',
        error: null
      })
    }),
    {
      name: 'project-storage', // 持久化存储的名称
      storage: createJSONStorage(() => localStorage), // 使用localStorage存储
      partialize: (state) => ({ 
        projectId: state.projectId,
        projectName: state.projectName
      }), // 只持久化这些状态
    }
  )
) 