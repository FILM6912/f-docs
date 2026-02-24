import json
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

# Get the path to the current file (package root)
PACKAGE_ROOT = Path(__file__).parent
DEFAULT_JS_PATH = PACKAGE_ROOT / "dist" / "f_docs.js"

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
    actual_js_path = Path(js_path) if js_path else DEFAULT_JS_PATH

    # 1. Mount Static Assets (the folder containing f_docs.js) if it exists
    if actual_js_path.exists():
        app.mount(assets_url, StaticFiles(directory=str(actual_js_path.parent)), name="f_docs_assets")

    # 2. Define the Documentation Route
    @app.get(docs_url, include_in_schema=False, response_class=HTMLResponse)
    async def f_docs_ui():
        # Config to inject
        config_data = {
            "openApiUrl": openapi_url,
            "title": title,
        }
        
        script_tag = f"<script>window.NEXUS_CONFIG = {json.dumps(config_data)};</script>"
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
            {script_tag}
        </head>
        <body>
            <div id="root"></div>
            <script type="module" src="{assets_url}/{actual_js_path.name}"></script>
        </body>
        </html>
        """

        return HTMLResponse(content=html_content, status_code=200)

    return app
