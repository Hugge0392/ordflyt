import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Menu from "@/pages/menu";
import Placeholder from "@/pages/placeholder";
import ReadingHome from "@/pages/reading-home";
import ReadingComprehension from "@/pages/reading-comprehension";
import ReadingExercises from "@/pages/reading-exercises";
import ReadingLessonViewer from "@/pages/reading-lesson-viewer";
import ReadingAdmin from "@/pages/reading-admin";
import ReadingPlaceholder from "@/pages/reading-placeholder";
import Practice from "@/pages/practice";
import Test from "@/pages/test";
import WordClassLevels from "@/pages/word-class-levels";

import Admin from "@/pages/admin";
import AdminReading from "@/pages/admin-reading";
import AdminLessons from "@/pages/admin-lessons";
import AdminAccounts from "@/pages/admin-accounts";
import AdminSentences from "@/pages/admin-sentences";
import PirateCourse from "@/pages/pirate-course";
import LessonBuilder from "@/pages/lesson-builder";
import LessonPlayer from "@/pages/lesson-player";
import PublishedLessonPage from "@/pages/lesson-player-published";

import LoginPage from "@/pages/login";
import TeacherPage from "@/pages/teacher";
import LicensePage from "@/pages/license";
import TeacherClassesPage from "@/pages/teacher-classes";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      
      {/* Student routes (requires ELEV role) */}
      <Route path="/menu">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Menu />
        </ProtectedRoute>
      </Route>
      <Route path="/grammatik">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Menu />
        </ProtectedRoute>
      </Route>
      <Route path="/lasforstaelse">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <ReadingHome />
        </ProtectedRoute>
      </Route>
      <Route path="/lasforstaelse/ovningar">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <ReadingExercises />
        </ProtectedRoute>
      </Route>
      <Route path="/lasforstaelse/lektion/:id" component={ReadingLessonViewer} />
      <Route path="/lasforstaelse/deckargator">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <ReadingPlaceholder type="deckargator" />
        </ProtectedRoute>
      </Route>
      <Route path="/skrivande">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Placeholder category="skrivande" />
        </ProtectedRoute>
      </Route>
      <Route path="/muntligt">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Placeholder category="muntligt" />
        </ProtectedRoute>
      </Route>
      <Route path="/nordiska-sprak">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Placeholder category="nordiska-sprak" />
        </ProtectedRoute>
      </Route>
      <Route path="/kallkritik">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Placeholder category="kallkritik" />
        </ProtectedRoute>
      </Route>
      <Route path="/wordclass/:wordClass" component={WordClassLevels} />
      <Route path="/practice/:wordClass/level/:level" component={Practice} />
      <Route path="/practice/:wordClass?" component={Practice} />
      <Route path="/test/:testType" component={Test} />
      <Route path="/pirate-course">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <PirateCourse />
        </ProtectedRoute>
      </Route>
      <Route path="/lesson/:id" component={LessonPlayer} />
      <Route path="/published/:lessonId" component={PublishedLessonPage} />
      
      {/* Teacher routes (requires LARARE role) */}
      <Route path="/teacher">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherPage />
        </ProtectedRoute>
      </Route>
      <Route path="/license">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <LicensePage />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/classes">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherClassesPage />
        </ProtectedRoute>
      </Route>
      
      {/* Admin routes (requires ADMIN role) */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <Admin />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reading">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminReading />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/lessons">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminLessons />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/accounts">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminAccounts />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/sentences">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminSentences />
        </ProtectedRoute>
      </Route>
      <Route path="/lasforstaelse/admin">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <ReadingAdmin />
        </ProtectedRoute>
      </Route>
      <Route path="/lesson-builder">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <LessonBuilder />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
