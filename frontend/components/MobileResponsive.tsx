import React, { useState } from 'react';
import { Menu, X, Layers, Activity, Radio, Database, Search, ChevronDown, ChevronRight, LayoutList, Sidebar, Sun, Moon, Lock, Unlock } from 'lucide-react';
import { MethodBadge } from './MethodBadge';

interface MobileResponsiveProps {
  children: React.ReactNode;
  apiVersion: string;
  activeModule: string;
  setActiveModule: (module: string) => void;
  theme: string;
  toggleTheme: () => void;
  viewMode: 'list' | 'focused';
  setViewMode: (mode: 'list' | 'focused') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  tags: Array<{ name: string; description?: string }>;
  filteredEndpoints: Array<{ id: string; path: string; method: string; tags: string[] }>;
  expandedSidebarTags: Record<string, boolean>;
  toggleSidebarTag: (tag: string) => void;
  activeEndpointId: string | null;
  setActiveEndpointId: (id: string | null) => void;
  isAuthorized: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  ENABLE_API: boolean;
  ENABLE_WS: boolean;
  ENABLE_IO: boolean;
  ENABLE_MCP: boolean;
}

export const MobileResponsive: React.FC<MobileResponsiveProps> = ({
  children,
  apiVersion,
  activeModule,
  setActiveModule,
  theme,
  toggleTheme,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  tags,
  filteredEndpoints,
  expandedSidebarTags,
  toggleSidebarTag,
  activeEndpointId,
  setActiveEndpointId,
  isAuthorized,
  setIsAuthModalOpen,
  ENABLE_API,
  ENABLE_WS,
  ENABLE_IO,
  ENABLE_MCP,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0 safe-top">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 -ml-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white touch-manipulation"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
          F-<span className="text-blue-500">Docs</span>
        </h1>
        <button
          onClick={toggleTheme}
          className="p-2 -mr-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-300 touch-manipulation"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col animate-slide-in-left safe-top safe-bottom">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
                F-<span className="text-blue-500">Docs</span>
              </h1>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white touch-manipulation"
              >
                <X size={20} />
              </button>
            </div>

            {/* Module Switcher for Mobile */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-4 gap-2">
                {ENABLE_API && (
                  <button
                    onClick={() => { setActiveModule('api'); setIsMobileSidebarOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all touch-manipulation ${activeModule === 'api' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Layers size={20} />
                    <span className="text-[10px] font-medium">API</span>
                  </button>
                )}
                {ENABLE_WS && (
                  <button
                    onClick={() => { setActiveModule('ws'); setIsMobileSidebarOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all touch-manipulation ${activeModule === 'ws' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Activity size={20} />
                    <span className="text-[10px] font-medium">WS</span>
                  </button>
                )}
                {ENABLE_IO && (
                  <button
                    onClick={() => { setActiveModule('io'); setIsMobileSidebarOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all touch-manipulation ${activeModule === 'io' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Radio size={20} />
                    <span className="text-[10px] font-medium">IO</span>
                  </button>
                )}
                {ENABLE_MCP && (
                  <button
                    onClick={() => { setActiveModule('mcp'); setIsMobileSidebarOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all touch-manipulation ${activeModule === 'mcp' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Database size={20} />
                    <span className="text-[10px] font-medium">MCP</span>
                  </button>
                )}
              </div>
            </div>

            {/* API-specific sidebar content for mobile */}
            {activeModule === 'api' && (
              <>
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex bg-zinc-200 dark:bg-zinc-800 rounded p-0.5">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded touch-manipulation ${viewMode === 'list' ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}
                      >
                        <LayoutList size={14} />
                      </button>
                      <button
                        onClick={() => setViewMode('focused')}
                        className={`p-1.5 rounded touch-manipulation ${viewMode === 'focused' ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'}`}
                      >
                        <Sidebar size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search endpoints..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 text-sm touch-manipulation"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  {tags.map((tag) => {
                    const tagEndpoints = filteredEndpoints.filter((ep) => ep.tags.includes(tag.name));
                    if (tagEndpoints.length === 0) return null;
                    const isExpanded = expandedSidebarTags[tag.name] !== false;
                    return (
                      <div key={tag.name} className="mb-2">
                        <button
                          onClick={() => toggleSidebarTag(tag.name)}
                          className="w-full flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-300 py-2 px-2 touch-manipulation"
                        >
                          <span>{tag.name}</span>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {isExpanded && (
                          <div className="space-y-1 pl-2 border-l-2 border-zinc-300 dark:border-zinc-700">
                            {tagEndpoints.map((ep) => (
                              <button
                                key={ep.id}
                                onClick={() => { setActiveEndpointId(ep.id); setIsMobileSidebarOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 rounded text-xs flex items-center gap-2 touch-manipulation ${activeEndpointId === ep.id ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-zinc-600 dark:text-zinc-400'}`}
                              >
                                <div className="w-12 shrink-0">
                                  <MethodBadge method={ep.method as any} className="w-full text-center scale-90" />
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
                
                {/* Auth Button for Mobile */}
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button 
                    onClick={() => { setIsAuthModalOpen(true); setIsMobileSidebarOpen(false); }}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 touch-manipulation ${
                      isAuthorized 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {isAuthorized ? <Unlock size={14} /> : <Lock size={14} />}
                    <span>{isAuthorized ? 'Authorized' : 'Authorize'}</span>
                  </button>
                </div>
              </>
            )}
          </aside>
        </>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex items-center justify-around py-2 px-2 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0 safe-bottom mobile-nav-shadow">
        {ENABLE_API && (
          <button
            onClick={() => setActiveModule('api')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[60px] touch-manipulation ${activeModule === 'api' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            <Layers size={22} />
            <span className="text-[10px] font-medium">API</span>
          </button>
        )}
        {ENABLE_WS && (
          <button
            onClick={() => setActiveModule('ws')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[60px] touch-manipulation ${activeModule === 'ws' ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            <Activity size={22} />
            <span className="text-[10px] font-medium">WS</span>
          </button>
        )}
        {ENABLE_IO && (
          <button
            onClick={() => setActiveModule('io')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[60px] touch-manipulation ${activeModule === 'io' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            <Radio size={22} />
            <span className="text-[10px] font-medium">IO</span>
          </button>
        )}
        {ENABLE_MCP && (
          <button
            onClick={() => setActiveModule('mcp')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[60px] touch-manipulation ${activeModule === 'mcp' ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            <Database size={22} />
            <span className="text-[10px] font-medium">MCP</span>
          </button>
        )}
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </>
  );
};
