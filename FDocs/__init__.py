from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Get the path to the current file (package root)
PACKAGE_ROOT = Path(__file__).resolve().parent
DEFAULT_JS_PATH = PACKAGE_ROOT / "dist" / "f_docs.js"


def _discover_repo_js_path() -> Optional[Path]:
    """
    Find .../FDocs/dist/f_docs.js by walking up from cwd (monorepo dev).
    Fixes the case where uvicorn is started from example/ or repo root.
    """
    cwd = Path.cwd().resolve()
    visited = set()
    cur: Optional[Path] = cwd
    while cur is not None and cur not in visited:
        visited.add(cur)
        candidate = cur / "FDocs" / "dist" / "f_docs.js"
        if candidate.is_file():
            return candidate
        parent = cur.parent
        cur = parent if parent != cur else None
    return None


def _resolve_js_path(js_path: Optional[str] = None) -> Path:
    """
    Resolve path to bundled f_docs.js.

    Priority:
    1. Explicit ``js_path`` (existing file)
    2. Env ``FDOC_JS_PATH`` (absolute path to f_docs.js)
    3. Fresh copy in repo (FDocs/dist next to cwd ancestors) if newer than installed wheel
    4. Installed package ``PACKAGE_ROOT/dist/f_docs.js``
    5. Legacy setuptools build folder under cwd
    """
    if js_path:
        candidate = Path(js_path).expanduser()
        if candidate.is_file():
            return candidate

    env_js = os.environ.get("FDOC_JS_PATH", "").strip()
    if env_js:
        candidate = Path(env_js).expanduser()
        if candidate.is_file():
            return candidate

    packaged = DEFAULT_JS_PATH
    repo_js = _discover_repo_js_path()

    if repo_js is not None and packaged.is_file():
        try:
            if repo_js.stat().st_mtime >= packaged.stat().st_mtime:
                return repo_js
        except OSError:
            return repo_js

    if repo_js is not None:
        return repo_js

    if packaged.is_file():
        return packaged

    legacy = Path.cwd() / "build" / "lib" / "FDocs" / "dist" / "f_docs.js"
    if legacy.is_file():
        return legacy

    return Path(js_path) if js_path else packaged

def f_docs(
    app: FastAPI,
    *,
    docs_url: str = "/docs",
    openapi_url: str = "/openapi.json",
    title: str = "F-Docs",
    html_path: str = None,
    js_path: str = None,
    assets_url: str = "/fdocs-static"
) -> FastAPI:
    """
    Integrates F-Docs into a FastAPI application.

    Usage:
        app = FastAPI()
        app = f_docs(app)

    After ``npm run build`` in ``frontend/``, the newest ``FDocs/dist/f_docs.js``
    next to your repo is preferred over the copy inside site-packages when its
    modification time is newer (so you don't have to reinstall after every build).

    Override with env ``FDOC_JS_PATH=/path/to/f_docs.js`` if needed.
    """
    
    # Use defaults if not provided
    app.docs_url = None
    actual_js_path = _resolve_js_path(js_path)

    # 1. Mount Static Assets (the folder containing f_docs.js) if it exists
    if actual_js_path.is_file():
        app.mount(assets_url, StaticFiles(directory=str(actual_js_path.parent)), name="f_docs_assets")

    # Backward compatibility and stable default script endpoint.
    @app.get("/f_docs.js", include_in_schema=False)
    async def f_docs_legacy_js():
        resolved_path = _resolve_js_path(js_path)
        if not resolved_path.is_file():
            return HTMLResponse(
                content="<h1>F-Docs asset not found</h1><p>Run frontend build to generate f_docs.js.</p>",
                status_code=500,
            )
        return FileResponse(
            resolved_path,
            headers={
                "Cache-Control": "no-store, max-age=0",
                "Pragma": "no-cache",
            },
        )

    # 2. Define the Documentation Route
    @app.get(docs_url, include_in_schema=False, response_class=HTMLResponse)
    async def f_docs_ui():
        resolved_for_html = _resolve_js_path(js_path)
        js_cache_bust = (
            int(resolved_for_html.stat().st_mtime)
            if resolved_for_html.is_file()
            else 0
        )
        # Config to inject
        config_data = {
            "openApiUrl": openapi_url,
            "title": title,
        }
        
        script_tag = f"<script>window.NEXUS_CONFIG = {json.dumps(config_data)};</script>"
        theme_bootstrap_tag = """
        <style>
            html, body, #root { height: 100%; margin: 0; }
            html { background: #ffffff; color: #18181b; }
            html.dark { background: #09090b; color: #fafafa; }
            html.dark body, html.dark #root { background: #09090b; color: #fafafa; }
        </style>
        <script>
            (function () {
                try {
                    var saved = localStorage.getItem('theme');
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var isDark = saved === 'dark' || (!saved && prefersDark);
                    if (isDark) {
                        document.documentElement.classList.add('dark');
                        document.documentElement.style.backgroundColor = '#09090b';
                    }
                } catch (e) {}
            })();
        </script>
        """
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            {script_tag}
            {theme_bootstrap_tag}
        </head>
        <body>
            <div id="root"></div>
            <script type="module" src="/f_docs.js?v={js_cache_bust}"></script>
        </body>
        </html>
        """

        return HTMLResponse(content=html_content, status_code=200)

    return app
