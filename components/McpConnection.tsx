import React from 'react';
import { Database, Play, StopCircle, Loader2, Check } from 'lucide-react';

interface McpConnectionProps {
    url: string;
    setUrl: (url: string) => void;
    isConnected: boolean;
    isConnecting: boolean;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    authToken: string;
}

export const McpConnection: React.FC<McpConnectionProps> = ({
    url,
    setUrl,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    authToken
}) => {
    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-xl w-full space-y-6">
                <div className="text-center mb-8">
                    <Database className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-2">MCP Inspector</h1>
                    <p className="text-slate-400">Connect to your Model Context Protocol server</p>
                </div>

                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-2xl">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Server URL</label>
                            <input 
                                type="text" 
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full h-12 bg-slate-950 border border-slate-700 rounded-lg px-4 text-sm text-slate-200 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                                placeholder="http://localhost:8000/mcp"
                                disabled={isConnected || isConnecting}
                            />
                        </div>

                        {authToken && (
                            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded border border-emerald-500/20">
                                <Check size={14} />
                                <span>Authenticated</span>
                            </div>
                        )}

                        <button 
                            onClick={isConnected ? disconnect : connect}
                            disabled={isConnecting}
                            className={`w-full h-12 rounded-lg font-bold flex items-center justify-center gap-3 transition-all shadow-lg text-base ${
                                isConnected 
                                ? 'bg-red-500/10 text-red-400 border-2 border-red-500/20 hover:bg-red-500/20' 
                                : isConnecting 
                                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed border-2 border-slate-700'
                                    : 'bg-orange-600 hover:bg-orange-500 text-white border-2 border-orange-500 shadow-orange-900/20'
                            }`}
                        >
                            {isConnecting ? (
                                <><Loader2 size={20} className="animate-spin" /> Connecting...</>
                            ) : isConnected ? (
                                <><StopCircle size={20}/> Disconnect</>
                            ) : (
                                <><Play size={20} fill="currentColor"/> Connect</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
