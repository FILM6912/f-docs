import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Play, Loader2, Code, Activity, Check, Copy, Box, Wrench, MessageSquare, Plus, Zap } from 'lucide-react';
import { McpResource, McpTool, McpPrompt } from '../hooks/useMcp';
import { JsonDisplay } from './JsonDisplay';
import { MarkdownDisplay } from './MarkdownDisplay';

// Badge Component
export const McpBadge: React.FC<{ type: 'RESOURCE' | 'TOOL' | 'PROMPT'; className?: string }> = ({ type, className = '' }) => {
  const colors = {
    RESOURCE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    TOOL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PROMPT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider border ${colors[type]} ${className}`}>
      {type}
    </span>
  );
};

export interface McpItemCardProps {
    type: 'RESOURCE' | 'TOOL' | 'PROMPT';
    data: any; // McpResource | McpTool | McpPrompt
    onRunTool?: (name: string, args: any) => Promise<any>;
    defaultOpen?: boolean;
    forcedOpen?: boolean; // For when used in focused view
}

export const McpItemCard: React.FC<McpItemCardProps> = ({ type, data, onRunTool, defaultOpen = false, forcedOpen = false }) => {
    const [isOpenState, setIsOpenState] = useState(defaultOpen);
    const isOpen = forcedOpen || isOpenState;
    const [showDescModal, setShowDescModal] = useState(false); // New state for modal
    // Tool Execution State
    const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'params' | 'auth'>('params');

    useEffect(() => {
        if (type === 'TOOL' && data.inputSchema?.properties) {
            const defaults: Record<string, any> = {};
            Object.keys(data.inputSchema.properties).forEach(key => {
                defaults[key] = '';
            });
            setToolArgs(defaults);
        }
    }, [data, type]);
    
    const theme = {
        RESOURCE: { 
            border: 'border-blue-500/20', 
            bg: 'bg-blue-500/10', 
            hover: 'hover:brightness-110', 
            text: 'text-blue-400',
            button: 'bg-blue-600 hover:bg-blue-500'
        },
        TOOL: { 
            border: 'border-emerald-500/20', 
            bg: 'bg-emerald-500/10', 
            hover: 'hover:brightness-110', 
            text: 'text-emerald-400',
            button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
        },
        PROMPT: { 
            border: 'border-purple-500/20', 
            bg: 'bg-purple-500/10', 
            hover: 'hover:brightness-110', 
            text: 'text-purple-400',
            button: 'bg-purple-600 hover:bg-purple-500'
        }
    }[type];

    const handleRunClick = async () => {
        if (!onRunTool) return;
        setIsExecuting(true);
        setExecutionResult(null);
        try {
            const result = await onRunTool(data.name, toolArgs);
            setExecutionResult(result);
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : String(e);
            setExecutionResult({ error: msg });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleInputChange = (key: string, value: any, type: string) => {
        setToolArgs(prev => ({
            ...prev,
            [key]: type === 'integer' || type === 'number' ? Number(value) : value
        }));
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const name = data.name;
    const description = data.description || (type === 'RESOURCE' ? data.uri : 'No description available.');

    return (
        <div className={`mb-4 rounded-lg border transition-all duration-200 ${isOpen && !forcedOpen ? 'ring-1 ring-opacity-50 shadow-lg' : ''} ${theme.border} bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none`}>
             {/* Header - Full colored bar like Swagger */}
             <div 
                className={`flex items-center justify-between p-3 px-4 select-none group ${theme.bg} ${!forcedOpen ? 'cursor-pointer hover:brightness-110' : ''} transition-all ${!isOpen ? 'rounded-lg' : 'rounded-t-lg'}`}
                onClick={!forcedOpen ? () => setIsOpenState(!isOpenState) : undefined}
            >
                <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
                    <div className="w-20 shrink-0">
                        <McpBadge type={type} className="shadow-sm w-full block text-center" />
                    </div>
                    <span className="font-mono text-zinc-700 dark:text-zinc-200 font-medium truncate min-w-0 flex-1 flex items-center gap-3">
                        <span className="opacity-90">{name}</span>
                    </span>
                </div>
                 {!forcedOpen && (
                    <div className="text-zinc-500 dark:text-zinc-400 transition-colors ml-4">
                        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                 )}
            </div>

            {isOpen && (
                <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-4 border-t border-zinc-200 dark:border-zinc-800/50 animate-in fade-in slide-in-from-top-1 rounded-b-lg">
                     
                     <div className="mb-6 px-1">
                         <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Description</h4>
                         
                         {(() => {
                             const descText = description || '';
                             const isLong = descText.split('\n').length > 5 || descText.length > 300;
                             
                             if (!isLong) {
                                  return <MarkdownDisplay content={description} className="text-sm dark:text-zinc-300 text-zinc-600" />;
                             }

                             return (
                                 <div className="relative">
                                     <div className="mask-image-gradient-b">
                                         <MarkdownDisplay content={description} className="text-sm dark:text-zinc-300 text-zinc-600 line-clamp-2" />
                                     </div>
                                     <div className="mt-2">
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); setShowDescModal(true); }}
                                            className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center group cursor-pointer"
                                         >
                                          <span className="shrink-0 text-[10px] bg-blue-50 hover:bg-blue-100 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-zinc-700/50 flex items-center gap-1 dark:group-hover:border-blue-500/30 transition-colors ml-2"><MessageSquare size={8} /> Read More</span>
                                         </button>
                                     </div>
                                     
                                     {/* Popup Modal */}
                                     {showDescModal && (
                                         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => {e.stopPropagation(); setShowDescModal(false);}}>
                                             <div 
                                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                 <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-xl">
                                                     <h3 className="font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                                                         <MessageSquare size={16} className="text-blue-500 dark:text-blue-400"/> 
                                                         Description
                                                     </h3>
                                                     <button 
                                                        onClick={(e) => {e.stopPropagation(); setShowDescModal(false);}}
                                                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                                     >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                                     </button>
                                                 </div>
                                                 <div className="p-6 overflow-y-auto custom-scrollbar">
                                                    <MarkdownDisplay content={description} className="text-sm text-zinc-600 dark:text-zinc-300" />
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             );
                         })()}
                     </div>

                     {/* --- RESOURCE VIEW --- */}
                     {type === 'RESOURCE' && (
                         <div className="space-y-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">URI</label>
                                     <div className="font-mono text-xs text-blue-600 dark:text-blue-300 bg-zinc-50 dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 mt-1 select-all break-all flex items-center justify-between group/uri">
                                         <span>{data.uri}</span>
                                         <button onClick={() => handleCopy(data.uri)} className="opacity-0 group-hover/uri:opacity-100 transition-opacity text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                                             {copied ? <Check size={12}/> : <Copy size={12}/>}
                                         </button>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">MIME Type</label>
                                     <div className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 font-mono bg-zinc-50 dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800">{data.mimeType || 'N/A'}</div>
                                 </div>
                             </div>
                         </div>
                     )}
                     
                     {/* --- TOOL EXECUTION VIEW --- */}
                     {type === 'TOOL' && (
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Request */}
                             <div className="space-y-0 flex flex-col">
                                 {/* Tab Header */}
                                 <div className="flex items-center justify-between mb-4">
                                     <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Request</h3>
                                     <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            <button 
                                            onClick={() => setActiveTab('params')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'params' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                         >
                                             Parameters
                                         </button>
                                         <button 
                                            onClick={() => setActiveTab('auth')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'auth' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                         >
                                             Authorization
                                         </button>
                                     </div>
                                 </div>

                                 <div className="flex-1 flex flex-col">
                                     {activeTab === 'params' ? (
                                        <div className="space-y-4 flex-1">
                                            {data.inputSchema?.properties && Object.keys(data.inputSchema.properties).length > 0 ? (
                                                <div className="space-y-3 bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-inner h-full">
                                                    {Object.entries(data.inputSchema.properties).map(([key, prop]: [string, any]) => (
                                                        <div key={key}>
                                                            <div className="flex items-baseline justify-between mb-1.5">
                                                                <label className="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                                                                    {key}
                                                                    {data.inputSchema?.required?.includes(key) && <span className="text-red-500 ml-0.5">*</span>}
                                                                </label>
                                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{prop.type}</span>
                                                            </div>
                                                            
                                                            {prop.type === 'boolean' ? (
                                                                <select
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                                                                    value={String(toolArgs[key])}
                                                                    onChange={(e) => handleInputChange(key, e.target.value === 'true', 'boolean')}
                                                                >
                                                                    <option value="true">True</option>
                                                                    <option value="false">False</option>
                                                                </select>
                                                            ) : (
                                                                <input 
                                                                    type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-colors"
                                                                    placeholder={prop.description || `Enter ${key}...`}
                                                                    value={toolArgs[key]}
                                                                    onChange={(e) => handleInputChange(key, e.target.value, prop.type)}
                                                                />
                                                            )}
                                                            {prop.description && <p className="text-[10px] text-zinc-500 mt-1">{prop.description}</p>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-zinc-500 italic flex items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950/50 h-full">
                                                    No parameters required
                                                </div>
                                            )}
                                        </div>
                                     ) : (
                                        <div className="text-xs text-zinc-500 italic flex items-center justify-center p-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950/50 h-full">
                                            No authorization schemes defined.
                                        </div>
                                     )}
                                     
                                     <button 
                                        onClick={handleRunClick}
                                        disabled={isExecuting}
                                        className={`w-full py-3 mt-4 text-white rounded font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${theme.button}`}
                                    >
                                        {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                        Execute
                                    </button>
                                 </div>
                             </div>

                             {/* Right Column: Response */}
                             <div className="flex flex-col h-full min-h-[400px]">
                                 <div className="flex items-center justify-between mb-4">
                                     <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Response</h3>
                                     <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                            <Zap size={10} fill="currentColor" /> Live
                                        </div>
                                        {executionResult && !executionResult.error && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 200 OK
                                            </div>
                                        )}
                                        {executionResult?.error && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Error
                                            </div>
                                        )}
                                     </div>
                                 </div>

                                 <div className="flex-1 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner relative flex flex-col">
                                     <div className="flex-1 p-4 overflow-auto custom-scrollbar">
                                         {!executionResult && !isExecuting && (
                                             <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 opacity-30 pointer-events-none">
                                                 <Activity size={48} className="mb-3" />
                                                 <p className="text-sm font-medium uppercase tracking-widest">Ready to execute</p>
                                             </div>
                                         )}
                                         {isExecuting && (
                                             <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 backdrop-blur-[1px] z-10">
                                                 <Loader2 size={32} className="animate-spin text-emerald-500" />
                                             </div>
                                         )}
                                         {executionResult && (
                                            <JsonDisplay data={executionResult} />
                                         )}
                                     </div>
                                 </div>
                             </div>
                         </div>
                     )}

                     {/* --- PROMPT VIEW --- */}
                      {type === 'PROMPT' && (
                           <div className="bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center">
                               <MessageSquare size={32} className="text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
                               <h5 className="text-zinc-600 dark:text-zinc-400 font-medium mb-1">Prompt Execution</h5>
                               <p className="text-xs text-zinc-500">Prompt testing is not yet supported in this interface.</p>
                           </div>
                      )}
                </div>
            )}
        </div>
    )
}
