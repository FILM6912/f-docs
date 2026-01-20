import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

# Import our new helper
from nexus_ui import get_nexus_ui_html

# 1. Disable default docs
app = FastAPI(docs_url=None, redoc_url=None)

# 2. Example API endpoints
@app.get("/hello")
def read_root():
    return {"Hello": "World"}

@app.post("/items")
def create_item(name: str):
    return {"name": name, "id": 123}

# 3. Serve Static Assets
# We mount the 'assets' folder from the build output to '/assets'.
# IMPORTANT: The React build references assets via /assets/... so this mount path matters.
if os.path.exists("dist/assets"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# 4. Serve the Custom F-Docs UI
@app.get("/docs", include_in_schema=False)
async def custom_docs():
    return get_nexus_ui_html(
        openapi_url="/openapi.json",  # Point to your spec
        title="F-Docs",
        html_path="dist/index.html"   # Path to the build output
    )

if __name__ == "__main__":
    import uvicorn
    print("Running at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
