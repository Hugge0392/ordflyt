import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Menu from "@/pages/menu";
import Practice from "@/pages/practice";
import Test from "@/pages/test";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Menu} />
      <Route path="/practice/:wordClass?" component={Practice} />
      <Route path="/test/:testType" component={Test} />
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
