import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = "http://localhost:3001";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [sessionContext, setSessionContext] = useState(null);

  const chat = async (text) => {
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, context: sessionContext }),
      });
      if (!data.ok) {
        throw new Error("Backend error");
      }
      const resp = (await data.json()).messages;
      setMessages((messages) => [...messages, ...resp]);
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for behavioral session data in URL
    const params = new URLSearchParams(window.location.search);
    const data = params.get('sessionData');
    if (data) {
      try {
        const decoded = atob(data);
        const parsed = JSON.parse(decoded);
        
        // Formulate a dense clinical context string
        const scoreStr = Object.entries(parsed.scores || {})
          .map(([k, v]) => `${k.toUpperCase()}: ${v}%`)
          .join(', ');
        
        const telStr = (parsed.telemetry || [])
          .map(t => `${t.game}(RT:${t.avgRT}ms, Err:${t.errors})`)
          .join('; ');

        const finalContext = `SCORES: ${scoreStr}\nTELEMETRY: ${telStr}`;
        setSessionContext(finalContext);
        
        // Auto-greet after a short delay
        setTimeout(() => {
          chat(""); // Sends blank to trigger greeting with context
        }, 1000);
      } catch (e) {
        console.error("Failed to parse session data:", e);
      }
    }
  }, []);

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
