import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentClassroomProvider } from "@/components/classroom/StudentClassroomClient";
import { PreviewProvider } from "@/contexts/PreviewContext";
import PreviewModeBanner from "@/components/PreviewModeBanner";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Menu from "@/pages/menu";
import StudentHome from "@/pages/student-home";
import StudentShop from "@/pages/student-shop";
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
import AdminGrammatik from "@/pages/admin-grammatik";
import AdminAccounts from "@/pages/admin-accounts";
import AdminSentences from "@/pages/admin-sentences";
import AdminEmailTest from "@/pages/admin-email-test";
import AdminLessonTemplates from "@/pages/admin-lesson-templates";
import AdminVocabulary from "@/pages/admin-vocabulary";
import TeacherLessonBank from "@/pages/teacher-lesson-bank";
import AvatarBuilder from "@/pages/avatar-builder";
import RoomDecorator from "@/pages/room-decorator";
import PirateCourse from "@/pages/pirate-course";
import LessonBuilder from "@/pages/lesson-builder";
import LessonPlayer from "@/pages/lesson-player";
import PublishedLessonPage from "@/pages/lesson-player-published";
import ReadingLessonBuilder from "@/pages/reading-lesson-builder";
import ReadingLessonSelector from "@/pages/reading-lesson-selector";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import TeacherPage from "@/pages/teacher";
import TeacherDashboard from "@/pages/teacher-dashboard";
import AssignLessonsPage from "@/pages/assign-lessons";
import KlassKampPage from "@/pages/klasskamp";
import SpelaPage from "@/pages/spela";
import KlassKampHostPage from "@/pages/klasskamp-host";
import KlassKampPlayPage from "@/pages/klasskamp-play";
import LicensePage from "@/pages/license";
import TeacherClassesPage from "@/pages/teacher-classes";
import ProtectedRoute from "@/components/ProtectedRoute";
import RichEditorTest from "@/pages/rich-editor-test";
import TeacherRegistrationPage from "@/pages/TeacherRegistrationPage";
import EmailVerificationPage from "@/pages/EmailVerificationPage";
import LicenseActivationPage from "@/pages/LicenseActivationPage";
import StudentLoginPage from "@/pages/student-login";
import StudentPasswordChangePage from "@/pages/student-password-change";
import VocabularyExercise from "@/pages/vocabulary-exercise";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/registrera" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      
      {/* Teacher registration system */}
      <Route path="/registrera-larare" component={TeacherRegistrationPage} />
      <Route path="/verifiera-email/:token" component={EmailVerificationPage} />
      <Route path="/aktivera-licens">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <LicenseActivationPage />
        </ProtectedRoute>
      </Route>
      
      {/* Student authentication routes */}
      <Route path="/elev/login" component={StudentLoginPage} />
      <Route path="/elev/password" component={StudentPasswordChangePage} />
      
      {/* Student routes - now public for exploration */}
      <Route path="/elev" component={StudentHome} />
      <Route path="/elev/butik" component={StudentShop} />
      <Route path="/elev/avatar" component={AvatarBuilder} />
      <Route path="/elev/rum" component={RoomDecorator} />
      <Route path="/elev/ordforrad" component={VocabularyExercise} />
      <Route path="/vocabulary/exercise/:exerciseId" component={VocabularyExercise} />
      <Route path="/menu" component={Menu} />
      <Route path="/grammatik" component={Menu} />
      <Route path="/lasforstaelse" component={ReadingHome} />
      <Route path="/lasforstaelse/ovningar" component={ReadingExercises} />
      <Route path="/lasforstaelse/lektion/:id" component={ReadingLessonViewer} />
      <Route path="/lasforstaelse/deckargator">
        <ReadingPlaceholder type="deckargator" />
      </Route>
      <Route path="/lasforstaelse/skapa" component={ReadingLessonSelector} />
      <Route path="/lasforstaelse/skapa/:id">
        <ProtectedRoute allowedRoles={["ADMIN", "LÄRARE"]}>
          <ReadingLessonBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/lasforstaelse/lektioner">
        <ProtectedRoute allowedRoles={["ADMIN", "LÄRARE"]}>
          <ReadingAdmin />
        </ProtectedRoute>
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
      
      {/* Rich Editor Test Route */}
      <Route path="/rich-editor-test" component={RichEditorTest} />
      
      {/* Teacher routes (requires LARARE role) */}
      <Route path="/teacher">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherPage />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher-dashboard">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherDashboard />
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
      
      <Route path="/teacher/assign-lessons">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <AssignLessonsPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/teacher/lesson-bank">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherLessonBank />
        </ProtectedRoute>
      </Route>
      
      {/* Swedish teacher route aliases */}
      <Route path="/larare">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherPage />
        </ProtectedRoute>
      </Route>
      <Route path="/larare/klasser">
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
      <Route path="/admin/grammatik">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminGrammatik />
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
      <Route path="/admin/lesson-templates">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminLessonTemplates />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/vocabulary">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminVocabulary />
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
          <ReadingLessonBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reading/edit/:id">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <ReadingLessonBuilder />
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
        <PreviewProvider>
          <StudentClassroomProvider>
            <PreviewModeBanner />
            <Toaster />
            <Router />
          </StudentClassroomProvider>
        </PreviewProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
