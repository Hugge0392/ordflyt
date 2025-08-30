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
import ReadingLog from "@/pages/ReadingLog";
import Practice from "@/pages/practice";
import Test from "@/pages/test";
import WordClassLevels from "@/pages/word-class-levels";

import Admin from "@/pages/admin";
import AdminReading from "@/pages/admin-reading";
import AdminLessons from "@/pages/admin-lessons";
import AdminAccounts from "@/pages/admin-accounts";
import AdminSentences from "@/pages/admin-sentences";
import AdminEmailTest from "@/pages/admin-email-test";
import PirateCourse from "@/pages/pirate-course";
import LessonBuilder from "@/pages/lesson-builder";
import LessonPlayer from "@/pages/lesson-player";
import PublishedLessonPage from "@/pages/lesson-player-published";
import ReadingLessonCreate from "@/pages/reading-lesson-create";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import TeacherPage from "@/pages/teacher";
import KlassKampPage from "@/pages/klasskamp";
import SpelaPage from "@/pages/spela";
import KlassKampHostPage from "@/pages/klasskamp-host";
import KlassKampPlayPage from "@/pages/klasskamp-play";
import LicensePage from "@/pages/license";
import TeacherClassesPage from "@/pages/teacher-classes";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/registrera" component={RegisterPage} />
      
      {/* Student routes - now public for exploration */}
      <Route path="/menu" component={Menu} />
      <Route path="/grammatik" component={Menu} />
      <Route path="/lasforstaelse" component={ReadingHome} />
      <Route path="/lasforstaelse/ovningar" component={ReadingExercises} />
      <Route path="/lasforstaelse/lektion/:id" component={ReadingLessonViewer} />
      <Route path="/lasforstaelse/deckargator">
        <ReadingPlaceholder type="deckargator" />
      </Route>
      <Route path="/skrivande">
        <Placeholder category="skrivande" />
      </Route>
      <Route path="/muntligt">
        <Placeholder category="muntligt" />
      </Route>
      <Route path="/nordiska-sprak">
        <Placeholder category="nordiska-sprak" />
      </Route>
      <Route path="/kallkritik">
        <Placeholder category="kallkritik" />
      </Route>
      <Route path="/laslogg" component={ReadingLog} />
      <Route path="/wordclass/:wordClass" component={WordClassLevels} />
      <Route path="/practice/:wordClass/level/:level" component={Practice} />
      <Route path="/practice/:wordClass?" component={Practice} />
      <Route path="/test/:testType" component={Test} />
      <Route path="/pirate-course" component={PirateCourse} />
      <Route path="/lesson/:id" component={LessonPlayer} />
      <Route path="/published/:lessonId" component={PublishedLessonPage} />
      <Route path="/klasskamp" component={KlassKampPage} />
      <Route path="/klasskamp/host/:code" component={KlassKampHostPage} />
      <Route path="/klasskamp/play/:code" component={KlassKampPlayPage} />
      <Route path="/spela" component={SpelaPage} />
      
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
      <Route path="/admin/email-test">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminEmailTest />
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
      <Route path="/admin/reading/create">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <ReadingLessonCreate />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reading/edit/:id">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <ReadingLessonCreate />
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
