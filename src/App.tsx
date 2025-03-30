import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/teacher/Dashboard";
import LessonEditor from "./pages/teacher/LessonEditor";
import LessonPresentation from "./pages/teacher/LessonPresentation";
import StudentView from "./pages/student/StudentView";
import StudentDashboard from "./pages/student/StudentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          {/* Use only one toast provider to avoid conflicts */}
          <SonnerToaster />
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Teacher Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/editor/:lessonId" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <LessonEditor />
                </ProtectedRoute>
              } 
            />
            {/* More specific routes must come before less specific ones */}
            <Route 
              path="/teacher/editor/:lessonId" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <LessonEditor />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher/presentation/:lessonId" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <LessonPresentation />
                </ProtectedRoute>
              } 
            />
            {/* Generic teacher route comes last */}
            <Route 
              path="/teacher/:lessonId" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <LessonPresentation />
                </ProtectedRoute>
              } 
            />
            
            {/* Student Routes */}
            <Route 
              path="/student" 
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/join" 
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/join/:joinCode" 
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentView />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/view/:lessonId" 
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentView />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
