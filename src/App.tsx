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
import JoinSession from "./pages/student/JoinSession";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Settings from "./pages/teacher/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <SonnerToaster />
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
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
            {/* Add a dedicated preview route for teachers */}
            <Route 
              path="/teacher/preview/:lessonId" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <StudentView isPreview={true} />
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
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Settings />
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
            {/* New route for Google Classroom assignment links */}
            <Route 
              path="/join" 
              element={<JoinSession />} 
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
            <Route 
              path="/student/session/:sessionId" 
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
