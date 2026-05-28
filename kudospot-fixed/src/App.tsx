import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Testimonials from "./pages/Testimonials";
import Settings from "./pages/Settings";
import Collect from "./pages/Collect";
import Widgets from "./pages/Widgets";
import CaseStudies from "./pages/CaseStudies";
import SocialPosts from "./pages/SocialPosts";
import Analytics from "./pages/Analytics";
import Upgrade from "./pages/Upgrade";
import PublicForm from "./pages/PublicForm";
import Approve from "./pages/Approve";
import Embed from "./pages/Embed";
import PublicCaseStudy from "./pages/PublicCaseStudy";
import NotFound from "./pages/NotFound.tsx";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/collect/:slug" element={<PublicForm />} />
            <Route path="/approve/:token" element={<Approve />} />
            <Route path="/embed/:id" element={<Embed />} />
            <Route path="/case-studies/:slug" element={<PublicCaseStudy />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/testimonials" element={<ProtectedRoute><Testimonials /></ProtectedRoute>} />
            <Route path="/collect" element={<ProtectedRoute><Collect /></ProtectedRoute>} />
            <Route path="/widgets" element={<ProtectedRoute><Widgets /></ProtectedRoute>} />
            <Route path="/case-studies" element={<ProtectedRoute><CaseStudies /></ProtectedRoute>} />
            <Route path="/social-posts" element={<ProtectedRoute><SocialPosts /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
