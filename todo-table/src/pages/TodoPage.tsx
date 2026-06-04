import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GridProvider } from '@/components/GridCreator/GridContextProvider';
import { Grid } from '@/components/GridCreator/Grid';
import { ChevronLeft } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';

const TodoPage: React.FC = () => {
  const { fetchTodoProject } = useProjectStore();
  
  // 组件加载时获取待办项目
  useEffect(() => {
    fetchTodoProject();
  }, [fetchTodoProject]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-start">
          <Link to="/home">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">待办事项</h1>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden min-h-full">
        <GridProvider>
          <Grid />
        </GridProvider>
      </div>
    </div>
  );
};

export default TodoPage; 