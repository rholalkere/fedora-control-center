import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Download, Trash2, Send, Cpu } from 'lucide-react';
import { api } from '@/services/api';
import { useNotificationStore } from '@/store/notifications';
import { useAuthStore } from '@/store/auth';
import { useTelemetry } from '@/hooks/useTelemetry';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { TableSkeleton } from '@/components/ui/Loading';

export function AI() {
  const queryClient = useQueryClient();
  const { addToast } = useNotificationStore();
  const { role } = useAuthStore();
  const { metrics } = useTelemetry();

  // Selected states
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [modelToPull, setModelToPull] = useState('');
  
  // Chat response states
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [isInferenceLoading, setIsInferenceLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isInferenceLoading]);

  const isAdmin = role === 'admin';

  // 1. Get models list query
  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['ai-models'],
    queryFn: api.getAIModels,
  });

  useEffect(() => {
    const data = modelsData as any;
    if (data?.models && data.models.length > 0 && !selectedModel) {
      setSelectedModel(data.models[0].name);
    }
  }, [modelsData, selectedModel]);

  // 2. Pull model mutation
  const pullMutation = useMutation({
    mutationFn: (name: string) => api.pullAIModel(name),
    onSuccess: () => {
      addToast(`Pull request submitted for model: ${modelToPull}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      setModelToPull('');
    },
    onError: (err: any) => {
      addToast(`Failed to pull model: ${err.message}`, 'error');
    }
  });

  // 3. Delete model mutation
  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteAIModel(name),
    onSuccess: (_, variables) => {
      addToast(`Model ${variables} deleted successfully.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
    },
    onError: (err: any) => {
      addToast(`Failed to delete model: ${err.message}`, 'error');
    }
  });

  const handlePullSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      addToast('Administrator role required to pull AI models.', 'error');
      return;
    }
    pullMutation.mutate(modelToPull);
  };

  const handleDeleteModel = (name: string) => {
    if (!isAdmin) {
      addToast('Administrator role required to delete AI models.', 'error');
      return;
    }
    deleteMutation.mutate(name);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel) {
      addToast('Please select an LLM model first.', 'info');
      return;
    }
    const userPrompt = prompt.trim();
    if (!userPrompt) return;

    setPrompt('');
    setMessages((prev) => [...prev, { sender: 'user', text: userPrompt }]);
    setIsInferenceLoading(true);

    try {
      const res = await api.generateAIResponse(selectedModel, userPrompt);
      setMessages((prev) => [...prev, { sender: 'ai', text: res.response }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { sender: 'ai', text: `Error generating response: ${err.message}` }]);
    } finally {
      setIsInferenceLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className="space-y-6 overflow-y-auto h-full pb-10 pr-2">
      {/* GPU metrics summary */}
      {metrics?.gpu && metrics.gpu.length > 0 && (
        <Card className="p-4 bg-slate-50 dark:bg-card flex items-center justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
              <Cpu size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                GPU Engine Accelerator Detected
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Model: {metrics.gpu[0].model} ({metrics.gpu[0].vendor})
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-semibold">
            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">GPU Load</p>
              <p className="text-slate-800 dark:text-slate-200 mt-0.5">{metrics.gpu[0].load_percent}%</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">VRAM Allocated</p>
              <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                {((metrics.gpu[0].memory_used) / (1024 * 1024 * 1024)).toFixed(1)} GB / {((metrics.gpu[0].memory_total) / (1024 * 1024 * 1024)).toFixed(1)} GB
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid: Chat vs Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LLM Chat Playground */}
        <Card className="lg:col-span-2 flex flex-col min-h-[520px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Brain size={18} className="text-fedora-blue" />
              <span>Ollama AI Completion Playground</span>
            </CardTitle>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900"
                title="Clear conversation"
              >
                <Trash2 size={13} />
                <span>Clear Chat</span>
              </button>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {/* Model Selector */}
            <div className="flex gap-4 items-center">
              <label className="text-xs font-semibold text-slate-500 shrink-0">Active Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
              >
                {(modelsData as any)?.models?.length === 0 ? (
                  <option value="">No models downloaded</option>
                ) : (
                  (modelsData as any)?.models?.map((m: any) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))
                )}
              </select>
            </div>

            {/* Chat Response Area */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 p-4 rounded-xl text-xs overflow-y-auto min-h-[300px] flex flex-col gap-4 max-h-[400px]">
              {messages.length === 0 ? (
                <div className="text-slate-400 dark:text-slate-500 italic my-auto text-center font-sans">
                  No conversation history yet. Ask the AI assistant a system administration question.
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[85%] rounded-xl px-4 py-2.5 shadow-sm ${
                      msg.sender === 'user'
                        ? 'ml-auto bg-fedora-blue/10 text-slate-800 dark:text-slate-200 border border-fedora-blue/20'
                        : 'mr-auto bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800/80'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-60">
                      {msg.sender === 'user' ? 'You' : 'Fedora AI Assistant'}
                    </span>
                    <div className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800 dark:text-slate-200">{msg.text}</div>
                  </div>
                ))
              )}
              {isInferenceLoading && (
                <div className="mr-auto max-w-[85%] rounded-xl px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800/80 flex flex-col shadow-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-60">Fedora AI Assistant</span>
                  <div className="flex space-x-1.5 items-center py-1">
                    <div className="w-2 h-2 bg-fedora-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-fedora-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-fedora-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Prompt input Form */}
            <form onSubmit={handleGenerate} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Ask Ollama something (e.g. Write a script to audit sshd logs)..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
              />
              <button
                type="submit"
                disabled={isInferenceLoading || !selectedModel}
                className="flex items-center gap-1.5 px-4 py-2 bg-fedora-blue hover:bg-fedora-blue/90 disabled:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                <Send size={12} />
                <span>{isInferenceLoading ? 'Running...' : 'Run'}</span>
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Model Pull/Management Side Card */}
        <div className="space-y-6">
          {/* Pull Model Form */}
          <Card className="p-4 bg-slate-50 dark:bg-card">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Download size={14} />
              <span>Pull Model</span>
            </h4>
            <form onSubmit={handlePullSubmit} className="space-y-3">
              <input
                type="text"
                required
                placeholder="e.g. llama3.1:8b"
                value={modelToPull}
                onChange={(e) => setModelToPull(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-fedora-blue transition-all"
              />
              <button
                type="submit"
                disabled={pullMutation.isPending}
                className="w-full bg-fedora-blue hover:bg-fedora-blue/90 disabled:bg-slate-800 text-white font-semibold text-xs py-2 rounded-lg transition-colors"
              >
                {pullMutation.isPending ? 'Submitting...' : 'Download model'}
              </button>
            </form>
          </Card>

          {/* Installed Models list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Downloaded Models</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-60 overflow-y-auto">
              {isLoading ? (
                <TableSkeleton rows={2} />
              ) : (modelsData as any)?.models?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No downloaded models found.</p>
              ) : (
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2.5 px-3">Name</TableHead>
                    <TableHead className="py-2.5 px-3">Size</TableHead>
                    <TableHead className="py-2.5 px-3 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(modelsData as any)?.models?.map((model: any) => (
                    <TableRow key={model.name}>
                      <TableCell className="py-2.5 px-3 font-semibold text-xs">{model.name}</TableCell>
                      <TableCell className="py-2.5 px-3 text-[10px] text-slate-500">{formatSize(model.size)}</TableCell>
                      <TableCell className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteModel(model.name)}
                          disabled={deleteMutation.isPending}
                          className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete Model"
                        >
                          <Trash2 size={13} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
