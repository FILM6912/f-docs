import json
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

def f_docs(
    app: FastAPI,
    *,
    docs_url: str = "/docs",
    openapi_url: str = "/openapi.json",
    title: str = "F-Docs",
    html_path: str = "dist/index.html",
    assets_path: str = "dist/assets",
    assets_url: str = "/assets"
) -> FastAPI:
    """
    Integrates F-Docs into a FastAPI application.

    Usage:
        app = FastAPI()
        app = f_docs(app)
    """

    # 1. Mount Static Assets if they exist
    if os.path.exists(assets_path):
        app.mount(assets_url, StaticFiles(directory=assets_path), name="f_docs_assets")

    # 2. Define the Documentation Route
    @app.get(docs_url, include_in_schema=False, response_class=HTMLResponse)
    async def f_docs_ui():
        try:
            with open(html_path, "r", encoding="utf-8") as f:
                html_content = f.read()
        except FileNotFoundError:
            return HTMLResponse(
                content=f"<h1>Error</h1><p>Could not find {html_path}. Did you run 'npm run build'?</p>",
                status_code=500,
            )

        # Config to inject
        config_data = {
            "openApiUrl": openapi_url,
            "title": title,
        }
        
        script_tag = f"<script>window.NEXUS_CONFIG = {json.dumps(config_data)};</script>"
        
        # Inject before </head>
        if "</head>" in html_content:
            final_html = html_content.replace("</head>", f"{script_tag}</head>")
        else:
            final_html = script_tag + html_content

        return HTMLResponse(content=final_html, status_code=200)

    return app
