import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme } from 'antd';
import Home from "./pages/Home";
import Login from "./pages/Login";
import GridCreatorPage from "./pages/GridCreatorPage";
import NotFound from "./pages/NotFound";
import PrivateRoute from "./components/PrivateRoute";
import { VendorSharedView } from "./components/GridCreator/VendorSharedView";
import TodoPage from "./pages/TodoPage";
import Root from "./pages/Root";

const queryClient = new QueryClient();

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#409eff',
        },
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <TodoPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/v/:sharedKey"
              element={
                <VendorSharedView />
              }
            />
            <Route
              path="/grid/:projectId"
              element={
                <PrivateRoute>
                  <GridCreatorPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/todo"
              element={
                <PrivateRoute>
                  <TodoPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/share/:shareId"
              element={
                <GridCreatorPage />
              }
            />
            <Route
              path="/vendor_share/:sharedKey"
              element={
                <VendorSharedView />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;
