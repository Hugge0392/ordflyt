import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Fix for Vite HMR WebSocket error in development
// Intercept WebSocket constructor to handle undefined port gracefully
if (import.meta.env.DEV) {
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
    // Check if this is a Vite HMR WebSocket with undefined port
    if (typeof url === 'string' && url.includes('localhost:undefined')) {
      // Replace undefined with the correct port (5000)
      const fixedUrl = url.replace('localhost:undefined', 'localhost:5000');
      console.log(`[HMR Fix] Correcting WebSocket URL from ${url} to ${fixedUrl}`);
      return new originalWebSocket(fixedUrl, protocols);
    }
    return new originalWebSocket(url, protocols);
  } as any;
  
  // Preserve WebSocket prototype and static properties
  window.WebSocket.prototype = originalWebSocket.prototype;
  Object.setPrototypeOf(window.WebSocket, originalWebSocket);
  
  // Copy static properties
  for (const key in originalWebSocket) {
    if (originalWebSocket.hasOwnProperty(key)) {
      (window.WebSocket as any)[key] = (originalWebSocket as any)[key];
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
