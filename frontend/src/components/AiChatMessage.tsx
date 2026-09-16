"use client";

interface AiChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export default function AiChatMessage({ role, content, timestamp }: AiChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} ai-msg-enter`}
      style={{ animation: "ai-fade-in 0.3s ease-out" }}
    >
      <div className={`max-w-[80%] ${isUser ? "order-1" : ""}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5 ml-1">
            <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center text-xs">
              ✨
            </div>
            <span className="text-xs font-medium text-purple-400">AstroSeva AI</span>
          </div>
        )}
        <div className={`px-4 py-3 ${isUser ? "ai-bubble-user" : "ai-bubble-assistant"}`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
        </div>
        {timestamp && (
          <div className={`text-[10px] text-white/20 mt-1 ${isUser ? "text-right mr-1" : "ml-1"}`}>
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
