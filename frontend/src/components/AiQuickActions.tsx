"use client";

interface QuickAction {
  label: string;
  message: string;
  icon?: string;
}

interface AiQuickActionsProps {
  onAction: (message: string) => void;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: "Analyze Chart", message: "Analyze my birth chart in detail", icon: "\U0001f52d" },
  { label: "Check Doshas", message: "Check my doshas and their effects", icon: "\u26a0\ufe0f" },
  { label: "Marriage", message: "How are my marriage prospects?", icon: "\U0001f492" },
  { label: "Career", message: "What does my chart say about career?", icon: "\U0001f4bc" },
  { label: "Health", message: "What are the health indicators in my chart?", icon: "\u2764\ufe0f" },
  { label: "Finance", message: "What does my chart say about finances?", icon: "\U0001f4b0" },
  { label: "Remedies", message: "What remedies do you recommend for me?", icon: "\U0001f54c" },
  { label: "Panchang", message: "Tell me about today's Panchang", icon: "\U0001f570\ufe0f" },
];

export default function AiQuickActions({ onAction }: AiQuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {DEFAULT_ACTIONS.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action.message)}
          className="ai-chip flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full"
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
