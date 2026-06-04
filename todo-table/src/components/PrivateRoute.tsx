import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, loading } = useAuth();
  
  // 加载中时显示加载状态
  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }
  
  // 未登录时重定向到登录页
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default PrivateRoute;
