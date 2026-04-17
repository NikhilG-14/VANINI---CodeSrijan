import { createContext, useContext, useEffect, useState } from "react";

const backendUrl = "http://localhost:3001";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [sessionContext, setSessionContext] = useState(null);
  const [userId, setUserId] = useState(null);

  const chat = async (text, overrideContext = null, overrideUserId = null) => {
    setLoading(true);
    const contextToUse = overrideContext || sessionContext;
    const userToUse = overrideUserId || userId;
    
    try {
      const history = messages.slice(-4).map(m => ({
        role: m.fromUser ? "user" : "assistant",
        content: m.text
      }));

      const respRaw = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: text, 
          context: contextToUse, 
          userId: userToUse,
          history: history
        }),
      });
      if (!respRaw.ok) {
        throw new Error("Backend error");
      }
      const data = await respRaw.json();
      const resp = data.messages;
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
    const dataParam = params.get('sessionData');
    if (dataParam) {
      try {
        const decoded = decodeURIComponent(atob(dataParam));
        const parsed = JSON.parse(decoded);
        
        // Extract vimid (UserId) for deep memory fetch
        if (parsed.vimid) {
          setUserId(parsed.vimid);
        }

        // Formulate a dense clinical context string
        const scoreStr = Object.entries(parsed.scores || {})
          .map(([k, v]) => `${k.toUpperCase()} focus level: ${v}%`)
          .join(', ');
        
        const telStr = (parsed.telemetry || [])
          .map(t => `${t.game} session (Reaction Time: ${t.rt}ms, Error count: ${t.errors})`)
          .join('; ');

        const finalContext = `[HISTORICAL_COGNITIVE_MEMOIR]:\n(Refer to this as the user's journey baseline)\n\n[NEW_SESSION_METRICS]:\n(Cite specific examples from this data)\nScores: ${scoreStr}\nTelemetry: ${telStr}`;
        setSessionContext(finalContext);
        
        // Auto-greet after a short delay using the FRESH context directly
        setTimeout(() => {
          chat("", finalContext, parsed.vimid); // Pass directly to avoid state closure delay
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
