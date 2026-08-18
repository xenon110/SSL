"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AiCfoPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'model', content: "Hello. I am SamridhiPrime AI, your virtual Chief Financial Officer. I am connected directly to your live Tally database. How can I assist you with your finances today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to get AI response");
      }

      setMessages([...newMessages, { role: 'model', content: data.reply, chart: data.chart }]);
    } catch (err: any) {
      setMessages([...newMessages, { role: 'model', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part.split('\\n').map((line, j) => <React.Fragment key={j}>{line}<br/></React.Fragment>)}</span>;
    });
  };

  const renderChart = (chart: any) => {
    if (!chart || !chart.data || chart.data.length === 0) return null;

    return (
      <div className="mt-6 bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm w-full max-w-xl">
        <h4 className="text-sm font-bold text-slate-600 mb-4">{chart.title || "Financial Visualization"}</h4>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === 'pie' ? (
              <PieChart>
                <Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#4f46e5" label>
                  {chart.data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `₹${val > 1000 ? (val/1000).toFixed(1) + 'k' : val}`} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {chart.data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto p-4 md:p-8">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-t-3xl border-b border-x border-t shadow-sm shrink-0">
          <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-2xl">
                 <Bot className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                  <h1 className="text-2xl font-black text-slate-900 flex items-center">
                     AI CFO <Sparkles className="w-5 h-5 text-amber-500 ml-2 animate-pulse" />
                  </h1>
                  <p className="text-sm font-medium text-emerald-600 flex items-center mt-1">
                     <Activity className="w-4 h-4 mr-1" />
                     Live Connection to Tally ERP Database Active
                  </p>
              </div>
          </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-slate-50 border-x border-b rounded-b-3xl overflow-hidden flex flex-col shadow-sm">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
             {messages.map((m, idx) => (
                 <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-4`}>
                         
                         {/* Avatar */}
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                             {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
                         </div>

                         {/* Message Bubble */}
                         <div className="flex flex-col">
                             <div className={`p-5 rounded-3xl ${m.role === 'user' ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-sm shadow-sm' : 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tl-sm'}`}>
                                 <div className="text-base leading-relaxed whitespace-pre-wrap">
                                     {formatText(m.content)}
                                 </div>
                             </div>
                             {m.chart && renderChart(m.chart)}
                         </div>
                     </div>
                 </div>
             ))}
             
             {isLoading && (
                 <div className="flex justify-start">
                     <div className="flex flex-row items-start gap-4">
                         <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                             <Bot className="w-6 h-6" />
                         </div>
                         <div className="p-5 rounded-3xl bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tl-sm flex items-center space-x-2">
                             <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                             <span className="text-indigo-600/80 font-medium animate-pulse">Analyzing Financials...</span>
                         </div>
                     </div>
                 </div>
             )}
             <div ref={endOfMessagesRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
             <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center space-x-3 max-w-4xl mx-auto relative"
             >
                 <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your revenue, cash flow, top debtors, or overall health..."
                    className="flex-1 p-5 pr-16 bg-slate-50 border border-slate-200 rounded-full text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
                    disabled={isLoading}
                 />
                 <Button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 rounded-full w-12 h-12 p-0 bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all hover:scale-105"
                 >
                     <Send className="w-5 h-5 text-white ml-1" />
                 </Button>
             </form>
             <p className="text-center text-xs text-slate-400 mt-3">
                 AI CFO can make mistakes. Always verify critical financial numbers.
             </p>
          </div>
      </div>

    </div>
  );
}
