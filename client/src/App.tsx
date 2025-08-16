import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Menu from "@/pages/menu";
import Practice from "@/pages/practice";
import Test from "@/pages/test";
import WordClassLevels from "@/pages/word-class-levels";

import Admin from "@/pages/admin";
import PirateCourse from "@/pages/pirate-course";
import LessonBuilder from "@/pages/lesson-builder";
import LessonPlayer from "@/pages/lesson-player";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Menu} />
      <Route path="/wordclass/:wordClass" component={WordClassLevels} />
      <Route path="/practice/:wordClass/level/:level" component={Practice} />
      <Route path="/practice/:wordClass?" component={Practice} />
      <Route path="/test/:testType" component={Test} />

      <Route path="/admin" component={Admin} />
      <Route path="/pirate-course" component={PirateCourse} />
      <Route path="/lesson-builder" component={LessonBuilder} />
      <Route path="/lesson/:id" component={LessonPlayer} />
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
