"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

interface Advisor {
  id: string;
  name: string;
  model: string;
  persona: string;
  shortPersona: string;
  enabled: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  advisor?: string;
  timestamp: Date;
}

interface AdvisorResponse {
  advisor: string;
  content: string;
  error?: string;
}

const DEFAULT_ADVISORS: Advisor[] = [
  {
    id: "claude",
    name: "Claude",
    model: "claude-sonnet-4-20250514",
    persona: "You are a thoughtful strategic advisor who excels at nuanced analysis, considering multiple perspectives, and identifying potential blind spots. You balance optimism with healthy skepticism and are known for asking clarifying questions that reveal deeper insights.",
    shortPersona: "Nuanced strategist · Sees blind spots",
    enabled: true,
  },
  {
    id: "gpt",
    name: "GPT",
    model: "gpt-4o",
    persona: "You are a pragmatic, solutions-oriented advisor who focuses on actionable frameworks and proven methodologies. You excel at breaking down complex problems into concrete steps and draw from a wide range of business case studies.",
    shortPersona: "Pragmatic executor · Framework builder",
    enabled: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    model: "gemini-2.0-flash",
    persona: "You are an analytical advisor with deep technical and research capabilities. You excel at synthesizing information from multiple domains, identifying patterns, and providing data-driven insights. You often surface relevant research or technical considerations others might miss.",
    shortPersona: "Deep researcher · Pattern finder",
    enabled: true,
  },
  {
    id: "grok",
    name: "Grok",
    model: "grok-beta",
    persona: "You are a contrarian advisor who challenges conventional thinking and stress-tests assumptions. You're direct, sometimes provocative, and willing to voice unpopular opinions. You push back on groupthink and ask uncomfortable questions.",
    shortPersona: "Contrarian · Assumption challenger",
    enabled: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    model: "deepseek-chat",
    persona: "You are a methodical advisor who excels at deep reasoning and thorough analysis. You approach problems systematically, considering edge cases and long-term implications. You're particularly strong at technical and logical analysis.",
    shortPersona: "Deep reasoner · Edge case hunter",
    enabled: true,
  },
];

export default function RoundtablePage() {
  const [advisors, setAdvisors] = useState<Advisor[]>(DEFAULT_ADVISORS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAdvisors, setLoadingAdvisors] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleAdvisor = (id: string) => {
    setAdvisors((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const toggleCardExpansion = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const enabledAdvisors = advisors.filter((a) => a.enabled);
    setLoadingAdvisors(new Set(enabledAdvisors.map((a) => a.id)));

    // Build conversation history for context
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.advisor ? `[${m.advisor}]: ${m.content}` : m.content,
    }));

    // Call API for each enabled advisor
    const responses = await Promise.allSettled(
      enabledAdvisors.map(async (advisor) => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              advisor: advisor.id,
              model: advisor.model,
              persona: advisor.persona,
              message: userMessage.content,
              history: conversationHistory,
            }),
          });

          if (!res.ok) {
            const error = await res.text();
            throw new Error(error || "Failed to get response");
          }

          const data = await res.json();
          
          // Remove from loading set as soon as we get the response
          setLoadingAdvisors((prev) => {
            const next = new Set(prev);
            next.delete(advisor.id);
            return next;
          });

          // Add message immediately
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.content,
            advisor: advisor.name,
            timestamp: new Date(),
          };
          
          setMessages((prev) => [...prev, assistantMessage]);

          return { advisor: advisor.name, content: data.content };
        } catch (error) {
          setLoadingAdvisors((prev) => {
            const next = new Set(prev);
            next.delete(advisor.id);
            return next;
          });

          const errorMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Unable to respond: ${error instanceof Error ? error.message : "Unknown error"}`,
            advisor: advisor.name,
            timestamp: new Date(),
          };
          
          setMessages((prev) => [...prev, errorMessage]);

          return {
            advisor: advisor.name,
            content: "",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    setIsLoading(false);
    setLoadingAdvisors(new Set());
  };

  const clearChat = () => {
    setMessages([]);
  };

  const getAdvisorClass = (advisorName: string) => {
    const id = advisorName.toLowerCase();
    if (id.includes("claude")) return "advisor-claude";
    if (id.includes("gpt")) return "advisor-gpt";
    if (id.includes("gemini")) return "advisor-gemini";
    if (id.includes("grok")) return "advisor-grok";
    if (id.includes("deepseek")) return "advisor-deepseek";
    return "advisor-claude";
  };

  const formatContent = (content: string) => {
    // Basic markdown-like formatting
    return content
      .split("\n\n")
      .map((para, i) => <p key={i}>{para}</p>);
  };

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-obsidian-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brass-400 to-brass-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-obsidian-950" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-white tracking-wide">
                Roundtable
              </h1>
              <p className="text-xs text-white/40 font-light tracking-widest uppercase">
                Advisory Council
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {showSettings ? "Hide" : "Show"} Advisors
            </button>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Advisor Toggle Bar */}
        {showSettings && (
          <div className="border-t border-white/5 bg-obsidian-900/50">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex flex-wrap gap-3">
                {advisors.map((advisor) => (
                  <button
                    key={advisor.id}
                    onClick={() => toggleAdvisor(advisor.id)}
                    className={`advisor-card ${getAdvisorClass(advisor.name)} px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      advisor.enabled ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    <span
                      className={`status-dot w-2 h-2 rounded-full ${
                        advisor.enabled ? "" : "!bg-white/20 !shadow-none"
                      }`}
                    />
                    <span className="text-sm font-medium">{advisor.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-3">
                Click to toggle advisors on/off. Each brings a unique perspective to the roundtable.
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-brass-400/20 to-brass-600/20 flex items-center justify-center border border-brass-400/20">
                <Sparkles className="w-8 h-8 text-brass-400" />
              </div>
              <h2 className="font-display text-3xl text-white mb-3">
                Convene Your Council
              </h2>
              <p className="text-white/50 max-w-md mx-auto">
                Pose a question or challenge to your advisory roundtable. Each AI brings a distinct perspective—from pragmatic execution to contrarian challenge.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {advisors.filter(a => a.enabled).slice(0, 3).map((advisor) => (
                  <div
                    key={advisor.id}
                    className={`advisor-card ${getAdvisorClass(advisor.name)} p-4 rounded-xl text-left`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="status-dot w-2 h-2 rounded-full" />
                      <span className="font-medium text-white">{advisor.name}</span>
                    </div>
                    <p className="text-xs text-white/50">{advisor.shortPersona}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {message.role === "user" ? (
                    <div className="flex justify-end mb-6">
                      <div className="bg-brass-500/20 border border-brass-500/30 rounded-2xl rounded-br-sm px-5 py-3 max-w-2xl">
                        <p className="text-white">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`advisor-card ${getAdvisorClass(message.advisor || "")} rounded-2xl overflow-hidden`}
                    >
                      <div
                        className="px-5 py-3 border-b border-white/5 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleCardExpansion(message.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="status-dot w-2 h-2 rounded-full" />
                          <span className="font-medium text-white">
                            {message.advisor}
                          </span>
                          <span className="text-xs text-white/30">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {expandedCards.has(message.id) ? (
                          <ChevronUp className="w-4 h-4 text-white/40" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white/40" />
                        )}
                      </div>
                      <div
                        className={`px-5 py-4 response-content text-white/80 text-sm leading-relaxed transition-all ${
                          expandedCards.has(message.id)
                            ? ""
                            : "max-h-32 overflow-hidden relative"
                        }`}
                      >
                        {formatContent(message.content)}
                        {!expandedCards.has(message.id) && (
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-obsidian-900/90 to-transparent" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicators */}
              {loadingAdvisors.size > 0 && (
                <div className="space-y-4">
                  {Array.from(loadingAdvisors).map((advisorId) => {
                    const advisor = advisors.find((a) => a.id === advisorId);
                    if (!advisor) return null;
                    return (
                      <div
                        key={advisorId}
                        className={`advisor-card ${getAdvisorClass(advisor.name)} rounded-2xl overflow-hidden opacity-70`}
                      >
                        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                          <span className="status-dot w-2 h-2 rounded-full animate-pulse" />
                          <span className="font-medium text-white">
                            {advisor.name}
                          </span>
                        </div>
                        <div className="px-5 py-4 flex items-center gap-2">
                          <div className="thinking-dots">
                            <span />
                            <span />
                            <span />
                          </div>
                          <span className="text-white/40 text-sm">Thinking...</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="border-t border-white/10 bg-obsidian-950/90 backdrop-blur-md sticky bottom-0">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pose a question to your advisory council..."
              className="chat-input flex-1 px-5 py-3 rounded-xl text-white placeholder-white/30"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-brass-500 to-brass-600 text-obsidian-950 font-medium rounded-xl flex items-center gap-2 hover:from-brass-400 hover:to-brass-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          <p className="text-center text-xs text-white/20 mt-3">
            {advisors.filter((a) => a.enabled).length} advisors active ·{" "}
            Responses may vary in speed based on each model's API
          </p>
        </div>
      </footer>
    </div>
  );
}
