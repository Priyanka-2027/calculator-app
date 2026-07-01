/**
 * App.jsx — Root component
 *
 * Manages dark/light theme, persisting the preference in localStorage.
 * localStorage access is wrapped in try/catch — it throws in some
 * private-browsing or restricted environments.
 */

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import Calculator from "./components/Calculator";
import History from "./components/History";

// Create QueryClient once, outside the component, so it is never recreated
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,               // retry once on network failure
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  },
});

// Safe localStorage helpers — silent fallback when storage is unavailable
function readStorage(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore — non-critical preference
  }
}

function App() {
  const [theme, setTheme] = useState(() => readStorage("calc-theme", "dark"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    writeStorage("calc-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  const isDark = theme === "dark";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app" data-theme={theme}>
        {/* ── Top bar: branding + theme toggle ── */}
        <header className="app-header">
          <div className="app-header__brand">
            <span className="app-header__icon" aria-hidden="true">⌗</span>
            <div>
              <h1 className="app-header__title">Calculator</h1>
              <p className="app-header__sub">Type or use keyboard shortcuts</p>
            </div>
          </div>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="theme-toggle__icon" aria-hidden="true">
              {isDark ? "☀️" : "🌙"}
            </span>
            {isDark ? "Light" : "Dark"}
          </button>
        </header>

        <Calculator />
        <History />
      </div>
    </QueryClientProvider>
  );
}

export default App;
