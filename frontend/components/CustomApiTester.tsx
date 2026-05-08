import React, { useState, useMemo } from 'react';
import { Play, Loader2, Link as LinkIcon, AlertCircle, Copy, Check, X, Zap, Globe, Plus } from 'lucide-react';
import { MethodBadge } from './MethodBadge';
import { JsonEditor } from './JsonEditor';
import { JsonDisplay } from './JsonDisplay';
import { FileViewer } from './FileViewer';
import { StreamTextViewer } from './StreamTextViewer';
import { Method } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { readResponseAsSimulation } from '../services/mockApiService';

const methodThemeBase = {
    [Method.GET]: { bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/20", text: "text-blue-700 dark:text-blue-400", button: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20" },
    [Method.POST]: { bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400", button: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20" },
    [Method.PUT]: { bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20", text: "text-amber-700 dark:text-amber-400", button: "bg-amber-600 hover:bg-amber-500 shadow-amber-900/20" },
    [Method.DELETE]: { bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", text: "text-red-700 dark:text-red-400", button: "bg-red-600 hover:bg-red-500 shadow-red-900/20" },
    [Method.PATCH]: { bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20", text: "text-orange-700 dark:text-orange-400", button: "bg-orange-600 hover:bg-orange-500 shadow-orange-900/20" },
    [Method.OPTIONS]: { bg: "bg-zinc-50 dark:bg-zinc-500/10", border: "border-zinc-200 dark:border-zinc-500/20", text: "text-zinc-700 dark:text-zinc-400", button: "bg-zinc-600 hover:bg-zinc-500 shadow-zinc-900/20" },
    [Method.HEAD]: { bg: "bg-purple-50 dark:bg-purple-500/10", border: "border-purple-200 dark:border-purple-500/20", text: "text-purple-700 dark:text-purple-400", button: "bg-purple-600 hover:bg-purple-500 shadow-purple-900/20" },
};

const formatLatency = (latency: number) =>
    latency >= 100 ? `${(latency / 1000).toFixed(1)}s` : `${Math.round(latency)}ms`;

export const CustomApiTester: React.FC = () => {
    const [method, setMethod] = useState<Method>(Method.GET);
    const [url, setUrl] = useState('');
    const [activeTab, setActiveTab] = useState<'params' | 'body' | 'headers'>('params');
    const [headersStr, setHeadersStr] = useState('{\n  "Content-Type": "application/json"\n}');
    const [bodyStr, setBodyStr] = useState('{\n  \n}');
    
    // For Custom Params Tab
    const [queryParams, setQueryParams] = useState<Record<string, string>>({});
    const [newParamKey, setNewParamKey] = useState("");
    
    const [isLoading, setIsLoading] = useState(false);
    const [requestStartMs, setRequestStartMs] = useState<number | null>(null);
    const [liveElapsedMs, setLiveElapsedMs] = useState(0);
    const [response, setResponse] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    
    const theme = methodThemeBase[method] || methodThemeBase[Method.GET];

    useEffect(() => {
        if (!isLoading || requestStartMs === null) return;
        const updateElapsed = () => setLiveElapsedMs(performance.now() - requestStartMs);
        updateElapsed();
        const intervalId = window.setInterval(updateElapsed, 100);
        return () => window.clearInterval(intervalId);
    }, [isLoading, requestStartMs]);

    const handleCopy = (text: string) => {
        copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    // Construct final URL with query params
    const finalUrl = useMemo(() => {
        if (!url) return '';
        try {
            const urlObj = new URL(url.includes('://') ? url : `http://${url}`);
            Object.entries(queryParams).forEach(([k, v]) => {
                if (k.trim()) urlObj.searchParams.set(k, v);
            });
            return urlObj.toString();
        } catch (e) {
            // fallback if URL is totally invalid shape
            const qStr = Object.entries(queryParams)
                .filter(([k]) => k.trim())
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&');
            if (qStr) return url.includes('?') ? `${url}&${qStr}` : `${url}?${qStr}`;
            return url;
        }
    }, [url, queryParams]);
    
    const handleExecute = async () => {
        if (!url) {
            setErrorMsg("URL is required");
            return;
        }
        
        // Basic check if it has protocol
        const fetchUrl = finalUrl.includes('://') ? finalUrl : `http://${finalUrl}`;
        
        setErrorMsg(null);
        setRequestStartMs(performance.now());
        setLiveElapsedMs(0);
        setIsLoading(true);
        setResponse(null);
        
        try {
            let parsedHeaders = {};
            try {
                if (headersStr.trim()) parsedHeaders = JSON.parse(headersStr);
            } catch (e) {
                throw new Error("Invalid format in Headers JSON");
            }

            const fetchOptions: RequestInit = {
                method,
                headers: parsedHeaders,
            };
            
            if (method !== Method.GET && method !== Method.HEAD) {
                try {
                    if (bodyStr.trim() && Object.keys(parsedHeaders).some(k => k.toLowerCase() === 'content-type' && (parsedHeaders as any)[k].includes('json'))) {
                        JSON.parse(bodyStr); // validate json quickly
                    }
                } catch(e) {
                    // ignore, they might send plain text
                }
                fetchOptions.body = bodyStr;
            }

            const startTime = performance.now();
            const res = await fetch(fetchUrl, fetchOptions);

            const headerRecord = Object.fromEntries(res.headers.entries());
            const sim = await readResponseAsSimulation(res, startTime, (partial) => {
                setResponse({
                    ...partial,
                    statusText: res.statusText,
                    headers: headerRecord,
                });
                setIsLoading(false);
            });

            setResponse({
                ...sim,
                statusText: res.statusText,
                headers: headerRecord,
            });
            
        } catch (e: any) {
             setResponse({
                 status: 0,
                 statusText: "Error",
                 data: e.message || "Network Error: Failed to fetch. Check CORS or URL.",
                 headers: {},
                 latency: 0,
                 contentType: "text/plain"
             });
        } finally {
            setIsLoading(false);
            setRequestStartMs(null);
        }
    };

    return (
        <div className={`flex-1 flex flex-col mb-0 border-0 rounded-none md:rounded-lg md:border ${theme.border} bg-white dark:bg-zinc-950 shadow-sm dark:shadow-none h-full relative`}>
            {/* Header Mirroring EndpointCard */}
            <div className={`flex items-center justify-between p-3 px-4 select-none rounded-t-lg border-b border-zinc-200 dark:border-zinc-800/50`}>
                <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
                    <div className="w-24 shrink-0 relative group">
                        <select 
                            value={method}
                            onChange={e => setMethod(e.target.value as Method)}
                            className="absolute opacity-0 inset-0 w-full h-full cursor-pointer z-10"
                        >
                            <option value={Method.GET}>GET</option>
                            <option value={Method.POST}>POST</option>
                            <option value={Method.PUT}>PUT</option>
                            <option value={Method.PATCH}>PATCH</option>
                            <option value={Method.DELETE}>DELETE</option>
                            <option value={Method.OPTIONS}>OPTIONS</option>
                            <option value={Method.HEAD}>HEAD</option>
                        </select>
                        <MethodBadge method={method} className="shadow-sm w-full block text-center" />
                    </div>
                    
                    <span className="font-mono font-medium min-w-0 flex-1 flex items-center gap-3 text-zinc-700 dark:text-zinc-200">
                        <input 
                            type="text" 
                            className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 flex-1 placeholder-zinc-400 font-mono text-sm"
                            placeholder="https://api.example.com/v1/users"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleExecute();
                            }}
                        />
                        <span className={`text-sm hidden sm:block truncate shrink-0 font-sans opacity-60 text-zinc-400`}>
                            - Custom Test
                        </span>
                    </span>
                </div>
            </div>

            {/* Expanded Content Area analogous to EndpointCard open state */}
            <div className={`bg-zinc-50/50 dark:bg-zinc-900/30 p-4 animate-in fade-in slide-in-from-top-1 duration-200 rounded-b-lg flex-1 flex flex-col min-h-0 overflow-hidden`}>
                
                {/* Description */}
                <div className="mb-6 px-4">
                     <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                      Description
                     </h4>
                     <p className="text-sm text-zinc-600 dark:text-zinc-300">
                         Create a custom request by modifying the URL, adding query parameters, modifying request body, and defining headers.
                         Use this to quickly test external APIs or endpoints not documented in the schema.
                     </p>
                </div>

                {errorMsg && (
                    <div className="mb-4 px-4">
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded flex items-center gap-2">
                            <AlertCircle size={16} />
                            {errorMsg}
                        </div>
                    </div>
                )}

                {/* Controls Container (Grid) */}
                <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
                    
                    {/* Left Col: Request Parameters & Body */}
                    <div className="space-y-4 min-w-0 flex flex-col h-full min-h-0">
                        
                        {/* Tab Navigation */}
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Request</h3>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {(["params", "body", "headers"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                            activeTab === tab
                                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600"
                                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                                        }`}
                                    >
                                        {tab === "params" ? "Parameters" : tab === "body" ? "Body" : "Headers"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content Box */}
                        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-inner transition-colors flex-1 flex flex-col overflow-hidden min-h-0">
                            
                            {/* Params Tab */}
                            {activeTab === "params" && (
                                <div className="space-y-4 pr-2 flex-1 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase text-zinc-500 font-bold tracking-wider">
                                                <th className="pb-2 w-1/3">Name</th>
                                                <th className="pb-2">Value</th>
                                                <th className="pb-2 w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                            {Object.entries(queryParams).map(([key, val]) => (
                                                <tr key={key}>
                                                    <td className="py-2 align-middle pr-2 pl-2">
                                                        <input 
                                                            type="text" 
                                                            value={key}
                                                            onChange={e => {
                                                                const newParams = {...queryParams};
                                                                const value = newParams[key];
                                                                delete newParams[key];
                                                                newParams[e.target.value] = value;
                                                                setQueryParams(newParams);
                                                            }}
                                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-blue-500/50"
                                                        />
                                                    </td>
                                                    <td className="py-2 align-middle pr-2">
                                                        <input 
                                                            type="text"
                                                            value={val}
                                                            onChange={e => setQueryParams({...queryParams, [key]: e.target.value})}
                                                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-blue-500/50"
                                                        />
                                                    </td>
                                                    <td className="py-2 align-middle text-right">
                                                        <button 
                                                            onClick={() => {
                                                                const np = {...queryParams};
                                                                delete np[key];
                                                                setQueryParams(np);
                                                            }}
                                                            className="text-zinc-400 hover:text-red-500 p-1 rounded"
                                                        >
                                                            <X size={14}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Add new param row */}
                                            <tr>
                                                <td className="py-2 align-middle pr-2 pl-2" colSpan={3}>
                                                     <button 
                                                        onClick={() => {
                                                            const keyName = `param${Object.keys(queryParams).length + 1}`;
                                                            setQueryParams({...queryParams, [keyName]: ""});
                                                        }}
                                                        className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 font-medium bg-blue-50 dark:bg-zinc-900 px-3 py-1.5 rounded border border-blue-200 dark:border-zinc-800 transition-colors"
                                                     >
                                                         <Plus size={12}/> Add Parameter
                                                     </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    
                                    <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md">
                                        <p className="text-xs text-zinc-500 mb-1 font-semibold uppercase tracking-wider">Final URL</p>
                                        <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 word-break opacity-80 break-all">{fetchUrlPreview()}</p>
                                    </div>
                                </div>
                            )}

                            {/* Body Tab */}
                            {activeTab === "body" && (
                                <div className="h-full flex flex-col overflow-hidden flex-1 min-h-0">
                                    <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                                            application/json
                                        </span>
                                    </div>
                                    <div className={`w-full flex-1 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden h-full min-h-[160px] transition-colors relative`}>
                                        {(method === Method.GET || method === Method.HEAD) ? (
                                            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 italic text-sm">
                                                Body not applicable for GET/HEAD requests
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 p-1">
                                                <JsonEditor
                                                    value={bodyStr}
                                                    onChange={setBodyStr}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Headers Tab */}
                            {activeTab === "headers" && (
                                <div className="h-full flex flex-col overflow-hidden flex-1 min-h-0">
                                    <div className="flex justify-between items-center mb-3 shrink-0 px-1">
                                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                                            JSON Format
                                        </span>
                                    </div>
                                    <div className={`w-full flex-1 border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden h-full min-h-[160px] transition-colors relative`}>
                                        <div className="absolute inset-0 p-1">
                                            <JsonEditor
                                                value={headersStr}
                                                onChange={setHeadersStr}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Execute Button Full Width */}
                        <button
                            onClick={handleExecute}
                            disabled={isLoading}
                            className={`w-full py-2.5 text-white rounded font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${theme.button}`}
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Play size={16} fill="currentColor" />
                            )}
                            Execute
                        </button>
                    </div>

                    {/* Right Col: Responses */}
                    <div className="flex flex-col h-full min-w-0 min-h-0">
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Response</h3>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                <button className={`px-3 py-1 text-xs font-medium rounded-full bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600 flex items-center gap-1.5 whitespace-nowrap`}>
                                    <Zap size={10} className="text-yellow-400 fill-current" />
                                    Live
                                </button>
                                {response && (
                                    <>
                                        <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-800 mx-1 self-center"></div>
                                        <button className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-all whitespace-nowrap text-zinc-500`}>
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${response.status < 400 ? "bg-emerald-500" : "bg-red-500"}`}></span>
                                            {response.status}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={`flex-1 flex flex-col rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-inner relative min-h-0`}>
                            <div className={`flex-1 flex flex-col overflow-hidden relative ${!response && "items-center justify-center"}`}>
                                {!response && !isLoading && (
                                    <div className="text-center p-6 opacity-60">
                                        <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900 mx-auto mb-3 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                            <Zap size={20} className="text-zinc-400 dark:text-zinc-600" />
                                        </div>
                                        <p className="text-zinc-500 font-medium text-xs uppercase tracking-wide">
                                            Ready to execute
                                        </p>
                                    </div>
                                )}

                                {isLoading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-20">
                                        <Loader2 size={32} className="text-blue-500 animate-spin mb-3"/>
                                        <p className="text-zinc-400 text-xs font-medium animate-pulse">Sending Request... {formatLatency(liveElapsedMs)}</p>
                                    </div>
                                )}

                                {response && (
                                    <>
                                        <div className={`flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 ${response.status >= 400 ? "bg-red-500/5" : "bg-emerald-500/5"} shrink-0`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-bold ${response.status >= 400 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                                                    <span>{response.status}</span>
                                                    <span className={`w-1 h-1 rounded-full ${response.status >= 400 ? "bg-red-400" : "bg-emerald-400"}`}></span>
                                                </div>
                                                <span className="text-[10px] font-mono text-zinc-500">{formatLatency(response.latency)}</span>
                                                {response.contentType && (
                                                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                                        {response.contentType.split(';')[0]}
                                                    </span>
                                                )}
                                                {response.streamed && (
                                                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded">
                                                        stream
                                                        {typeof response.streamBytesReceived === "number"
                                                            ? ` · ${response.streamBytesReceived} B`
                                                            : ""}
                                                    </span>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const textData = response.data instanceof Blob ? '[Binary Data]' : typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
                                                    handleCopy(textData);
                                                }}
                                                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                                            >
                                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                                            {response.streamed && typeof response.data === "string" ? (
                                                <>
                                                    <StreamTextViewer
                                                        text={response.data}
                                                        contentType={response.contentType}
                                                        className="flex-1 min-h-0"
                                                    />
                                                    {response.headers && Object.keys(response.headers).length > 0 && (
                                                        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-4 max-h-[40%] overflow-y-auto custom-scrollbar bg-zinc-50/50 dark:bg-zinc-950/30">
                                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Response Headers</h4>
                                                            <div className="border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                                                                <table className="w-full text-left text-xs">
                                                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                                                        {Object.entries(response.headers).map(([k, v]) => (
                                                                            <tr key={k}>
                                                                                <td className="py-2 px-3 align-top font-bold text-zinc-600 dark:text-zinc-400 w-1/3 break-all">{k}</td>
                                                                                <td className="py-2 px-3 font-mono text-zinc-800 dark:text-zinc-300 break-all">{v as any}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (response.data instanceof Blob || response.contentType?.includes('image/') || response.contentType?.includes('pdf') || response.contentType?.includes('csv') || response.contentType?.includes('spreadsheet') || response.contentType?.includes('excel') || response.contentType?.includes('octet-stream')) ? (
                                                <FileViewer data={response.data} contentType={response.contentType} />
                                            ) : (
                                                <div className="p-4 overflow-y-auto custom-scrollbar h-full">
                                                    <JsonDisplay data={response.data} />
                                                    
                                                    {response.headers && Object.keys(response.headers).length > 0 && (
                                                        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Response Headers</h4>
                                                            <div className="border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                                                                <table className="w-full text-left text-xs">
                                                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                                                        {Object.entries(response.headers).map(([k, v]) => (
                                                                            <tr key={k}>
                                                                                <td className="py-2 px-3 align-top font-bold text-zinc-600 dark:text-zinc-400 w-1/3 break-all">{k}</td>
                                                                                <td className="py-2 px-3 font-mono text-zinc-800 dark:text-zinc-300 break-all">{v as any}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

    // Helper to peek final url in render without crashing
    function fetchUrlPreview() {
        if (!url) return '';
        try {
            const urlObj = new URL(url.includes('://') ? url : `http://${url}`);
            Object.entries(queryParams).forEach(([k, v]) => {
                if(k.trim()) urlObj.searchParams.set(k, v);
            });
            return urlObj.toString();
        } catch(e) {
            const qStr = Object.entries(queryParams).filter(([k]) => k.trim()).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
            if (qStr) return url.includes('?') ? `${url}&${qStr}` : `${url}?${qStr}`;
            return url;
        }
    }
};
