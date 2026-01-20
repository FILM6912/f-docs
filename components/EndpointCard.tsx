import React, { useState, useMemo, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Lock,
  Unlock,
  Zap,
  FileJson,
  Upload,
  File as FileIcon,
  X,
  Link,
  FileCode,
  Download,
  AlertCircle,
  MoreVertical,
  MessageSquare,
} from "lucide-react";
import { useEndpointPersistence } from '../hooks/useEndpointPersistence';
import { JsonDisplay } from "./JsonDisplay";
import { MarkdownDisplay } from "./MarkdownDisplay";
import { Endpoint, Method, SimulationResponse, SecurityScheme } from "../types";
import { MethodBadge } from "./MethodBadge";
import { executeRequest } from "../services/mockApiService";
import { generateMockPayload } from "../services/geminiService";

interface EndpointCardProps {
  endpoint: Endpoint;
  baseUrl: string;
  securitySchemes?: Record<string, SecurityScheme>;
  authCredentials: Record<string, string>;
  forcedOpen?: boolean;
}

export const EndpointCard: React.FC<EndpointCardProps> = ({
  endpoint,
  baseUrl,
  securitySchemes = {},
  authCredentials,
  forcedOpen = false,
}) => {
  const [isOpenState, setIsOpenState] = useState(false);
  const isOpen = forcedOpen || isOpenState;

  // Persistence Hook
  const { 
      activeTab, 
      setActiveTab, 
      paramValues, 
      setParamValues, 
      bodyValue, 
      setBodyValue 
  } = useEndpointPersistence(endpoint.id, {
      activeTab: (() => {
        const hasParams = endpoint.parameters && endpoint.parameters.length > 0;
        const supportsBody = ["POST", "PUT", "PATCH"].includes(endpoint.method);
        return !hasParams && supportsBody ? "body" : "params";
      })(),
      paramValues: {},
      bodyValue: endpoint.requestBodySchema || ""
  });

  const [rightPanelTab, setRightPanelTab] = useState("0");
  const [showDescModal, setShowDescModal] = useState(false); // New state for modal
  // const [paramValues, setParamValues] = useState<Record<string, string>>({});  <-- Replaced
  // const [bodyValue, setBodyValue] = useState(endpoint.requestBodySchema || ""); <-- Replaced

  // State for multipart/form-data: supports files and text fields
  const [formValues, setFormValues] = useState<Record<string, string | File>>(
    {},
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<SimulationResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);

  // Determine security state
  const isSecured = endpoint.security && endpoint.security.length > 0;
  const authorized =
    isSecured &&
    endpoint.security?.some((req) => {
      return Object.keys(req).every(
        (schemeName) => !!authCredentials[schemeName],
      );
    });

  // Determine request type
  const isMultipart =
    endpoint.requestBodyType?.includes("multipart") ||
    endpoint.requestBodyType?.includes("form-urlencoded");

  // Swagger UI-like Theme based on Method
  const methodTheme = {
    [Method.GET]: {
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-200 dark:border-blue-500/20",
      text: "text-blue-700 dark:text-blue-400",
      button: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20",
    },
    [Method.POST]: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200 dark:border-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-400",
      button: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20",
    },
    [Method.PUT]: {
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/20",
      text: "text-amber-700 dark:text-amber-400",
      button: "bg-amber-600 hover:bg-amber-500 shadow-amber-900/20",
    },
    [Method.DELETE]: {
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200 dark:border-red-500/20",
      text: "text-red-700 dark:text-red-400",
      button: "bg-red-600 hover:bg-red-500 shadow-red-900/20",
    },
    [Method.PATCH]: {
      bg: "bg-purple-50 dark:bg-purple-500/10",
      border: "border-purple-200 dark:border-purple-500/20",
      text: "text-purple-700 dark:text-purple-400",
      button: "bg-purple-600 hover:bg-purple-500 shadow-purple-900/20",
    },
  }[endpoint.method];

  // Helper: Prepare Request Data (Path & Headers)
  const { finalPath, headers } = useMemo(() => {
    let path = endpoint.path;
    endpoint.parameters?.forEach((p) => {
      if (p.in === "path") {
        path = path.replace(
          `{${p.name}}`,
          paramValues[p.name] || `{${p.name}}`,
        );
      }
    });

    // Construct Auth Headers
    const h: Record<string, string> = {};
    if (isSecured && endpoint.security) {
      const req =
        endpoint.security.find((r) =>
          Object.keys(r).every((k) => !!authCredentials[k]),
        ) || endpoint.security[0];
      if (req) {
        Object.keys(req).forEach((schemeName) => {
          const scheme = securitySchemes[schemeName];
          const value = authCredentials[schemeName];
          if (scheme && value) {
            if (scheme.type === "http" && scheme.scheme === "bearer") {
              h["Authorization"] = `Bearer ${value}`;
            } else if (scheme.type === "http" && scheme.scheme === "basic") {
              h["Authorization"] = `Basic ${value}`;
            } else if (
              scheme.type === "apiKey" &&
              scheme.in === "header" &&
              scheme.name
            ) {
              h[scheme.name] = value;
            } else if (
              scheme.type === "apiKey" &&
              scheme.in === "query" &&
              scheme.name
            ) {
              const separator = path.includes("?") ? "&" : "?";
              path += `${separator}${scheme.name}=${encodeURIComponent(value)}`;
            } else if (scheme.type === "oauth2") {
              // Standard OAuth2 bearer token usage
              h["Authorization"] = `Bearer ${value}`;
            }
          }
        });
      }
    }
    return { finalPath: path, headers: h };
  }, [endpoint, paramValues, authCredentials, securitySchemes, isSecured]);

  const handleExecute = async () => {
    // Validation
    const missingFields: string[] = [];

    // Check parameters
    endpoint.parameters?.forEach((p) => {
      if (p.required && !paramValues[p.name]) {
        missingFields.push(`Parameter: ${p.name}`);
      }
    });

    // Check multipart body
    if (isMultipart && endpoint.requestBodyProperties) {
      endpoint.requestBodyProperties.forEach((p) => {
        if (p.required && !formValues[p.name]) {
          missingFields.push(`Body Field: ${p.name}`);
        }
      });
    }

    if (missingFields.length > 0) {
      setValidationErrors(missingFields);
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setRightPanelTab("live"); // Switch to live view on execute
    try {
      let finalBody: string | FormData | undefined = bodyValue;

      if (isMultipart) {
        const formData = new FormData();
        Object.entries(formValues).forEach(([key, value]) => {
          formData.append(key, value as string | Blob);
        });
        finalBody = formData;
      }

      const res = await executeRequest(
        baseUrl,
        endpoint.method,
        finalPath,
        finalBody,
        headers,
      );
      setResponse(res);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!endpoint.requestBodySchema) return;
    setIsGenerating(true);
    try {
      const json = await generateMockPayload(endpoint.requestBodySchema);
      setBodyValue(json);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = `${baseUrl.replace(/\/$/, "")}${endpoint.path}`;
    navigator.clipboard.writeText(fullUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleViewRawJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    const jsonString = JSON.stringify(endpoint, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setShowExportMenu(false);
  };

  const handleDownloadJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(endpoint, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `${endpoint.method}_${endpoint.path.replace(/\//g, "_")}.json`,
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setShowExportMenu(false);
  };

  const handleFormFileChange = (
    key: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormValues((prev) => ({ ...prev, [key]: e.target.files![0] }));
    }
  };

  const handleFormTextChange = (key: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  const removeFile = (key: string) => {
    setFormValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Get list of status codes for tabs
  const responseCodes = Object.keys(endpoint.responses).sort();

  return (
    // Added z-10 when menu is open to fix stacking context overlap with next card
    <div
      className={`mb-4 rounded-lg border transition-all duration-200 ${isOpen && !forcedOpen ? "ring-1 ring-opacity-50 shadow-lg" : ""} ${methodTheme.border} bg-white dark:bg-slate-950 shadow-sm dark:shadow-none relative ${showExportMenu ? "z-10" : ""} ${forcedOpen ? "h-full flex flex-col mb-0 border-0 rounded-none md:rounded-lg md:border" : ""}`}
    >
      {/* Header - Full colored bar like Swagger */}
      <div
        className={`flex items-center justify-between p-3 px-4 select-none group ${methodTheme.bg} ${!forcedOpen && "hover:brightness-110 cursor-pointer"} transition-all rounded-t-lg ${!isOpen ? "rounded-b-lg" : ""}`}
        onClick={!forcedOpen ? () => setIsOpenState(!isOpenState) : undefined}
      >
        <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
          {/* Method Badge with fixed width for alignment. Increased to w-20 to accommodate longer methods like DELETE safely. */}
          <div className="w-20 shrink-0">
            <MethodBadge
              method={endpoint.method}
              className="shadow-sm w-full block text-center"
            />
          </div>
          <span className="font-mono text-slate-700 dark:text-slate-200 font-medium truncate min-w-0 flex-1 flex items-center gap-3">
            <span className="opacity-90">{endpoint.path}</span>
            <span className="text-slate-400 text-sm hidden sm:block truncate shrink-0 font-sans opacity-60">
              - {endpoint.summary}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Copy URL Button */}
          <button
            onClick={handleCopyUrl}
            className={`transition-all p-1 ${urlCopied ? "text-emerald-500 dark:text-emerald-400" : "text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
            title="Copy Endpoint URL"
          >
            {urlCopied ? (
              <Check size={14} />
            ) : (
              <Link size={14} />
            )}
          </button>

          {/* Download/Export Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExportMenu(!showExportMenu);
              }}
              className="p-1 text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Export"
            >
              <MoreVertical size={16} />
            </button>
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-50 overflow-hidden py-1">
                  <button
                    onClick={handleViewRawJson}
                    className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2"
                  >
                    <FileCode size={12} /> Raw JSON
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white flex items-center gap-2"
                  >
                    <Download size={12} /> Download JSON
                  </button>
                </div>
              </>
            )}
          </div>

          {isSecured && (
            <div title={authorized ? "Authorized" : "Authorization required"}>
              {authorized ? (
                <Unlock size={14} className="text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Lock size={14} className="text-slate-400 dark:text-slate-600" />
              )}
            </div>
          )}
          {!forcedOpen && (
            <div className="text-slate-500 dark:text-slate-400 transition-colors ml-2">
              {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div
          className={`bg-slate-50/50 dark:bg-slate-900/30 p-4 border-t border-slate-200 dark:border-slate-800/50 animate-in fade-in slide-in-from-top-1 duration-200 rounded-b-lg ${forcedOpen ? "flex-1 flex flex-col min-h-0 overflow-hidden" : ""}`}
        >
          <div className="mb-6 px-4">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
              Description
             </h4>
             
             {(() => {
                 const descText = endpoint.description || "No description available.";
                 const isLong = descText.split('\n').length > 5 || descText.length > 300;
                 
                 if (!isLong) {
                      return <MarkdownDisplay content={descText} className="text-sm text-slate-600 dark:text-slate-300" />;
                 }

                 return (
                     <div className="relative block w-full">
                         <div className="mask-image-gradient-b">
                                <MarkdownDisplay content={descText} className="text-sm dark:text-slate-300 text-slate-600 line-clamp-2" />
                          </div>
                          
                           <div className="mt-2 text-right">
                                <button 
                                   onClick={(e) => { e.stopPropagation(); setShowDescModal(true); }}
                                   className="text-xs font-bold text-blue-500 hover:text-blue-400 inline-flex items-center group cursor-pointer"
                                >
                                 <span className="shrink-0 text-[10px] bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-slate-700/50 flex items-center gap-1 dark:group-hover:border-blue-500/30 transition-colors"><MessageSquare size={8} /> Read More</span>
                                </button>
                            </div>
                          
                          {/* Popup Modal */}
                          {showDescModal && (
                              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => {e.stopPropagation(); setShowDescModal(false);}}>
                                  <div 
                                     className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
                                     onClick={e => e.stopPropagation()}
                                 >
                                      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
                                          <h3 className="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                                              {/* Icon here if needed */}
                                              Description
                                          </h3>
                                          <button 
                                            onClick={(e) => {e.stopPropagation(); setShowDescModal(false);}}
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                          >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                          </button>
                                      </div>
                                     <div className="p-6 overflow-y-auto custom-scrollbar">
                                        <MarkdownDisplay content={descText} className="text-sm text-slate-300" />
                                     </div>
                                 </div>
                             </div>
                         )}
                     </div>
                 );
             })()}
          </div>

          {/* Controls Container */}
          <div className={`grid lg:grid-cols-2 gap-6 ${forcedOpen ? "flex-1 min-h-0" : ""}`}>
            {/* Left Col: Request Parameters & Body */}
            <div className={`space-y-4 min-w-0 flex flex-col ${forcedOpen ? "h-full" : ""}`}>
              {/* Tab Navigation for Request */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  Request
                </h3>
                <div className="flex gap-1">
                  {(["params", "body", "auth"] as const).map((tab) => {
                    const isDisabled =
                      tab === "body" &&
                      !["POST", "PUT", "PATCH"].includes(endpoint.method);
                    return (
                      <button
                        key={tab}
                        disabled={isDisabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(tab);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                          activeTab === tab
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        } ${isDisabled ? "opacity-30 cursor-not-allowed hidden" : ""}`}
                      >
                        {tab === "params"
                          ? "Parameters"
                          : tab === "body"
                            ? "Request Body"
                            : "Authorization"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 min-h-[250px] flex-1 shadow-inner transition-colors ${forcedOpen ? "flex flex-col overflow-hidden" : ""}`}>
                {/* Params Tab */}
                {activeTab === "params" && (
                  <div className="space-y-4">
                    {!endpoint.parameters ||
                    endpoint.parameters.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm italic opacity-60 flex-1">
                        <span>No parameters required</span>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
                            <th className="pb-2 w-1/3">Name</th>
                            <th className="pb-2">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                          {endpoint.parameters.map((param) => (
                            <tr key={param.name}>
                              <td className="py-3 align-top pr-2">
                                <div className="flex flex-col">
                                  <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                                    {param.name}
                                    {param.required && (
                                      <span className="text-red-500 ml-0.5">
                                        *
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-500 mt-0.5">
                                    {param.in} • {param.type}
                                  </span>
                                    {param.description && (
                                    <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-1 leading-tight">
                                      {param.description}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 align-top">
                                <input
                                  type="text"
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                  placeholder={`Enter ${param.name}...`}
                                  value={paramValues[param.name] || ''}
                                  onChange={(e) =>
                                    setParamValues((prev) => ({
                                      ...prev,
                                      [param.name]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Body Tab */}
                {activeTab === "body" && (
                  <div className={`h-full flex flex-col ${forcedOpen ? "flex-1 min-h-0" : ""}`}>
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                        {endpoint.requestBodyType || "application/json"}
                      </span>
                      {!isMultipart && (
                        <button
                          onClick={handleAiGenerate}
                          disabled={isGenerating}
                          className="group flex items-center gap-1.5 text-[10px] font-medium bg-purple-500/5 text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/20 hover:bg-purple-500/20 transition-all disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Sparkles
                              size={10}
                              className="group-hover:text-purple-300"
                            />
                          )}
                          Generate Example
                        </button>
                      )}
                    </div>

                    {isMultipart && endpoint.requestBodyProperties ? (
                      // Multipart / Form Data Builder
                      <div className="space-y-4">
                        {endpoint.requestBodyProperties.map((prop) => {
                          const isFile =
                            prop.format === "binary" || prop.type === "file";
                          return (
                            <div
                              key={prop.name}
                              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded p-3"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {prop.name}
                                </span>
                                {prop.required && (
                                  <span className="text-red-500 text-xs">
                                    *
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono bg-white dark:bg-slate-950 px-1.5 rounded border border-slate-200 dark:border-transparent">
                                  {prop.type}
                                  {prop.format ? ` (${prop.format})` : ""}
                                </span>
                              </div>

                              {isFile ? (
                                // File Input
                                <div className="relative">
                                  {formValues[prop.name] &&
                                  formValues[prop.name] instanceof File ? (
                                                                    <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-8 h-8 bg-blue-500/10 rounded flex items-center justify-center shrink-0">
                                          <FileIcon
                                            size={14}
                                            className="text-blue-500 dark:text-blue-400"
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                            {
                                              (formValues[prop.name] as File)
                                                .name
                                            }
                                          </p>
                                          <p className="text-[10px] text-slate-500">
                                            {(
                                              (formValues[prop.name] as File)
                                                .size / 1024
                                            ).toFixed(1)}{" "}
                                            KB
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => removeFile(prop.name)}
                                        className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="relative group">
                                      <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                                        onChange={(e) =>
                                          handleFormFileChange(prop.name, e)
                                        }
                                      />
                                      <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 rounded p-4 text-center group-hover:border-blue-500/30 transition-colors">
                                        <Upload
                                          size={16}
                                          className="mx-auto mb-1 text-slate-500 group-hover:text-blue-400"
                                        />
                                        <p className="text-xs text-slate-500">
                                          Click or drag to upload
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Standard Text Input
                                <input
                                  type="text"
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500/50"
                                  placeholder={`Enter ${prop.name}`}
                                  onChange={(e) =>
                                    handleFormTextChange(
                                      prop.name,
                                      e.target.value,
                                    )
                                  }
                                />
                              )}
                              {prop.description && (
                                <p className="text-[10px] text-slate-500 mt-1.5">
                                  {prop.description}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // JSON Editor UI
                      <textarea
                        className={`w-full flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded p-3 font-mono text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 min-h-[160px] resize-y leading-relaxed transition-colors ${forcedOpen ? "h-full resize-none" : ""}`}
                        spellCheck={false}
                        placeholder="{}"
                        value={bodyValue}
                        onChange={(e) => setBodyValue(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {/* Auth Tab */}
                {activeTab === "auth" && (
                  <div className="flex flex-col gap-3">
                    {!isSecured ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm italic py-12 rounded-lg bg-slate-50 dark:bg-slate-900 transition-colors border border-dashed border-slate-200 dark:border-slate-800">
                        No authorization needed
                      </div>
                    ) : (
                      endpoint.security?.map((req, idx) => (
                        <div key={idx} className="space-y-2">
                          {Object.keys(req).map((schemeName) => {
                            const scheme = securitySchemes[schemeName];
                            const hasCreds = !!authCredentials[schemeName];
                            return (
                              <div
                                key={schemeName}
                                className="p-3 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50 dark:bg-slate-900/50"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {hasCreds ? (
                                      <Unlock
                                        size={12}
                                        className="text-emerald-500"
                                      />
                                    ) : (
                                      <Lock
                                        size={12}
                                        className="text-amber-500"
                                      />
                                    )}
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                      {schemeName}
                                    </span>
                                  </div>
                                  {hasCreds ? (
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                      Authorized
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                                      Missing
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="password"
                                    value="************************"
                                    disabled
                                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-600 text-[10px] px-2 py-1.5 rounded cursor-not-allowed font-mono tracking-widest"
                                  />
                                </div>
                                {!hasCreds && (
                                  <p className="text-[10px] text-slate-500 mt-2 italic">
                                    Please set credentials in the top-right
                                    "Authorize" menu.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleExecute}
                disabled={isLoading}
                className={`w-full py-2.5 text-white rounded font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${methodTheme.button}`}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                Execute
              </button>
            </div>

            {/* Right Col: Responses & Preview */}
            <div className="flex flex-col h-full min-w-0">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Response</h3>

                {/* Response Tabs */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                  <button
                    onClick={() => setRightPanelTab("live")}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      rightPanelTab === "live"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <Zap
                      size={10}
                      className={
                        rightPanelTab === "live"
                          ? "text-yellow-400 fill-current"
                          : ""
                      }
                    />
                    Live
                  </button>
                  {/* Removed cURL Tab */}
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-1 self-center"></div>
                  {responseCodes.map((code) => (
                    <button
                      key={code}
                      onClick={() => setRightPanelTab(code)}
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-all whitespace-nowrap ${
                        rightPanelTab === code
                          ? `bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600`
                          : `text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50`
                      }`}
                    >
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${parseInt(code) < 400 ? "bg-emerald-500" : "bg-red-500"}`}
                      ></span>
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex-1 flex flex-col rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden min-h-[300px] shadow-inner relative ${forcedOpen ? "h-full" : ""}`}>
                {/* 1. Live Response Tab */}
                {rightPanelTab === "live" && (
                  <div
                    className={`flex-1 flex flex-col overflow-auto custom-scrollbar relative ${!response && "items-center justify-center"}`}
                  >
                    {!response && !isLoading && (
                      <div className="text-center p-6 opacity-60">
                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 mx-auto mb-3 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                          <Zap size={20} className="text-slate-400 dark:text-slate-600" />
                        </div>
                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wide">
                          Ready to execute
                        </p>
                      </div>
                    )}

                    {isLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-20">
                        <Loader2
                          size={32}
                          className="text-blue-500 animate-spin mb-3"
                        />
                        <p className="text-slate-400 text-xs font-medium animate-pulse">
                          Sending Request...
                        </p>
                      </div>
                    )}

                    {response && (
                      <>
                        <div
                          className={`flex items-center justify-between px-4 py-2 border-b border-slate-800 ${response.status >= 400 ? "bg-red-500/5" : "bg-emerald-500/5"} shrink-0`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-bold ${response.status >= 400 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}
                            >
                              <span>{response.status}</span>
                              <span
                                className={`w-1 h-1 rounded-full ${response.status >= 400 ? "bg-red-400" : "bg-emerald-400"}`}
                              ></span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">
                              {response.latency}ms
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleCopy(JSON.stringify(response.data, null, 2))
                            }
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {copied ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                        <div className="p-4">
                            <JsonDisplay data={response.data} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 2. Example Response Tabs (Replaces the bottom table description) */}
                {responseCodes.includes(rightPanelTab) &&
                  endpoint.responses[parseInt(rightPanelTab)] && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
                      <div className="flex flex-col border-b border-slate-800 bg-slate-900/30 shrink-0">
                        {/* Description Section moved here */}
                        <div className="px-4 py-3">
                          <h5 className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                            Description
                          </h5>
                          <p className="text-sm text-slate-300 leading-snug">
                            {
                              endpoint.responses[parseInt(rightPanelTab)]
                                .description
                            }
                          </p>
                        </div>
                        <div className="px-4 py-1.5 bg-slate-900/50 flex justify-between items-center border-t border-slate-800/50">
                          <span className="text-[10px] font-mono text-slate-500">
                            application/json
                          </span>
                          {endpoint.responses[parseInt(rightPanelTab)]
                            .schema && (
                            <button
                              onClick={() =>
                                handleCopy(
                                  endpoint.responses[parseInt(rightPanelTab)]
                                    .schema!,
                                )
                              }
                              className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 text-[10px] font-medium"
                            >
                              {copied ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                              {copied ? "Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 overflow-auto custom-scrollbar flex-1 bg-white dark:bg-slate-950 transition-colors">
                        {endpoint.responses[parseInt(rightPanelTab)].schema ? (
                             (() => {
                                 let dataToDisplay = endpoint.responses[parseInt(rightPanelTab)].schema;
                                 try {
                                     // Try to parse if it's a string, so JsonDisplay can prettify it
                                     if(typeof dataToDisplay === 'string') {
                                         dataToDisplay = JSON.parse(dataToDisplay);
                                     }
                                 } catch(e) {
                                     // If parse fails, display as string (JsonDisplay will stringify the string, so it might be double quoted, let's just pass it or maybe JsonDisplay needs update? 
                                     // Actually JsonDisplay stringifies whatever is passed. If we pass a string, it becomes a JSON string. 
                                     // If we want to highlight a raw string that IS json, we should parse it. 
                                     // If it's not valid JSON, we might want to just show text. 
                                 }
                                 return <JsonDisplay data={dataToDisplay} />;
                             })()
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-600 italic text-sm">
                            <FileJson size={24} className="mb-2 opacity-30" />
                            No example schema provided
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
            
            {/* Added Modal Portal for this card specifically or just fixed position overlay */}
            {validationErrors && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setValidationErrors(null); }}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-500/10 rounded-full shrink-0">
                                    <AlertCircle size={24} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Missing Required Fields</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Please complete the following fields:</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-950/50 rounded-md border border-slate-200 dark:border-slate-800/50 p-3 mb-5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                <ul className="space-y-2">
                                    {validationErrors.map((err, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                                            {err}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); setValidationErrors(null); }}
                                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white text-slate-600 dark:text-slate-300 rounded font-bold text-xs transition-colors border border-slate-200 dark:border-slate-700 uppercase tracking-wide"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
