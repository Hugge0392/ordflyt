import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * StudentLoginPage now redirects to the main login page.
 * The main login page has smart detection for setup codes vs regular passwords,
 * which simplifies the login experience by having only one login form.
 */
export default function StudentLoginPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to main login page which automatically detects setup codes vs passwords
    setLocation('/login');
  }, [setLocation]);

  return null; // Component redirects immediately, no UI needed
}