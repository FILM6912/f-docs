import json
from fastapi.responses import HTMLResponse

def get_nexus_ui_html(
    *,
    openapi_url: str = "/openapi.json",
    title: str = "Nexus API Docs",
    html_path: str = "dist/index.html",
) -> HTMLResponse:
    """
    Returns an HTMLResponse that serves the F-Docs React application
    with configuration injected at runtime.

    Args:
        openapi_url: The URL to the OpenAPI specification.
        title: The title of the documentation page.
        html_path: Path to the built index.html file.
    """
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
    except FileNotFoundError:
        return HTMLResponse(
            content=f"<h1>Error</h1><p>Could not find {html_path}. Did you run 'npm run build'?</p>",
            status_code=500,
        )

    # config to inject
    config_data = {
        "openApiUrl": openapi_url,
        "title": title,
    }
    
    # Create the script tag to inject
    # We inject it before the closing </head> or <body> tag to ensure it runs early enough
    # or just replace a placeholder if we had one. 
    # Since we don't have a specific placeholder, we'll inject it into the <head>.
    
    script_tag = f"""
    <script>
        window.NEXUS_CONFIG = {json.dumps(config_data)};
    </script>
    """
    
    # Simple injection into head
    if "</head>" in html_content:
        final_html = html_content.replace("</head>", f"{script_tag}</head>")
    else:
        # Fallback
        final_html = script_tag + html_content

    # Also update the title tag if possible
    # (Optional, but nice for polish)
    # Regex replacement for <title>...</title> could be added here if needed.

    return HTMLResponse(content=final_html, status_code=200)
