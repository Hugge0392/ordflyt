import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Menu from "@/pages/menu";
import Placeholder from "@/pages/placeholder";
import Practice from "@/pages/practice";
import Test from "@/pages/test";
import WordClassLevels from "@/pages/word-class-levels";

import Admin from "@/pages/admin";
import PirateCourse from "@/pages/pirate-course";
import LessonBuilder from "@/pages/lesson-builder";
import LessonPlayer from "@/pages/lesson-player";
import PublishedLessonPage from "@/pages/lesson-player-published";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/grammatik" component={Menu} />
      <Route path="/lasforstaelse" component={() => <Placeholder category="lasforstaelse" />} />
      <Route path="/skrivande" component={() => <Placeholder category="skrivande" />} />
      <Route path="/muntligt" component={() => <Placeholder category="muntligt" />} />
      <Route path="/nordiska-sprak" component={() => <Placeholder category="nordiska-sprak" />} />
      <Route path="/kallkritik" component={() => <Placeholder category="kallkritik" />} />
      <Route path="/wordclass/:wordClass" component={WordClassLevels} />
      <Route path="/practice/:wordClass/level/:level" component={Practice} />
      <Route path="/practice/:wordClass?" component={Practice} />
      <Route path="/test/:testType" component={Test} />

      <Route path="/admin" component={Admin} />
      <Route path="/pirate-course" component={PirateCourse} />
      <Route path="/lesson-builder" component={LessonBuilder} />
      <Route path="/lesson/:id" component={LessonPlayer} />
      <Route path="/published/:lessonId" component={PublishedLessonPage} />
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
