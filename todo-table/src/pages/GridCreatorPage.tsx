import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GridProvider } from '@/components/GridCreator/GridContextProvider';
import { Grid } from '@/components/GridCreator/Grid';
import { SharedView } from '@/components/GridCreator/SharedView';
import { ChevronLeft } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';

const GridCreatorPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const isSharedView = Boolean(shareId);
  const { projectId } = useParams<{ projectId: string }>();
  const { fetchProjectDetail, setProjectId } = useProjectStore();
  
  // 如果有projectId，初始化项目数据到store
  useEffect(() => {
    if (projectId && !isSharedView) {
      setProjectId(projectId);
      fetchProjectDetail(projectId);
    }
  }, [projectId, isSharedView, fetchProjectDetail, setProjectId]);

  return (
    <div className="min-h-screen flex flex-col">
      {!isSharedView && (
        <header className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-start">
            <Link to="/home">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">TODO TABLE</h1>
          </div>
        </header>
      )}
      
      <div className="flex-1 overflow-hidden min-h-full">
        {isSharedView ? (
          <SharedView />
        ) : (
          <GridProvider>
            <Grid />
          </GridProvider>
        )}
      </div>
    </div>
  );
};

export default GridCreatorPage;
