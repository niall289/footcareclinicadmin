import React, { createContext, useContext, useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define WebSocket event types
type WebSocketEvent = {
  type: string;
  data?: any;
};

type WebSocketContextType = {
  connected: boolean;
  lastEvent: WebSocketEvent | null;
};

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  lastEvent: null
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Connect to WebSocket server
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    // Set up event handlers
    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
      toast({
        title: "Connected to server",
        description: "You will receive real-time updates from the chatbot.",
      });
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setConnected(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        setSocket(null);
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to server for real-time updates.",
        variant: "destructive",
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message:", data);
        setLastEvent(data);

        // Handle different event types
        switch(data.type) {
          case 'new_assessment':
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/trends'] });
            queryClient.invalidateQueries({ queryKey: ['/api/assessments'] });
            toast({
              title: "New Assessment",
              description: `Patient ${data.data.patientName} completed an assessment.`,
            });
            break;
            
          case 'flagged_response':
            queryClient.invalidateQueries({ queryKey: ['/api/responses/flagged'] });
            toast({
              title: "Flagged Response",
              description: "A patient response has been flagged for review.",
              variant: "destructive"
            });
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    setSocket(ws);

    // Clean up on component unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [toast]);

  const contextValue = {
    connected,
    lastEvent
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);