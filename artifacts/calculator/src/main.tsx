/**
 * main.tsx — App entry point
 * Mounts the React app into the #root element in index.html
 */
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")!).render(<App />);
