import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Layers, Search, Box, Terminal, Zap, Globe, AlertCircle, ArrowRight, ChevronDown, ChevronRight, Lock, Unlock, X, ExternalLink, Loader2, Check, LayoutList, Sidebar, Settings, Activity, Radio, Database, Wrench, MessageSquare, Sun, Moon, Plus, Trash2, Send } from 'lucide-react';
import { useTheme } from './components/ThemeContext';
import { Endpoint, ApiTag, SecurityScheme, Method } from './types';
import { EndpointCard } from './components/EndpointCard';
import { parseOpenApi } from './services/openapiParser';
import { MethodBadge } from './components/MethodBadge';
import { WebSocketTester } from './components/WebSocketTester';
import { SocketIoTester } from './components/SocketIoTester';
import { useMcp, McpResource, McpTool, McpPrompt } from './hooks/useMcp';
import { McpConnection } from './components/McpConnection';
import { McpItemCard } from './components/McpItemCard'; // We will use this directly
import { useSocketIO } from './hooks/useSocketIO';
import { useWebSocket } from './hooks/useWebSocket';

// ... (TagSection, AuthModal, SettingsModal components remain exactly the same as before, skipping them to save space in the diff, but in reality they are here)
// However, since I must return the FULL file content in strict XML mode, I will paste the entire file including the parts that didn't change, 
// BUT wrapping the new navigation logic.

interface TagSectionProps {
    tag: ApiTag;
    endpoints: Endpoint[];
    baseUrl: string;
    securitySchemes?: Record<string, SecurityScheme>;
    authCredentials: Record<string, string>;
}

const TagSection: React.FC<TagSectionProps> = ({ 
    tag, 
    endpoints, 
    baseUrl,
    securitySchemes,
    authCredentials
}) => {
    const [isOpen, setIsOpen] = useState(true);

    if (endpoints.length === 0) return null;

    return (
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/30">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-200 dark:border-zinc-800"
            >
                <div className="flex items-baseline gap-3 overflow-hidden">
                    <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 truncate">{tag.name}</h3>
                    <p className="text-xs text-zinc-500 truncate hidden sm:block">{tag.description}</p>
                </div>
                <div className="text-zinc-500 dark:text-zinc-400">
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </button>
            
            {isOpen && (
                <div className="p-4 space-y-4">
                    {endpoints.map(endpoint => (
                        <EndpointCard 
                            key={endpoint.id} 
                            endpoint={endpoint} 
                            baseUrl={baseUrl} 
                            securitySchemes={securitySchemes}
                            authCredentials={authCredentials}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Auth Modal Component
interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseUrl: string;
    securitySchemes: Record<string, SecurityScheme>;
    credentials: Record<string, string>;
    setCredentials: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, baseUrl, securitySchemes, credentials, setCredentials }) => {
    // Local state for OAuth2 and Basic Auth forms: { schemeName: { username: '', password: '', ... } }
    const [oauthForms, setOauthForms] = useState<Record<string, Record<string, string>>>({});
    const [oauthLoading, setOauthLoading] = useState<Record<string, boolean>>({});
    const [oauthError, setOauthError] = useState<Record<string, string | null>>({});

    if (!isOpen) return null;

    const handleInputChange = (key: string, value: string) => {
        setCredentials(prev => ({ ...prev, [key]: value }));
    };

    const handleOauthFormChange = (schemeName: string, field: string, value: string) => {
        setOauthForms(prev => ({
            ...prev,
            [schemeName]: {
                ...(prev[schemeName] || {}),
                [field]: value
            }
        }));
    };

    const handleBasicAuthLogin = (schemeName: string) => {
        const formData = oauthForms[schemeName] || {};
        if (!formData.username || !formData.password) {
             setOauthError(prev => ({ ...prev, [schemeName]: "Username and password are required." }));
             return;
        }
        
        // Basic Auth: base64(username:password)
        try {
            const token = btoa(`${formData.username}:${formData.password}`);
            setCredentials(prev => ({ ...prev, [schemeName]: token }));
            setOauthError(prev => ({ ...prev, [schemeName]: null }));
        } catch (e) {
            setOauthError(prev => ({ ...prev, [schemeName]: "Failed to encode credentials." }));
        }
    };

    const handleOauthLogin = async (schemeName: string, tokenUrl: string) => {
        const formData = oauthForms[schemeName] || {};
        if (!formData.username || !formData.password) {
             setOauthError(prev => ({ ...prev, [schemeName]: "Username and password are required." }));
             return;
        }

        setOauthLoading(prev => ({ ...prev, [schemeName]: true }));
        setOauthError(prev => ({ ...prev, [schemeName]: null }));

        try {
            // Construct absolute URL for token endpoint
            let url = tokenUrl;
            if (!url.startsWith('http')) {
                // Remove trailing slash from base and leading slash from path
                const base = baseUrl.replace(/\/$/, '');
                const path = tokenUrl.startsWith('/') ? tokenUrl : '/' + tokenUrl;
                url = base + path;
            }

            const body = new URLSearchParams();
            body.append('grant_type', 'password');
            body.append('username', formData.username);
            body.append('password', formData.password);
            if (formData.client_id) body.append('client_id', formData.client_id);
            if (formData.client_secret) body.append('client_secret', formData.client_secret);
            if (formData.scope) body.append('scope', formData.scope);

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: body
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to login: ${res.status} ${res.statusText} - ${errText}`);
            }

            const data = await res.json();
            const token = data.access_token;
            if (token) {
                setCredentials(prev => ({ ...prev, [schemeName]: token }));
                setOauthError(prev => ({ ...prev, [schemeName]: null }));
            } else {
                 throw new Error("No access_token found in response.");
            }

        } catch (error: any) {
            console.error("OAuth Login Error:", error);
            setOauthError(prev => ({ ...prev, [schemeName]: error.message }));
        } finally {
            setOauthLoading(prev => ({ ...prev, [schemeName]: false }));
        }
    };

    const schemeKeys = Object.keys(securitySchemes);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                        <Lock size={18} /> Available Authorizations
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {schemeKeys.length === 0 ? (
                        <p className="text-zinc-500 text-sm italic">No security schemes defined in this spec.</p>
                    ) : (
                        <div className="space-y-6">
                            {schemeKeys.map(key => {
                                const scheme = securitySchemes[key];
                                const isOAuth2Password = scheme.type === 'oauth2' && scheme.flows?.password;
                                const isBasicAuth = scheme.type === 'http' && scheme.scheme === 'basic';
                                const isLoggedIn = !!credentials[key];

                                return (
                                    <div key={key} className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                        <div className="mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-base text-zinc-800 dark:text-zinc-200">{key}</span>
                                                    <span className="text-xs bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 dark:text-zinc-400 font-mono">
                                                        {scheme.type === 'http' ? scheme.scheme : scheme.type}
                                                        {scheme.in ? ` (${scheme.in})` : ''}
                                                    </span>
                                                </div>
                                                {isLoggedIn && (
                                                     <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                                         <Check size={12} /> Authorized
                                                     </div>
                                                )}
                                            </div>
                                            {scheme.description && <p className="text-sm text-zinc-400 mt-2">{scheme.description}</p>}
                                        </div>

                                        {/* Render Logic based on Type */}
                                        {isOAuth2Password ? (
                                            <div className="space-y-4">
                                                <div className="text-xs text-zinc-500 font-mono mb-2">
                                                    <div className="flex gap-2"><span className="w-20 text-zinc-400">Flow:</span> password</div>
                                                    <div className="flex gap-2"><span className="w-20 text-zinc-400">Token URL:</span> {scheme.flows?.password?.tokenUrl}</div>
                                                </div>

                                                {!isLoggedIn ? (
                                                    <form 
                                                        className="space-y-3 bg-white dark:bg-zinc-900/50 p-4 rounded border border-zinc-200 dark:border-zinc-800"
                                                        onSubmit={(e) => {
                                                            e.preventDefault();
                                                            handleOauthLogin(key, scheme.flows?.password?.tokenUrl!);
                                                        }}
                                                    >
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold uppercase text-zinc-500">Username *</label>
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                                    placeholder="username"
                                                                    value={oauthForms[key]?.username || ''}
                                                                    onChange={(e) => handleOauthFormChange(key, 'username', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold uppercase text-zinc-500">Password *</label>
                                                                <input 
                                                                    type="password" 
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                                    placeholder="password"
                                                                    value={oauthForms[key]?.password || ''}
                                                                    onChange={(e) => handleOauthFormChange(key, 'password', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold uppercase text-zinc-500">Client ID</label>
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                                    placeholder="client_id"
                                                                    value={oauthForms[key]?.client_id || ''}
                                                                    onChange={(e) => handleOauthFormChange(key, 'client_id', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold uppercase text-zinc-500">Client Secret</label>
                                                                <input 
                                                                    type="password" 
                                                                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                                    placeholder="client_secret"
                                                                    value={oauthForms[key]?.client_secret || ''}
                                                                    onChange={(e) => handleOauthFormChange(key, 'client_secret', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pt-2">
                                                            <button 
                                                                type="submit"
                                                                disabled={oauthLoading[key]}
                                                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                                            >
                                                                {oauthLoading[key] ? <Loader2 size={16} className="animate-spin"/> : 'Authorize'}
                                                            </button>
                                                        </div>
                                                        
                                                        {oauthError[key] && (
                                                            <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded mt-2">
                                                                Error: {oauthError[key]}
                                                            </div>
                                                        )}
                                                    </form>
                                                ) : (
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1 space-y-1">
                                                            <label className="text-[10px] font-bold uppercase text-zinc-500">Access Token</label>
                                                            <input 
                                                                type="text" 
                                                                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 font-mono truncate"
                                                                value={credentials[key] || ''}
                                                                disabled
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleInputChange(key, '')}
                                                            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 text-zinc-600 dark:text-zinc-400 rounded text-sm border border-zinc-200 dark:border-zinc-700 transition-colors h-[38px] font-medium"
                                                        >
                                                            Logout
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : isBasicAuth ? (
                                            // HTTP Basic Auth Form
                                            <div className="space-y-4">
                                                {!isLoggedIn ? (
                                                    <form 
                                                        className="space-y-3 bg-white dark:bg-zinc-900/50 p-4 rounded border border-zinc-200 dark:border-zinc-800"
                                                        onSubmit={(e) => {
                                                            e.preventDefault();
                                                            handleBasicAuthLogin(key);
                                                        }}
                                                    >
                                                        <div className="space-y-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold uppercase text-zinc-500">Username</label>
                                                                <input 
                                                                    type="text" 
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                                    placeholder="username"
                                                                    value={oauthForms[key]?.username || ''}
                                                                    onChange={(e) => handleOauthFormChange(key, 'username', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold uppercase text-zinc-500">Password</label>
                                                                <input 
                                                                    type="password" 
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                                    placeholder="password"
                                                                    value={oauthForms[key]?.password || ''}
                                                                    onChange={(e) => handleOauthFormChange(key, 'password', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pt-2">
                                                            <button 
                                                                type="submit"
                                                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-sm transition-all shadow-lg shadow-emerald-900/20"
                                                            >
                                                                Authorize
                                                            </button>
                                                        </div>
                                                        
                                                        {oauthError[key] && (
                                                            <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded mt-2">
                                                                Error: {oauthError[key]}
                                                            </div>
                                                        )}
                                                    </form>
                                                ) : (
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1 space-y-1">
                                                            <label className="text-[10px] font-bold uppercase text-zinc-500">Credentials (Base64)</label>
                                                            <input 
                                                                type="text" 
                                                                className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 font-mono truncate transition-colors"
                                                                value={credentials[key] || ''}
                                                                disabled
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={() => handleInputChange(key, '')}
                                                            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 dark:text-zinc-400 rounded text-sm border border-zinc-200 dark:border-zinc-700 transition-colors h-[38px] font-medium"
                                                        >
                                                            Logout
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            // Standard API Key / Bearer Token Input
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-zinc-500">
                                                    Value {scheme.in === 'header' ? '(Header)' : ''}
                                                </label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                                                        placeholder={scheme.type === 'http' && scheme.scheme === 'bearer' ? 'e.g. eyJhbGci...' : 'Required'}
                                                        value={credentials[key] || ''}
                                                        onChange={(e) => handleInputChange(key, e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                                    />
                                                    {credentials[key] && (
                                                        <button 
                                                            onClick={() => handleInputChange(key, '')}
                                                            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 dark:text-zinc-400 rounded text-sm border border-zinc-200 dark:border-zinc-700 transition-colors font-medium"
                                                        >
                                                            Logout
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-zinc-500 pt-1">
                                                    Enter the {scheme.type === 'http' ? 'token' : 'key'} value directly.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// Settings Modal Component for URL Input
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUrl: string;
    onLoad: (url: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUrl, onLoad }) => {
    const [inputValue, setInputValue] = useState(currentUrl);

    useEffect(() => {
        setInputValue(currentUrl);
    }, [currentUrl, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLoad(inputValue);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
                 <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                        <Settings size={18} /> API Configuration
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">OpenAPI Specification URL</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="http://localhost:8000/openapi.json" 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="w-full h-11 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md pl-10 pr-4 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Enter the URL to a JSON format OpenAPI (Swagger) v2 or v3 definition.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => { setInputValue(''); onLoad(''); onClose(); }}
                            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded text-sm font-medium transition-colors border border-zinc-200 dark:border-zinc-700"
                        >
                            Reset to Demo
                        </button>
                        <button 
                            type="submit"
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                        >
                            Load Spec
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Module Enable Flags
const ENABLE_API = import.meta.env.VITE_ENABLE_API !== 'false';
const ENABLE_WS = import.meta.env.VITE_ENABLE_WS !== 'false';
const ENABLE_IO = import.meta.env.VITE_ENABLE_IO !== 'false';
const ENABLE_MCP = import.meta.env.VITE_ENABLE_MCP !== 'false';

const availableModules = [
  { id: 'api', enabled: ENABLE_API },
  { id: 'ws', enabled: ENABLE_WS },
  { id: 'io', enabled: ENABLE_IO },
  { id: 'mcp', enabled: ENABLE_MCP },
].filter(m => m.enabled).map(m => m.id as 'api' | 'ws' | 'io' | 'mcp');

export default function App() {

  // Navigation State
  const [activeModule, setActiveModule] = useState<'api' | 'ws' | 'io' | 'mcp'>(() => {
    const saved = localStorage.getItem('activeModule');
    if (saved && availableModules.includes(saved as any)) {
      return saved as any;
    }
    return availableModules[0] || 'api';
  });

  // Persist Active Module
  useEffect(() => {
    localStorage.setItem('activeModule', activeModule);
  }, [activeModule]);

  // App State

  // Sidebar Nav Refs and Indicator
  const navContainerRef = useRef<HTMLDivElement>(null);
  const navRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const updatePosition = useCallback((module: string = activeModule) => {
        const container = navContainerRef.current;
        const el = navRefs.current[module];
        
        if (el && container) {
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            
            setIndicatorStyle({
                top: elRect.top - containerRect.top,
                left: elRect.left - containerRect.left,
                width: elRect.width,
                height: elRect.height,
                opacity: 1,
            });
        }
  }, [activeModule]);

  useLayoutEffect(() => {
    // Immediate
    updatePosition();
    
    // Delayed fallbacks
    const t1 = setTimeout(() => updatePosition(), 100);
    const t2 = setTimeout(() => updatePosition(), 300);

    // Resize listener
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        window.removeEventListener('resize', handleResize);
    };
  }, [activeModule, updatePosition]);

  // Stable Ref Callbacks
  const setApiRef = useCallback((el: HTMLButtonElement | null) => {
      navRefs.current['api'] = el;
      if (el && activeModule === 'api') updatePosition('api');
  }, [activeModule, updatePosition]);

  const setWsRef = useCallback((el: HTMLButtonElement | null) => {
      navRefs.current['ws'] = el;
      if (el && activeModule === 'ws') updatePosition('ws');
  }, [activeModule, updatePosition]);

  const setIoRef = useCallback((el: HTMLButtonElement | null) => {
      navRefs.current['io'] = el;
      if (el && activeModule === 'io') updatePosition('io');
  }, [activeModule, updatePosition]);

  const setMcpRef = useCallback((el: HTMLButtonElement | null) => {
      navRefs.current['mcp'] = el;
      if (el && activeModule === 'mcp') updatePosition('mcp');
  }, [activeModule, updatePosition]);

  const getIndicatorColor = () => {
      switch(activeModule) {
          case 'ws': return 'bg-purple-100 dark:bg-zinc-800';
          default: return 'bg-blue-100 dark:bg-zinc-800';
      }
  };

  const getIndicatorBarColor = () => {
      switch(activeModule) {
          case 'ws': return 'bg-purple-500';
          case 'mcp': return 'bg-orange-500';
          default: return 'bg-blue-500';
      }
  };

  // App State
  const defaultUrl = '';
  const [currentSpecUrl, setCurrentSpecUrl] = useState(import.meta.env.PROD ? '/openapi.json' : defaultUrl);
  




  // Sidebar Resize State
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX - 64; // Adjust for Activity Bar width
        if (newWidth >= 200 && newWidth <= 600) {
            setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    } else {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resize, stopResizing]);
  
  // Loaded Data
  const [apiTitle, setApiTitle] = useState("F-Docs");
  const [apiVersion, setApiVersion] = useState("1.0.0");
  const [baseUrl, setBaseUrl] = useState("");
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [securitySchemes, setSecuritySchemes] = useState<Record<string, SecurityScheme>>({});
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'focused'>('focused');
  const { theme, toggleTheme } = useTheme();
  const [activeEndpointId, setActiveEndpointId] = useState<string | null>(null);
  const [expandedSidebarTags, setExpandedSidebarTags] = useState<Record<string, boolean>>({});

  // API List Animation State (Must be after activeEndpointId)
  const apiListContainerRef = useRef<HTMLDivElement>(null);
  const apiEndpointRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [apiIndicatorStyle, setApiIndicatorStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const updateApiIndicator = useCallback((id: string | null = activeEndpointId) => {
    const container = apiListContainerRef.current;
    
    if (!id) {
        setApiIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
        return;
    }

    const el = apiEndpointRefs.current[id];
    
    if (container && el) {
        if (el.offsetParent === null) {
             setApiIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
             return;
        }
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        
        let targetLeft = elRect.left;
        let targetWidth = elRect.width;
        
        // Search for the nearest ancestor with a visible left border (The Tree Line)
        let current = el.parentElement;
        while (current && current !== container) {
             const style = window.getComputedStyle(current);
             if (style.borderLeftWidth && style.borderLeftWidth !== '0px' && style.borderLeftStyle !== 'none') {
                  const parentRect = current.getBoundingClientRect();
                  // Found the tree line! Align exactly with it.
                  targetLeft = parentRect.left;
                  targetWidth = elRect.right - targetLeft;
                  break;
             }
             current = current.parentElement;
        }

        setApiIndicatorStyle({
            top: elRect.top - containerRect.top + container.scrollTop,
            left: targetLeft - containerRect.left,
            width: targetWidth,
            height: elRect.height,
            opacity: 1,
        });
    } else {
        setApiIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [activeEndpointId]);

  useLayoutEffect(() => {
     updateApiIndicator();
     const t1 = setTimeout(() => updateApiIndicator(), 150);
     const t2 = setTimeout(() => updateApiIndicator(), 300);
     return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeEndpointId, expandedSidebarTags, viewMode, updateApiIndicator]);

  // Track active ID in ref for stable callbacks
  const activeEndpointIdRef = useRef(activeEndpointId);
  useLayoutEffect(() => {
      activeEndpointIdRef.current = activeEndpointId;
  }, [activeEndpointId]);

  const setEndpointRef = useCallback((el: HTMLButtonElement | null) => {
      if (el) {
          const id = el.dataset.id;
          if (id) {
              apiEndpointRefs.current[id] = el;
              // Realtime jump if this is the active element
              if (id === activeEndpointIdRef.current) {
                   updateApiIndicator(id);
              }
          }
      }
  }, [updateApiIndicator]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth & Settings State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [authCredentials, setAuthCredentials] = useState<Record<string, string>>({});

  // MCP State Integration
  const mcp = useMcp();
  const [activeMcpItem, setActiveMcpItem] = useState<{ type: 'RESOURCE' | 'TOOL' | 'PROMPT', data: any } | null>(null);
  const [isMcpConnectModalOpen, setIsMcpConnectModalOpen] = useState(false);

  // Socket.IO State Integration
  const socketIo = useSocketIO();
  const [newIoListener, setNewIoListener] = useState("");
  const [isIoUrlModalOpen, setIsIoUrlModalOpen] = useState(false);
  const [tempIoUrl, setTempIoUrl] = useState(socketIo.url);
  const ioUrlInputRef = useRef<HTMLInputElement>(null);

  // WebSocket State Integration
  const ws = useWebSocket();
  const [newWsPath, setNewWsPath] = useState("");
  const [isWsUrlModalOpen, setIsWsUrlModalOpen] = useState(false);
  const [tempWsUrl, setTempWsUrl] = useState(ws.baseUrl);
  const wsUrlInputRef = useRef<HTMLInputElement>(null);

  const handleAddWsPath = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWsPath.trim()) {
        ws.addPath(newWsPath.trim());
        setNewWsPath("");
    }
  };

  const handleAddIoListener = (e: React.FormEvent) => {
    e.preventDefault();
    if (newIoListener.trim()) {
        socketIo.addListener(newIoListener.trim());
        setNewIoListener("");
    }
  };

  // API URL Modal Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (activeModule === 'api' && (e.ctrlKey || e.metaKey) && e.code === 'KeyQ') {
            e.preventDefault();
            setIsSettingsModalOpen(true);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModule]);

  // Socket.IO URL Modal Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (activeModule === 'io' && (e.ctrlKey || e.metaKey) && e.code === 'KeyQ') {
            e.preventDefault();
            setIsIoUrlModalOpen(true);
            setTempIoUrl(socketIo.url);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModule, socketIo.url]);

  // WebSocket URL Modal Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (activeModule === 'ws' && (e.ctrlKey || e.metaKey) && e.code === 'KeyQ') {
            e.preventDefault();
            setIsWsUrlModalOpen(true);
            setTempWsUrl(ws.baseUrl);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModule, ws.baseUrl]);

  useEffect(() => {
    if (isIoUrlModalOpen && ioUrlInputRef.current) {
        setTimeout(() => ioUrlInputRef.current?.focus(), 100);
    }
  }, [isIoUrlModalOpen]);

  useEffect(() => {
    if (isWsUrlModalOpen && wsUrlInputRef.current) {
        setTimeout(() => wsUrlInputRef.current?.focus(), 100);
    }
  }, [isWsUrlModalOpen]);

  const handleIoUrlSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      socketIo.setUrl(tempIoUrl);
      setIsIoUrlModalOpen(false);
  };

  const handleWsUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ws.setBaseUrl(tempWsUrl);
    setIsWsUrlModalOpen(false);
  };

  // Socket.IO Emit Modal State
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false);
  const [emitEventName, setEmitEventName] = useState("message");
  const [emitMessageData, setEmitMessageData] = useState("{}");

  const handleEmit = (e: React.FormEvent) => {
    e.preventDefault();
    socketIo.emitEvent(emitEventName, emitMessageData);
    setIsEmitModalOpen(false);
  };

  // Auto-select first tool/resource when connected
  useEffect(() => {
      if (mcp.isConnected && !activeMcpItem) {
          if (mcp.tools.length > 0) setActiveMcpItem({ type: 'TOOL', data: mcp.tools[0] });
          else if (mcp.resources.length > 0) setActiveMcpItem({ type: 'RESOURCE', data: mcp.resources[0] });
      }
  }, [mcp.isConnected, mcp.tools, mcp.resources]);

  // Load default on mount
  useEffect(() => {
    // Check for global config injected by Python backend (behaves like get_swagger_ui_html)
    const globalConfig = (window as any).NEXUS_CONFIG || {};
    // Priority: Injected Config -> Production Default -> Dev Default
    const urlToLoad = globalConfig.openApiUrl || (import.meta.env.PROD ? '/openapi.json' : defaultUrl);
    loadSpec(urlToLoad); 
  }, []);

  const loadSpec = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const spec = await parseOpenApi(url);
      setApiTitle(spec.title);
      setApiVersion(spec.version);
      setBaseUrl(spec.baseUrl);

      setEndpoints(spec.endpoints);
      setTags(spec.tags);
      setSecuritySchemes(spec.securitySchemes || {});
      setCurrentSpecUrl(url);
      
      // Reset states
      setSelectedTag('All');
      setAuthCredentials({});
      
      // Auto-select first endpoint for better focused view experience
      if (spec.endpoints.length > 0) {
          setActiveEndpointId(spec.endpoints[0].id);
      } else {
          setActiveEndpointId(null);
      }
      
      // Default expand all tags in sidebar for focused mode
      const initialExpanded: Record<string, boolean> = {};
      spec.tags.forEach(t => initialExpanded[t.name] = true);
      setExpandedSidebarTags(initialExpanded);

    } catch (e: any) {
      let msg = e.message;
      if (msg.includes('Failed to fetch') || msg.includes('CORS')) {
          msg = `Failed to fetch API spec from ${url}. The server may have CORS disabled.`;
      }
      
      setError(msg);
      
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSidebarTag = (tagName: string) => {
    setExpandedSidebarTags(prev => ({...prev, [tagName]: !prev[tagName]}));
  };

  // Filter logic
  const filteredEndpoints = endpoints.filter(ep => {
    const matchesSearch = ep.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ep.summary.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (viewMode === 'list') {
        const matchesTag = selectedTag === 'All' || ep.tags.includes(selectedTag);
        return matchesSearch && matchesTag;
    }
    
    return matchesSearch;
  });

  // Check if any credentials are set
  const isAuthorized = Object.values(authCredentials).some((v: string) => v.length > 0);

  // Get active endpoint object for focused mode
  const activeEndpoint = activeEndpointId ? endpoints.find(e => e.id === activeEndpointId) : null;

  return (
    <div className="h-screen bg-inherit text-zinc-900 dark:text-zinc-200 flex flex-row font-sans overflow-hidden">
      
      {/* 1. Activity Bar (Module Switcher) */}
      <nav className="w-16 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex flex-col items-center py-6 z-40 relative">

          
          <div className="flex flex-col gap-4 w-full px-2 relative" ref={navContainerRef}>
             {/* Shared Active Background */}
             <div 
                className={`absolute rounded-xl transition-all duration-300 ease-out ${getIndicatorColor()}`}
                style={{
                    top: indicatorStyle.top,
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                    height: indicatorStyle.height,
                    opacity: indicatorStyle.opacity,
                    zIndex: 0
                }}
             />
             
             {/* Shared Active Bar (Left Indicator) */}
             <div 
                className={`absolute w-1 h-8 rounded-r-full transition-all duration-300 ease-out ${getIndicatorBarColor()}`}
                style={{
                    top: (indicatorStyle.top as number || 0) + ((indicatorStyle.height as number || 0) - 32) / 2,
                    left: 0, 
                    opacity: indicatorStyle.opacity,
                    zIndex: 20
                }}
             />

             {ENABLE_API && (
                <button 
                   ref={setApiRef}
                   onClick={() => setActiveModule('api')}
                   className={`p-3 rounded-xl flex justify-center transition-all group relative z-10 ${activeModule === 'api' ? 'text-blue-600 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}
                   title="REST API Documentation"
                >
                   <Layers size={22} />
                </button>
             )}
             
             {ENABLE_WS && (
                <button 
                   ref={setWsRef}
                   onClick={() => setActiveModule('ws')}
                   className={`p-3 rounded-xl flex justify-center transition-all group relative z-10 ${activeModule === 'ws' ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-500 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}
                   title="WebSocket Tester"
                >
                   <Activity size={22} />
                </button>
             )}

             {ENABLE_IO && (
                <button 
                   ref={setIoRef}
                   onClick={() => setActiveModule('io')}
                   className={`p-3 rounded-xl flex justify-center transition-all group relative z-10 ${activeModule === 'io' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}
                   title="Socket.IO Tester"
                >
                   <Radio size={22} />
                </button>
             )}

             {ENABLE_MCP && (
                <button 
                   ref={setMcpRef}
                   onClick={() => setActiveModule('mcp')}
                   className={`p-3 rounded-xl flex justify-center transition-all group relative z-10 ${activeModule === 'mcp' ? 'text-blue-600 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-900'}`}
                   title="MCP Inspector"
                >
                   <Database size={22} />
                </button>
             )}
          </div>
          
          <div className="mt-auto px-2 flex flex-col gap-4">
              <button 
                  onClick={toggleTheme}
                  className="p-3 rounded-xl flex justify-center transition-all text-zinc-500 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                  {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
              </button>


          </div>
      </nav>

      {/* 2. Secondary Sidebar (Only for REST API) */}
      {activeModule === 'api' && (
        <aside 
            ref={sidebarRef}
            className="w-[var(--sidebar-width)] bg-zinc-50 dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex flex-col relative group/sidebar h-screen hidden md:flex"
            style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        >
            {/* Resize Handle */}
            <div 
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 transition-colors z-40 active:bg-blue-600 group-hover/sidebar:bg-blue-500/10"
            onMouseDown={startResizing}
            />

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white truncate mb-3">F-<span className="text-blue-500">Docs</span></h1>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                        <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">v{apiVersion}</span>
                    </div>
                    
                    <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded p-0.5 border border-zinc-300 dark:border-zinc-700">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1 rounded ${viewMode === 'list' ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                            title="List View"
                        >
                            <LayoutList size={14} />
                        </button>
                        <button 
                            onClick={() => setViewMode('focused')}
                            className={`p-1 rounded ${viewMode === 'focused' ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                            title="Focused View"
                        >
                            <Sidebar size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar min-h-0 relative" ref={apiListContainerRef}>
              {/* Sliding Active Indicator for API List */}
              <div 
                  className="absolute bg-blue-50 dark:bg-zinc-800 border-l-2 border-blue-500 transition-all duration-300 ease-out pointer-events-none z-0"
                  style={{
                      top: apiIndicatorStyle.top,
                      height: apiIndicatorStyle.height,
                      left: apiIndicatorStyle.left,
                      width: apiIndicatorStyle.width,
                      opacity: apiIndicatorStyle.opacity
                  }}
              />
            {viewMode === 'list' ? (
                // List Mode Sidebar
                <>
                    <div className="mb-4 px-1">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-2">Resources</h3>
                        <button 
                            onClick={() => setSelectedTag('All')}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${selectedTag === 'All' ? 'bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                        >
                            <span className="flex items-center gap-2 truncate"><Layers size={14} /> All Resources</span>
                            <span className="text-[10px] bg-zinc-200 dark:bg-zinc-950 px-1.5 py-0.5 rounded-full text-zinc-500 dark:text-zinc-500">{endpoints.length}</span>
                        </button>
                    </div>

                    <div className="px-1 space-y-0.5">
                        {tags.map(tag => (
                            <button
                                key={tag.name}
                                onClick={() => setSelectedTag(tag.name)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${selectedTag === tag.name ? 'bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-white' : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                            >
                                <Terminal size={12} className="opacity-70 shrink-0" />
                                <span className="truncate">{tag.name}</span>
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                // Focused Mode Sidebar
                <div className="px-1 space-y-4">
                    {tags.map(tag => {
                        const tagEndpoints = filteredEndpoints.filter(ep => ep.tags.includes(tag.name));
                        if (tagEndpoints.length === 0) return null;
                        
                        const isExpanded = expandedSidebarTags[tag.name] !== false; // Default true

                        return (
                            <div key={tag.name} className="space-y-1">
                                <button 
                                    onClick={() => toggleSidebarTag(tag.name)}
                                    className="w-full flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors group uppercase tracking-wide"
                                >
                                    <span>{tag.name}</span>
                                    {isExpanded ? <ChevronDown size={12} className="opacity-50 group-hover:opacity-100"/> : <ChevronRight size={12} className="opacity-50 group-hover:opacity-100"/>}
                                </button>
                                
                                {isExpanded && (
                                    <div className="pl-2 space-y-0.5 border-l-2 border-zinc-300 dark:border-zinc-700 ml-3">
                                        {tagEndpoints.map(ep => (
                                            <button
                                                key={ep.id}
                                                data-id={ep.id}
                                                ref={setEndpointRef}
                                                onClick={() => setActiveEndpointId(ep.id)}
                                                className={`w-full text-left px-3 py-2 rounded-r-md text-[11px] transition-colors flex items-center gap-2 border-l-2 -ml-[1px] relative z-10 ${activeEndpointId === ep.id ? 'text-blue-700 dark:text-white border-transparent font-semibold' : 'text-zinc-600 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/30'}`}
                                            >
                                                <div className="w-14 shrink-0">
                                                    <MethodBadge method={ep.method} className="w-full block text-center scale-[0.80] origin-left" />
                                                </div>
                                                <span className="truncate font-mono">{ep.path}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            </div>
            
            {/* Only show Authorize button if security schemes exist */}
            {securitySchemes && Object.keys(securitySchemes).length > 0 && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] shrink-0">
                    <button 
                        onClick={() => setIsAuthModalOpen(true)}
                        className={`w-full py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                            isAuthorized 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                            : 'bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500'
                        }`}
                    >
                        {isAuthorized ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>{isAuthorized ? 'Authorized' : 'Authorize'}</span>
                    </button>
                </div>
            )}
        </aside>
      )}

      {/* 2b. Secondary Sidebar (For MCP) */}
      {activeModule === 'mcp' && (
        <aside 
            ref={sidebarRef}
            className="w-[var(--sidebar-width)] bg-zinc-50 dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex flex-col relative group/sidebar h-screen hidden md:flex"
            style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        >
            {/* Resize Handle */}
            <div 
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 transition-colors z-40 active:bg-blue-600 group-hover/sidebar:bg-blue-500/10"
            onMouseDown={startResizing}
            />

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white truncate mb-3 flex items-center gap-2">
                    <Database size={18} className="text-orange-500" />
                    <span>MCP Inspector</span>
                </h1>
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -tranzinc-y-1/2 text-zinc-400 dark:text-zinc-500" size={14} />
                    <input 
                        type="text" 
                        placeholder="Filter items..." 
                        value={mcp.filter}
                        onChange={(e) => mcp.setFilter(e.target.value)}
                        className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded pl-8 pr-2 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-orange-500"
                    />
                </div>
            </div>

            <div className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                {mcp.isConnected ? (
                    <div className="space-y-6">
                        {/* Tools Group */}
                        <div>
                            <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center mb-1">
                                <span>Tools</span>
                                <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500 dark:text-zinc-400">{mcp.tools.length}</span>
                            </div>
                            {mcp.filteredTools.length === 0 && <p className="px-2 text-xs text-zinc-600 italic">No tools found</p>}
                            {mcp.filteredTools.map(t => (
                                <button
                                    key={t.name}
                                    onClick={() => setActiveMcpItem({ type: 'TOOL', data: t })}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${activeMcpItem?.data.name === t.name ? 'bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border-l-2 border-emerald-500' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 border-l-2 border-transparent'}`}
                                >
                                    <Wrench size={12} className="shrink-0 opacity-70" />
                                    <span className="truncate">{t.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Resources Group */}
                        <div>
                            <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center mb-1">
                                <span>Resources</span>
                                <span className="bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-400">{mcp.resources.length}</span>
                            </div>
                             {mcp.filteredResources.length === 0 && <p className="px-2 text-xs text-zinc-600 italic">No resources found</p>}
                            {mcp.filteredResources.map(r => (
                                <button
                                    key={r.uri}
                                    onClick={() => setActiveMcpItem({ type: 'RESOURCE', data: r })}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${activeMcpItem?.data.uri === r.uri ? 'bg-blue-50 dark:bg-zinc-800 text-blue-700 dark:text-blue-400 border-l-2 border-blue-500' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 border-l-2 border-transparent'}`}
                                >
                                    <Box size={12} className="shrink-0 opacity-70" />
                                    <span className="truncate">{r.name}</span>
                                </button>
                            ))}
                        </div>

                         {/* Prompts Group */}
                         {mcp.prompts.length > 0 && (
                            <div>
                                <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center mb-1">
                                    <span>Prompts</span>
                                    <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500 dark:text-zinc-400">{mcp.prompts.length}</span>
                                </div>
                                {mcp.filteredPrompts.map(p => (
                                    <button
                                        key={p.name}
                                        onClick={() => setActiveMcpItem({ type: 'PROMPT', data: p })}
                                        className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center gap-2 ${activeMcpItem?.data.name === p.name ? 'bg-zinc-800 text-purple-400 border-l-2 border-purple-500' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border-l-2 border-transparent'}`}
                                    >
                                        <MessageSquare size={12} className="shrink-0 opacity-70" />
                                        <span className="truncate">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                         )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-center px-4">
                        <Database size={32} className="mb-4 opacity-50" />
                        <p className="text-xs">Connect to an MCP server to view available tools and resources.</p>
                    </div>
                )}
            </div>
            
            {/* Footer Connection Status */}
             <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] shrink-0">
                 {mcp.isConnected ? (
                     <button 
                        onClick={() => mcp.disconnect()}
                        className="w-full py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    >
                        <span>Disconnect</span>
                    </button>
                 ) : (
                    <div className="space-y-2">
                        <button 
                            onClick={() => setIsMcpConnectModalOpen(true)}
                            className="w-full py-2 px-3 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20"
                        >
                            <Database size={14} />
                            <span>Connect</span>
                        </button>
                    </div>
                 )}
            </div>
        </aside>
      )}

      {/* 2c. Secondary Sidebar (For WebSocket) */}
      {activeModule === 'ws' && (
        <aside 
            ref={sidebarRef}
            className="w-[var(--sidebar-width)] bg-zinc-50 dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex flex-col relative group/sidebar h-screen hidden md:flex"
            style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        >
            {/* Resize Handle */}
            <div 
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 transition-colors z-40 active:bg-blue-600 group-hover/sidebar:bg-blue-500/10"
            onMouseDown={startResizing}
            />

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white truncate mb-3 flex items-center gap-2">
                    <Activity size={18} className="text-purple-500" />
                    <span>WebSocket Tester</span>
                </h1>
                
                {/* WebSocket Base URL */}
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div 
                        className="flex-1 truncate text-xs font-mono text-zinc-500 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        onClick={() => {
                            if(!ws.isAnyConnected) {
                                setIsWsUrlModalOpen(true);
                                setTempWsUrl(ws.baseUrl);
                            }
                        }}
                        title="Click to edit base URL"
                    >
                        {ws.baseUrl}
                    </div>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${ws.isAnyConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                </div>
            </div>

            <div className="p-3 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
               {/* URL Edit Modal */}
                 {isWsUrlModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                             <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-800 dark:text-white">Connection URL</h2>
                                <button onClick={() => setIsWsUrlModalOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleWsUrlSubmit} className="p-6 space-y-4">
                                 <div>
                                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">WebSocket Server URL</label>
                                    <input
                                        ref={wsUrlInputRef}
                                        type="text"
                                        value={tempWsUrl}
                                        onChange={(e) => setTempWsUrl(e.target.value)}
                                        className="w-full h-11 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md px-4 text-sm text-zinc-800 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                                        placeholder="wss://echo.websocket.org"
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">
                                        Press Enter to save.
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsWsUrlModalOpen(false)}
                                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-sm font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold shadow-lg shadow-purple-900/20"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                 )}

                {/* Add Path Form */}
                <form onSubmit={handleAddWsPath} className="mb-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newWsPath}
                            onChange={(e) => setNewWsPath(e.target.value)}
                            placeholder="Add path/label..."
                            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-purple-500 text-zinc-800 dark:text-white"
                        />
                        <button 
                            type="submit"
                            disabled={!newWsPath.trim()}
                            className="px-2 py-1.5 bg-purple-100 text-purple-600 dark:bg-zinc-800 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </form>

                <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center mb-1">
                    <span>Active Paths</span>
                    <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500 dark:text-zinc-400">{ws.activePaths.length}</span>
                </div>

                {ws.activePaths.length === 0 && (
                     <div className="text-center py-8 px-4">
                        <Activity size={24} className="mx-auto mb-2 text-zinc-400 opacity-50" />
                        <p className="text-xs text-zinc-500 italic">No active paths. Add one to start monitoring.</p>
                     </div>
                )}
                
                {ws.activePaths.map(path => {
                    const data = ws.pathData[path.name];
                    return (
                        <div key={path.id} className={`bg-white dark:bg-zinc-950 border rounded p-2 text-xs relative group mb-2 transition-all ${path.isConnected ? 'border-emerald-500/50 dark:border-emerald-500/30' : 'border-zinc-200 dark:border-zinc-800'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    {/* Connection Status Indicator */}
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                                        path.isConnecting ? 'bg-yellow-500 animate-pulse' :
                                        path.isConnected ? 'bg-emerald-500 animate-pulse' : 
                                        path.error ? 'bg-red-500' : 'bg-zinc-400'
                                    }`} />
                                    <span className={`font-bold truncate flex-1 font-mono ${path.isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-200'}`}>{path.name}</span>
                                     <button
                                        onClick={() => ws.togglePath(path.id)}
                                        disabled={path.isConnecting}
                                        className={`w-8 h-4 rounded-full flex items-center transition-colors shrink-0 ${
                                            path.isConnecting ? 'bg-yellow-500 cursor-wait' :
                                            path.isConnected ? 'bg-emerald-500 justify-end' : 
                                            'bg-zinc-300 dark:bg-zinc-700 justify-start'
                                        }`}
                                        title={path.isConnecting ? "Connecting..." : path.isConnected ? "Disconnect" : "Connect"}
                                     >
                                         {path.isConnecting ? (
                                            <span className="text-[8px] text-white mx-auto">...</span>
                                         ) : (
                                            <div className="w-3 h-3 bg-white rounded-full shadow-sm mx-0.5" />
                                         )}
                                     </button>
                                </div>
                                <button 
                                    onClick={() => ws.removePath(path.id)}
                                    disabled={path.isConnected || path.isConnecting}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Remove Path"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            
                            {/* Error Message */}
                            {path.error && (
                                <div className="mt-1 p-1.5 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400 flex items-start gap-1">
                                    <span className="shrink-0">⚠️</span>
                                    <span className="flex-1 break-all">{path.error}</span>
                                    <button 
                                        onClick={() => ws.clearPathError(path.id)}
                                        className="text-red-300 hover:text-red-200 shrink-0"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                            
                            {data && !path.error && (
                                <div className="text-[10px] text-zinc-500 font-mono mt-1 flex justify-between pl-1">
                                    <span>Count: {data.count}</span>
                                    <span>{data.lastActivity}</span>
                                </div>
                            )}
                        </div>
                    )
                })}

                <div>
                    <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center mb-1">
                        <span>Global Actions</span>
                    </div>
                    <button
                        onClick={ws.clearData}
                        className="w-full text-left px-3 py-2 rounded-md text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={12} />
                        <span>Clear All Data</span>
                    </button>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] shrink-0">
                <p className="text-[10px] text-zinc-500 text-center italic">
                    Use Ctrl+Q to quickly edit the WebSocket URL.
                </p>
            </div>
        </aside>
      )}

      {/* 2d. Secondary Sidebar (For Socket.IO) */}
      {activeModule === 'io' && (
        <aside 
            ref={sidebarRef}
            className="w-[var(--sidebar-width)] bg-zinc-50 dark:bg-[#18181b] border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex flex-col relative group/sidebar h-screen hidden md:flex"
            style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        >
            {/* Resize Handle */}
            <div 
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50 transition-colors z-40 active:bg-blue-600 group-hover/sidebar:bg-blue-500/10"
            onMouseDown={startResizing}
            />

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white truncate mb-3 flex items-center gap-2">
                    <Radio size={18} className="text-blue-500" />
                    <span>Socket.IO Tester</span>
                </h1>
                
                {/* Socket.IO Sidebar Header */}
                <div className="flex flex-col gap-2 bg-zinc-100 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                         <div 
                            className="flex-1 truncate text-xs font-mono text-zinc-500 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                            onClick={() => {
                                if(!socketIo.isConnected) {
                                    setIsIoUrlModalOpen(true);
                                    setTempIoUrl(socketIo.url);
                                }
                            }}
                            title="Click or Ctrl+Q to edit URL"
                         >
                            {socketIo.url}
                         </div>
                         <div className={`w-2 h-2 rounded-full shrink-0 ml-2 ${socketIo.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    </div>
                    
                    <button
                        onClick={socketIo.isConnected ? socketIo.disconnect : socketIo.connect}
                        className={`w-full py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                            socketIo.isConnected 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm'
                        }`}
                    >
                        {socketIo.isConnected ? (
                            <>Disconnect</>
                        ) : (
                            <>Connect</>
                        )}
                    </button>
                    

                </div>
            </div>

            <div className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
               {/* URL Edit Modal */}
                 {isIoUrlModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                             <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-800 dark:text-white">Connection URL</h2>
                                <button onClick={() => setIsIoUrlModalOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleIoUrlSubmit} className="p-6 space-y-4">
                                 <div>
                                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Socket.IO Server URL</label>
                                    <input
                                        ref={ioUrlInputRef}
                                        type="text"
                                        value={tempIoUrl}
                                        onChange={(e) => setTempIoUrl(e.target.value)}
                                        className="w-full h-11 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md px-4 text-sm text-zinc-800 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                                        placeholder="http://localhost:3000"
                                    />
                                    <p className="text-xs text-zinc-500 mt-2">
                                        Press Enter to save.
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsIoUrlModalOpen(false)}
                                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-sm font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow-lg shadow-blue-900/20"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                 )}

               {/* Emit Modal */}
                 {isEmitModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                             <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2"><Send size={18}/> Emit Event</h2>
                                <button onClick={() => setIsEmitModalOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleEmit} className="p-6 space-y-4">
                                 <div>
                                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Event Name</label>
                                    <input
                                        type="text"
                                        value={emitEventName}
                                        onChange={(e) => setEmitEventName(e.target.value)}
                                        className="w-full h-11 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md px-4 text-sm text-zinc-800 dark:text-white focus:outline-none focus:border-blue-500"
                                        placeholder="message"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">JSON Data</label>
                                    <textarea
                                        value={emitMessageData}
                                        onChange={(e) => setEmitMessageData(e.target.value)}
                                        className="w-full h-32 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md p-3 text-sm font-mono text-zinc-800 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                                        placeholder="{}"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEmitModalOpen(false)}
                                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded text-sm font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow-lg shadow-blue-900/20"
                                    >
                                        Send
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                 )}
                {/* Add Listener Form */}
                <form onSubmit={handleAddIoListener} className="mb-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newIoListener}
                            onChange={(e) => setNewIoListener(e.target.value)}
                            placeholder="Add listener..."
                            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-zinc-800 dark:text-white"
                        />
                        <button 
                            type="submit"
                            disabled={!newIoListener.trim()}
                            className="px-2 py-1.5 bg-blue-100 text-blue-600 dark:bg-zinc-800 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </form>

                <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center mb-1">
                    <span>Active Listeners</span>
                    <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500 dark:text-zinc-400">{socketIo.activeListeners.length}</span>
                </div>

                {socketIo.activeListeners.length === 0 && (
                     <div className="text-center py-8 px-4">
                        <Activity size={24} className="mx-auto mb-2 text-zinc-400 opacity-50" />
                        <p className="text-xs text-zinc-500 italic">No active listeners. Add one to start monitoring events.</p>
                     </div>
                )}
                
                {socketIo.activeListeners.map(listener => {
                    const data = socketIo.listenerData[listener.name];
                    return (
                        <div key={listener.id} className={`bg-white dark:bg-zinc-950 border rounded p-2 text-xs relative group mb-2 transition-all ${listener.isEnabled ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <span className={`font-bold truncate flex-1 ${listener.isEnabled ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-500 dark:text-zinc-500 line-through'}`}>{listener.name}</span>
                                     <button
                                        onClick={() => socketIo.toggleListener(listener.id)}
                                        className={`w-8 h-4 rounded-full flex items-center transition-colors shrink-0 ${listener.isEnabled ? 'bg-green-500 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'}`}
                                        title={listener.isEnabled ? "Disable Listener" : "Enable Listener"}
                                     >
                                         <div className="w-3 h-3 bg-white rounded-full shadow-sm mx-0.5" />
                                     </button>
                                </div>
                                <button 
                                    onClick={() => socketIo.removeListener(listener.id)}
                                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Remove Listener"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {data && (
                                <div className="text-[10px] text-zinc-500 font-mono mt-1 flex justify-between pl-1">
                                    <span>Count: {data.count}</span>
                                    <span>{data.timestamp}</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-zinc-50 dark:bg-zinc-950 relative w-full flex flex-col transition-colors">
        
        {activeModule === 'api' ? (
            <div key="api" className="w-full h-full flex flex-col">
                {/* REST API Header */}
                <header className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-lg transition-colors">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 transition-colors">
                        <div className="flex flex-col lg:flex-row gap-4 w-full mx-auto items-center">
                            <div className="flex flex-1 w-full gap-3 items-center min-w-0">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                                        <input 
                                            type="text"
                                            placeholder="Filter endpoints by path or summary..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md pl-10 pr-4 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm"
                                        />
                                    </div>

                                    {/* Configure URL button removed - use Ctrl+Q */}
                            </div>
                        </div>
                    </div>
                </header>

                {/* REST API Content */}
                <div className="p-4 md:p-8 w-full mx-auto pb-4 min-w-0 flex-1 flex flex-col">
                    {error ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 flex items-start gap-4 text-red-400">
                            <AlertCircle size={24} className="shrink-0" />
                            <div>
                                <h3 className="font-bold text-lg mb-1">Failed to load specification</h3>
                                <p className="text-sm opacity-90">{error}</p>
                                <button onClick={() => loadSpec('')} className="mt-4 text-xs font-bold underline hover:text-red-300">Return to Demo API</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'list' && (
                                <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex flex-wrap items-center gap-4 mb-2">
                                        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white break-words">{apiTitle}</h2>
                                        {currentSpecUrl && (
                                            <a 
                                                href={currentSpecUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                title="View Raw Specification"
                                                className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all font-bold"
                                            >
                                                <span>raw spec</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-3xl">
                                        {apiTitle === "Cosmos Store API" ? 
                                            "This is a demonstration of a next-generation API documentation interface. It features interactive request building, simulated responses, and AI-assisted payload generation powered by Gemini." : 
                                            `Documentation for ${apiTitle} v${apiVersion}. Explore endpoints, generate payloads, and execute requests below.`
                                        }
                                    </p>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
                                    <p className="text-zinc-500 text-sm">Parsing Specification...</p>
                                </div>
                            ) : (
                                <>
                                    {viewMode === 'list' ? (
                                        <div className="space-y-6">
                                            {tags.filter(tag => selectedTag === 'All' || selectedTag === tag.name).map(tag => {
                                                const tagEndpoints = filteredEndpoints.filter(ep => ep.tags.includes(tag.name));
                                                return (
                                                    <TagSection 
                                                        key={tag.name} 
                                                        tag={tag} 
                                                        endpoints={tagEndpoints} 
                                                        baseUrl={baseUrl}
                                                        securitySchemes={securitySchemes}
                                                        authCredentials={authCredentials}
                                                    />
                                                );
                                            })}
                                            {filteredEndpoints.length === 0 && (
                                                <div className="text-center py-20">
                                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 mb-4">
                                                        <Search className="text-zinc-600" size={32} />
                                                    </div>
                                                    <h3 className="text-zinc-300 font-medium">No endpoints found</h3>
                                                    <p className="text-zinc-500 text-sm mt-1">Try adjusting your search criteria.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                                            {activeEndpoint ? (
                                                <EndpointCard 
                                                    key={activeEndpoint.id} 
                                                    endpoint={activeEndpoint} 
                                                    baseUrl={baseUrl} 
                                                    securitySchemes={securitySchemes}
                                                    authCredentials={authCredentials}
                                                    forcedOpen={true}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-32 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/20 border-dashed transition-colors h-full">
                                                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800 transition-colors">
                                                        <Terminal className="text-zinc-400 dark:text-zinc-600" size={32} />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-300">Select an Endpoint</h3>
                                                    <p className="text-zinc-600 dark:text-zinc-500 mt-2 max-w-sm text-center">
                                                        Choose an endpoint from the sidebar to view its details, build requests, and test responses.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        ) : activeModule === 'ws' ? (
            <div key="ws" className="w-full h-full">
                <WebSocketTester {...ws} />
            </div>
        ) : activeModule === 'io' ? (
            <div key="io" className="w-full h-full">
                <SocketIoTester {...socketIo} />
            </div>
        ) : activeModule === 'mcp' ? (
            <div key="mcp" className="w-full h-full flex flex-col">
             {mcp.isConnected ? (
                <>
                    {/* MCP Header */}
                    <header className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-lg transition-colors">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 transition-colors">
                            <div className="flex flex-col lg:flex-row gap-4 w-full mx-auto items-center">
                                <div className="flex flex-1 w-full gap-3 items-center min-w-0">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                                            <input 
                                                type="text"
                                                placeholder="Filter tools, resources, and prompts..."
                                                value={mcp.filter}
                                                onChange={(e) => mcp.setFilter(e.target.value)}
                                                className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md pl-10 pr-4 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 shadow-sm"
                                            />
                                        </div>

                                        <button 
                                            onClick={() => mcp.disconnect()}
                                            className="h-10 px-4 bg-white hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-950/30 text-zinc-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 rounded-md border border-zinc-300 hover:border-red-200 dark:border-zinc-700 dark:hover:border-red-500/50 transition-all flex items-center gap-2 font-medium text-sm whitespace-nowrap shadow-sm"
                                            title="Disconnect from MCP Server"
                                        >
                                            <Database size={16} />
                                            <span className="hidden sm:inline">Disconnect</span>
                                        </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="p-4 md:p-6 w-full pb-20 min-w-0 flex-1 max-w-none">
                         <div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full">

                            {activeMcpItem ? (
                                <McpItemCard 
                                    type={activeMcpItem.type} 
                                    data={activeMcpItem.data}
                                    onRunTool={mcp.runTool}
                                    forcedOpen={true}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-32 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/20 border-dashed transition-colors">
                                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-800">
                                        <Wrench className="text-zinc-400 dark:text-zinc-600" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-300">Select an Item</h3>
                                    <p className="text-zinc-600 dark:text-zinc-500 mt-2 max-w-sm text-center">
                                        Choose a tool or resource from the sidebar to view details and execute.
                                    </p>
                                </div>
                            )}
                            

                         </div>
                    </div>
                </>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 dark:text-zinc-500 p-8">
                    <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 p-8 rounded-2xl flex flex-col items-center shadow-xl max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
                        <Database size={64} className="mb-6 text-orange-500" />
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">MCP Not Connected</h3>
                        
                        {mcp.error ? (
                            <div className="mb-6 p-4 bg-red-100 dark:bg-red-500/10 border-2 border-red-300 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm text-center space-y-2 w-full">
                                <p className="font-bold text-red-800 dark:text-red-300">⚠️ Connection Failed</p>
                                <p className="leading-relaxed text-red-600 dark:text-red-400">{mcp.error}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-center text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                                Please connect to an MCP server (SSE mode) to inspect available tools, resources, and prompts.
                            </p>
                        )}
                        
                        <div className="flex flex-col w-full gap-3">
                            <button 
                                onClick={() => setIsMcpConnectModalOpen(true)}
                                className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/30"
                            >
                                <Zap size={18} fill="currentColor" />
                                {mcp.error ? 'Try Different URL' : 'Connect Now'}
                            </button>
                            
                            {mcp.error && (
                                <button 
                                    onClick={() => mcp.connect()}
                                    disabled={mcp.isConnecting}
                                    className="w-full h-12 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg font-bold text-base flex items-center justify-center gap-2 border-2 border-zinc-300 dark:border-zinc-600 transition-all"
                                >
                                    {mcp.isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
                                    Retry Connection
                                </button>
                            )}
                        </div>
                    </div>
                </div>
             )}
            </div>
        ) : (
            null 
        )}

        {/* Auth Modal Overlay */}
        <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)}
            baseUrl={baseUrl}
            securitySchemes={securitySchemes}
            credentials={authCredentials}
            setCredentials={setAuthCredentials}
        />

        {/* Settings/URL Modal Overlay */}
        <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onLoad={loadSpec}
            currentUrl={currentSpecUrl}
        />

        {/* MCP Connect Modal */}
        {isMcpConnectModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="flex items-center justify-between mb-2">
                             <h2 className="text-xl font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                                <Database className="text-orange-500" size={24} />
                                Connect to MCP Server
                             </h2>
                             <button onClick={() => setIsMcpConnectModalOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
                                <X size={20} />
                             </button>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm">Enter the URL of your Model Context Protocol server.</p>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {mcp.error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-3 text-red-500 dark:text-red-400 text-xs shadow-sm animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={16} className="shrink-0" />
                                <div className="flex-1 min-w-0 font-medium break-words leading-relaxed">
                                    {mcp.error}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Server URL</label>
                            <input 
                                type="text" 
                                value={mcp.url}
                                onChange={(e) => mcp.setUrl(e.target.value)}
                                placeholder="http://localhost:8000/mcp"
                                className={`w-full h-10 bg-zinc-50 dark:bg-zinc-950 border rounded-md px-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ${mcp.error ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-200 dark:border-zinc-700 focus:border-orange-500'}`}
                                onKeyDown={async (e) => {
                                    if(e.key === 'Enter') {
                                        const success = await mcp.connect();
                                        if (success) setIsMcpConnectModalOpen(false);
                                    }
                                }}
                            />
                        </div>
                        
                        <div className="pt-2">
                             <button 
                                onClick={async () => {
                                    const success = await mcp.connect();
                                    if (success) setIsMcpConnectModalOpen(false);
                                }}
                                disabled={mcp.isConnecting}
                                className="w-full py-2.5 rounded-md text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {mcp.isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                                Connect
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 text-center">
                        Make sure your server supports SSE (Server-Sent Events).
                    </div>
                </div>
            </div>
        )}


      </main>



    </div>
  );
}