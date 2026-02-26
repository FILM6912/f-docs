import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Get the path to the current file (package root)
PACKAGE_ROOT = Path(__file__).parent
DEFAULT_JS_PATH = PACKAGE_ROOT / "dist" / "f_docs.js"


def _resolve_js_path(js_path: str = None) -> Path:
    if js_path:
        candidate = Path(js_path)
        if candidate.exists():
            return candidate

    candidates = [
        DEFAULT_JS_PATH,
        Path.cwd() / "FDocs" / "dist" / "f_docs.js",
        Path.cwd() / "build" / "lib" / "FDocs" / "dist" / "f_docs.js",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate

    return Path(js_path) if js_path else DEFAULT_JS_PATH

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
    """
    
    # Use defaults if not provided
    app.docs_url = None
    actual_js_path = _resolve_js_path(js_path)

    # 1. Mount Static Assets (the folder containing f_docs.js) if it exists
    if actual_js_path.exists():
        app.mount(assets_url, StaticFiles(directory=str(actual_js_path.parent)), name="f_docs_assets")

    # Backward compatibility and stable default script endpoint.
    @app.get("/f_docs.js", include_in_schema=False)
    async def f_docs_legacy_js():
        resolved_path = _resolve_js_path(js_path)
        if not resolved_path.exists():
            return HTMLResponse(
                content="<h1>F-Docs asset not found</h1><p>Run frontend build to generate f_docs.js.</p>",
                status_code=500,
            )
        return FileResponse(resolved_path)

    # 2. Define the Documentation Route
    @app.get(docs_url, include_in_schema=False, response_class=HTMLResponse)
    async def f_docs_ui():
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
            <script type="module" src="/f_docs.js"></script>
        </body>
        </html>
        """

        return HTMLResponse(content=html_content, status_code=200)

    return app
