"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, RotateCcw, ChevronDown, ChevronUp, Swords, MessageSquare } from "lucide-react";

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
  role: "user" | "assistant" | "system";
  content: string;
  advisor?: string;
  timestamp: Date;
  isConsensus?: boolean;
  round?: number;
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
    model: "grok-3",
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
    enabled: false,
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
  const [debateMode, setDebateMode] = useState(false);
  const [debateRounds, setDebateRounds] = useState(2);
  const [currentRound, setCurrentRound] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
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

  const callAdvisor = async (
    advisor: Advisor,
    message: string,
    history: { role: string; content: string }[],
    round?: number
  ): Promise<{ advisor: string; content: string; error?: string }> => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor: advisor.id,
          model: advisor.model,
          persona: advisor.persona,
          message,
          history,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to get response");
      }

      const data = await res.json();
      return { advisor: advisor.name, content: data.content };
    } catch (error) {
      return {
        advisor: advisor.name,
        content: `Unable to respond: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const synthesizeConsensus = async (
    allResponses: { advisor: string; content: string; round: number }[]
  ): Promise<string> => {
    const synthesisPrompt = `You are a neutral moderator synthesizing a multi-round debate between AI advisors.

Here are all the responses from the debate:

${allResponses.map((r) => `[${r.advisor} - Round ${r.round}]:\n${r.content}`).join("\n\n---\n\n")}

Based on this discussion, identify the TOP 5 POINTS OF AGREEMENT among the advisors. For each point:
1. State the consensus clearly
2. Note which advisors explicitly or implicitly agreed
3. Rate the strength of agreement (Strong/Moderate/Emerging)

Format your response as:

## Consensus Points

**1. [Point Title]**
[Description of the agreement]
- Supporters: [List advisors]
- Strength: [Strong/Moderate/Emerging]

[Continue for all 5 points]

## Notable Disagreements
[Brief summary of key points where advisors diverged]`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor: "claude",
          model: "claude-sonnet-4-20250514",
          persona: "You are a neutral, objective moderator skilled at identifying consensus and synthesizing complex discussions.",
          message: synthesisPrompt,
          history: [],
        }),
      });

      if (!res.ok) throw new Error("Failed to synthesize");
      const data = await res.json();
      return data.content;
    } catch (error) {
      return "Unable to synthesize consensus. Please review the responses manually.";
    }
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
    const allDebateResponses: { advisor: string; content: string; round: number }[] = [];
    
    if (debateMode) {
      // DEBATE MODE
      let previousRoundResponses: { advisor: string; content: string }[] = [];
      
      for (let round = 1; round <= debateRounds; round++) {
        setCurrentRound(round);
        setLoadingAdvisors(new Set(enabledAdvisors.map((a) => a.id)));

        // Add round indicator
        const roundMessage: Message = {
          id: crypto.randomUUID(),
          role: "system",
          content: `Round ${round} of ${debateRounds}`,
          timestamp: new Date(),
          round,
        };
        setMessages((prev) => [...prev, roundMessage]);

        let prompt = userMessage.content;
        
        if (round > 1 && previousRoundResponses.length > 0) {
          // Include previous round's responses for advisors to respond to
          prompt = `Original question: ${userMessage.content}

Here are the responses from the previous round. Please respond to the other advisors' points - agree, disagree, build on their ideas, or challenge their assumptions:

${previousRoundResponses.map((r) => `[${r.advisor}]: ${r.content}`).join("\n\n")}

Now provide your response for Round ${round}, engaging with the other advisors' perspectives.`;
        }

        const roundResponses: { advisor: string; content: string }[] = [];

        // Get responses from all advisors in parallel
        const responses = await Promise.all(
          enabledAdvisors.map(async (advisor) => {
            const result = await callAdvisor(advisor, prompt, [], round);
            
            setLoadingAdvisors((prev) => {
              const next = new Set(prev);
              next.delete(advisor.id);
              return next;
            });

            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: result.content,
              advisor: advisor.name,
              timestamp: new Date(),
              round,
            };
            setMessages((prev) => [...prev, assistantMessage]);

            return result;
          })
        );

        responses.forEach((r) => {
          roundResponses.push({ advisor: r.advisor, content: r.content });
          allDebateResponses.push({ advisor: r.advisor, content: r.content, round });
        });

        previousRoundResponses = roundResponses;
      }

      // Synthesize consensus
      setIsSynthesizing(true);
      setCurrentRound(0);
      
      const consensusMessage: Message = {
        id: crypto.randomUUID(),
        role: "system",
        content: "Synthesizing consensus...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, consensusMessage]);

      const consensus = await synthesizeConsensus(allDebateResponses);
      
      const consensusResultMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: consensus,
        advisor: "Moderator",
        timestamp: new Date(),
        isConsensus: true,
      };
      setMessages((prev) => [...prev.slice(0, -1), consensusResultMessage]);
      
      setIsSynthesizing(false);
    } else {
      // NORMAL MODE - Single round, no debate
      setLoadingAdvisors(new Set(enabledAdvisors.map((a) => a.id)));

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.advisor ? `[${m.advisor}]: ${m.content}` : m.content,
      }));

      await Promise.all(
        enabledAdvisors.map(async (advisor) => {
          const result = await callAdvisor(advisor, userMessage.content, conversationHistory);
          
          setLoadingAdvisors((prev) => {
            const next = new Set(prev);
            next.delete(advisor.id);
            return next;
          });

          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.content,
            advisor: advisor.name,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        })
      );
    }

    setIsLoading(false);
    setLoadingAdvisors(new Set());
    setCurrentRound(0);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentRound(0);
  };

  const getAdvisorClass = (advisorName: string) => {
    const id = advisorName.toLowerCase();
    if (id.includes("claude")) return "advisor-claude";
    if (id.includes("gpt")) return "advisor-gpt";
    if (id.includes("gemini")) return "advisor-gemini";
    if (id.includes("grok")) return "advisor-grok";
    if (id.includes("deepseek")) return "advisor-deepseek";
    if (id.includes("moderator")) return "advisor-moderator";
    return "advisor-claude";
  };

  const formatContent = (content: string) => {
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
            {/* Debate Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDebateMode(!debateMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                  debateMode
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {debateMode ? <Swords className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                {debateMode ? "Debate" : "Chat"}
              </button>
              
              {debateMode && (
                <select
                  value={debateRounds}
                  onChange={(e) => setDebateRounds(Number(e.target.value))}
                  className="bg-obsidian-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/80"
                >
                  <option value={1}>1 round</option>
                  <option value={2}>2 rounds</option>
                  <option value={3}>3 rounds</option>
                </select>
              )}
            </div>

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
                {debateMode 
                  ? `Debate mode: Advisors will discuss for ${debateRounds} round${debateRounds > 1 ? 's' : ''}, then consensus points will be synthesized.`
                  : "Click to toggle advisors on/off. Each brings a unique perspective to the roundtable."
                }
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
                {debateMode ? (
                  <Swords className="w-8 h-8 text-brass-400" />
                ) : (
                  <Sparkles className="w-8 h-8 text-brass-400" />
                )}
              </div>
              <h2 className="font-display text-3xl text-white mb-3">
                {debateMode ? "Start a Debate" : "Convene Your Council"}
              </h2>
              <p className="text-white/50 max-w-md mx-auto">
                {debateMode 
                  ? `Pose a question and your advisors will debate for ${debateRounds} round${debateRounds > 1 ? 's' : ''}, then I'll synthesize their points of agreement.`
                  : "Pose a question or challenge to your advisory roundtable. Each AI brings a distinct perspective—from pragmatic execution to contrarian challenge."
                }
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
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
                >
                  {message.role === "user" ? (
                    <div className="flex justify-end mb-6">
                      <div className="bg-brass-500/20 border border-brass-500/30 rounded-2xl rounded-br-sm px-5 py-3 max-w-2xl">
                        <p className="text-white">{message.content}</p>
                      </div>
                    </div>
                  ) : message.role === "system" ? (
                    <div className="flex justify-center my-4">
                      <div className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 font-medium">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`advisor-card ${getAdvisorClass(message.advisor || "")} rounded-2xl overflow-hidden ${
                        message.isConsensus ? "ring-2 ring-amber-500/50" : ""
                      }`}
                    >
                      <div
                        className="px-5 py-3 border-b border-white/5 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleCardExpansion(message.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="status-dot w-2 h-2 rounded-full" />
                          <span className="font-medium text-white">
                            {message.advisor}
                            {message.isConsensus && (
                              <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                                Consensus
                              </span>
                            )}
                          </span>
                          {message.round && (
                            <span className="text-xs text-white/30 ml-2">
                              Round {message.round}
                            </span>
                          )}
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
                          expandedCards.has(message.id) || message.isConsensus
                            ? ""
                            : "max-h-32 overflow-hidden relative"
                        }`}
                      >
                        {formatContent(message.content)}
                        {!expandedCards.has(message.id) && !message.isConsensus && (
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
                  {currentRound > 0 && (
                    <div className="text-center text-white/40 text-sm mb-2">
                      Round {currentRound} of {debateRounds}
                    </div>
                  )}
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
                          <span className="text-white/40 text-sm">
                            {currentRound > 1 ? "Responding to others..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Synthesizing indicator */}
              {isSynthesizing && (
                <div className="advisor-card advisor-moderator rounded-2xl overflow-hidden opacity-70">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                    <span className="status-dot w-2 h-2 rounded-full animate-pulse" />
                    <span className="font-medium text-white">Moderator</span>
                  </div>
                  <div className="px-5 py-4 flex items-center gap-2">
                    <div className="thinking-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="text-white/40 text-sm">Synthesizing consensus points...</span>
                  </div>
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
              placeholder={debateMode ? "Pose a question for debate..." : "Pose a question to your advisory council..."}
              className="chat-input flex-1 px-5 py-3 rounded-xl text-white placeholder-white/30"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-brass-500 to-brass-600 text-obsidian-950 font-medium rounded-xl flex items-center gap-2 hover:from-brass-400 hover:to-brass-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{debateMode ? "Debate" : "Send"}</span>
            </button>
          </form>
          <p className="text-center text-xs text-white/20 mt-3">
            {advisors.filter((a) => a.enabled).length} advisors active
            {debateMode && ` · ${debateRounds}-round debate mode`}
          </p>
        </div>
      </footer>
    </div>
  );
}
