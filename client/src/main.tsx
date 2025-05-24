import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { WebSocketProvider } from "@/components/ui/websocket";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="foot-care-theme">
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
