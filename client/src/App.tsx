import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentClassroomProvider } from "@/components/classroom/StudentClassroomClient";
import { PreviewProvider } from "@/contexts/PreviewContext";
import PreviewModeBanner from "@/components/PreviewModeBanner";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LandingPage from "@/pages/landing";
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
import AdminCategories from "@/pages/admin-categories";
import AdminBlog from "@/pages/admin-blog";
import AdminBlogPreview from "@/pages/admin-blog-preview";
import AdminNewsletter from "@/pages/admin-newsletter";
import Blogg from "@/pages/blogg";
import BloggSlug from "@/pages/blogg-slug";
import TeacherLessonBank from "@/pages/teacher-lesson-bank";
import TeacherStudentProgress from "@/pages/teacher-student-progress";
import AvatarBuilder from "@/pages/avatar-builder";
import RoomDecorator from "@/pages/room-decorator";
import PirateCourse from "@/pages/pirate-course";
import LessonBuilder from "@/pages/lesson-builder";
import VocabularyLessonBuilder from "@/pages/vocabulary-lesson-builder";
import LessonPlayer from "@/pages/lesson-player";
import AssignmentPlayer from "@/pages/assignment-player";
import PublishedLessonPage from "@/pages/lesson-player-published";
import ReadingLessonBuilder from "@/pages/reading-lesson-builder";
import ReadingLessonSelector from "@/pages/reading-lesson-selector";

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import TeacherPage from "@/pages/teacher";
import TeacherDashboard from "@/pages/teacher-dashboard";
import KlassKampPage from "@/pages/klasskamp";
import SpelaPage from "@/pages/spela";
import KlassKampHostPage from "@/pages/klasskamp-host";
import KlassKampPlayPage from "@/pages/klasskamp-play";
import LicensePage from "@/pages/license";
import TeacherClassesPage from "@/pages/teacher-classes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import RichEditorTest from "@/pages/rich-editor-test";
import TeacherRegistrationPage from "@/pages/TeacherRegistrationPage";
import EmailVerificationPage from "@/pages/EmailVerificationPage";
import LicenseActivationPage from "@/pages/LicenseActivationPage";
import StudentLoginPage from "@/pages/student-login";
import StudentPasswordChangePage from "@/pages/student-password-change";
import VocabularyExercise from "@/pages/vocabulary-exercise";
import VocabularyLessons from "@/pages/vocabulary-lessons";
import FlashcardSession from "@/pages/flashcard-session";
import LessonMaterials from "@/pages/lesson-materials";
import LessonMaterialDetail from "@/pages/lesson-material-detail";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/home-old" component={Home} />
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
      
      {/* Student routes */}
      <Route path="/elev">
        <ProtectedRoute allowedRoles={["ELEV", "ADMIN"]}>
          <StudentHome />
        </ProtectedRoute>
      </Route>
      <Route path="/elev/butik">
        <ProtectedRoute allowedRoles={["ELEV", "ADMIN"]}>
          <StudentShop />
        </ProtectedRoute>
      </Route>
      <Route path="/elev/avatar">
        <ProtectedRoute allowedRoles={["ELEV", "ADMIN"]}>
          <AvatarBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/elev/rum">
        <ProtectedRoute allowedRoles={["ELEV", "ADMIN"]}>
          <RoomDecorator />
        </ProtectedRoute>
      </Route>
      <Route path="/vocabulary-lessons">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <VocabularyLessons />
        </ProtectedRoute>
      </Route>
      <Route path="/elev/ordforrad">
        <ProtectedRoute allowedRoles={["ELEV", "ADMIN"]}>
          <VocabularyExercise />
        </ProtectedRoute>
      </Route>
      <Route path="/vocabulary/exercise/:exerciseId">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <VocabularyExercise />
        </ProtectedRoute>
      </Route>
      <Route path="/vocabulary/flashcards/:setId">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <FlashcardSession />
        </ProtectedRoute>
      </Route>
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
      <Route path="/lasforstaelse/lektion/:id">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <ReadingLessonViewer />
        </ProtectedRoute>
      </Route>
      <Route path="/lasforstaelse/deckargator">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <ReadingPlaceholder type="deckargator" />
        </ProtectedRoute>
      </Route>
      <Route path="/lasforstaelse/skapa">
        <ProtectedRoute allowedRoles={["ADMIN", "LÄRARE"]}>
          <ReadingLessonSelector />
        </ProtectedRoute>
      </Route>
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
      <Route path="/laslogg">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <ReadingLog />
        </ProtectedRoute>
      </Route>
      <Route path="/wordclass/:wordClass">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <WordClassLevels />
        </ProtectedRoute>
      </Route>
      <Route path="/practice/:wordClass/level/:level">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Practice />
        </ProtectedRoute>
      </Route>
      <Route path="/practice/:wordClass?">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Practice />
        </ProtectedRoute>
      </Route>
      <Route path="/test/:testType">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <Test />
        </ProtectedRoute>
      </Route>
      <Route path="/pirate-course">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <PirateCourse />
        </ProtectedRoute>
      </Route>
      <Route path="/lesson/:id">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <LessonPlayer />
        </ProtectedRoute>
      </Route>
      <Route path="/assignment/:id">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <AssignmentPlayer />
        </ProtectedRoute>
      </Route>
      <Route path="/published/:lessonId">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <PublishedLessonPage />
        </ProtectedRoute>
      </Route>
      <Route path="/klasskamp">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <KlassKampPage />
        </ProtectedRoute>
      </Route>
      <Route path="/klasskamp/host/:code">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <KlassKampHostPage />
        </ProtectedRoute>
      </Route>
      <Route path="/klasskamp/play/:code">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <KlassKampPlayPage />
        </ProtectedRoute>
      </Route>
      <Route path="/spela">
        <ProtectedRoute allowedRoles={["ELEV", "LARARE", "ADMIN"]}>
          <SpelaPage />
        </ProtectedRoute>
      </Route>
      
      {/* Rich Editor Test Route */}
      <Route path="/rich-editor-test" component={RichEditorTest} />
      
      {/* Lesson Materials / Blog (public) */}
      <Route path="/lektionsmaterial" component={LessonMaterials} />
      <Route path="/lektionsmaterial/:slug" component={LessonMaterialDetail} />
      <Route path="/gratis-lektioner" component={LessonMaterials} />
      <Route path="/gratis-lektioner/:slug" component={LessonMaterialDetail} />

      {/* Blog (public) */}
      <Route path="/blogg" component={Blogg} />
      <Route path="/blogg/:categoryParent/:categoryChild/:slug" component={BloggSlug} />
      <Route path="/blogg/:slug" component={BloggSlug} />

      {/* Teacher routes (requires LARARE role) */}
      <Route path="/teacher">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherDashboard />
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
          <ErrorBoundary>
            <TeacherClassesPage />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>
      
      {/* Redirect old assign-lessons routes to unified lesson bank */}
      <Route path="/assign-lessons">
        <Redirect to="/teacher/lesson-bank" />
      </Route>
      
      <Route path="/teacher/assign-lessons">
        <Redirect to="/teacher/lesson-bank" />
      </Route>
      
      <Route path="/teacher/lesson-bank">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherLessonBank />
        </ProtectedRoute>
      </Route>

      <Route path="/teacher/student-progress">
        <ProtectedRoute allowedRoles={["LARARE", "ADMIN"]}>
          <TeacherStudentProgress />
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
          <ErrorBoundary>
            <TeacherClassesPage />
          </ErrorBoundary>
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
      <Route path="/admin/categories">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminCategories />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/blog">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminBlog />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/blog/preview/:slug">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminBlogPreview />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/newsletter">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <AdminNewsletter />
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
      <Route path="/vocabulary-lesson-builder">
        <ProtectedRoute allowedRoles={["ADMIN"]}>
          <VocabularyLessonBuilder />
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
