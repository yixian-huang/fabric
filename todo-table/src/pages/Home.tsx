import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trash } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getProjects, createProject, Project, deleteProject } from '@/lib/projectService';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const defaultTemplates = [
];

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤后的项目
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "获取失败",
          description: "获取项目列表失败，请刷新重试",
        });
        console.error('获取项目失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [toast]);

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入项目名称",
      });
      return;
    }

    setIsCreating(true);
    try {
      const project = await createProject(projectName, projectDescription);
      setIsDialogOpen(false);
      setProjectName('');
      setProjectDescription('');
      
      // 刷新项目列表
      const updatedProjects = await getProjects();
      setProjects(updatedProjects);
      
      toast({
        title: "创建成功",
        description: "项目已成功创建",
      });
      
      navigate(`/grid/${project.project_id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "创建失败",
        description: "项目创建失败，请稍后重试",
      });
      console.error('创建项目失败:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      // 刷新项目列表
      const updatedProjects = await getProjects();
      setProjects(updatedProjects);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "删除失败",
        description: "项目删除失败，请稍后重试",
      });
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">我的项目</h1>
          <div className="flex items-center gap-4">
            <input
              type="search"
              placeholder="搜索项目"
              className="px-4 py-2 rounded-lg border border-gray-200 w-[400px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => setIsDialogOpen(true)}
            >
              <CardContent className="p-4 h-full flex flex-col">
                <div className="h-32 flex items-center justify-center">
                  <Plus className="w-12 h-12 text-gray-400" />
                </div>
                <div className="text-center mt-2 font-medium">创建新项目</div>
              </CardContent>
            </Card>
            
            {defaultTemplates.map((template) => (
              <Link to={template.link} key={template.id} className="block h-full">
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl text-gray-500">默认模板</span>
                    </div>
                    <div className="text-center mt-2 font-medium">{template.title}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {filteredProjects.map((project) => (
              <Link to={`/grid/${project.project_id}`} key={project.project_id} className="block h-full">
                <Card className="hover:shadow-lg transition-shadow h-full relative">
                  <CardContent className="p-4 h-full flex flex-col">
                    {project.cover_image ? (
                      <div 
                        className="h-32 bg-cover bg-center rounded-lg"
                        style={{ backgroundImage: `url(${project.cover_image})` }}
                      />
                    ) : (
                      <div className="h-32 bg-blue-50 rounded-lg flex items-center justify-center text-center">
                        <span className="text-xl text-blue-600 px-2">{project.name}</span>
                      </div>
                    )}
                    <div className="mt-2">
                      <div className="text-sm text-gray-500 mt-1">
                        创建于 {new Date(project.created_at).toLocaleDateString()}
                      </div>
                      {project.description && (
                        <div className="text-sm text-gray-500 mt-1 truncate">
                          {project.description}
                        </div>
                      )}
                    </div>

                  </CardContent>
                  <div className="absolute top-2 right-2 mt-auto flex justify-end"  onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteProject(project.project_id)}
                      >
                        <Trash className="w-3 h-3" />
                      </Button>
                    </div>
                </Card>
              </Link>
            ))}

            {!isLoading && filteredProjects.length === 0 && !searchQuery && (
              <div className="col-span-full py-10 text-center text-gray-500">
                没有找到项目，请创建新项目开始使用
              </div>
            )}

            {!isLoading && filteredProjects.length === 0 && searchQuery && (
              <div className="col-span-full py-10 text-center text-gray-500">
                没有找到匹配 "{searchQuery}" 的项目
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目名称
              </label>
              <Input
                placeholder="请输入项目名称"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                项目描述 (选填)
              </label>
              <Textarea
                placeholder="请输入项目描述"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
            >
              取消
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={isCreating}
            >
              {isCreating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
