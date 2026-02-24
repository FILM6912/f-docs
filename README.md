# 🚀 F-Docs

> **FastAPI documentation generator with a premium React UI.**

F-Docs is a modern, sleek, and highly functional documentation wrapper for FastAPI applications. It replaces the default Swagger/Redoc UI with a high-performance, custom-built React frontend that offers a superior developer experience.

![Preview](images/image.png)

---

## ✨ Features

- **💎 Premium React UI**: A beautiful, modern interface built with React and Vanilla CSS.
- **🏗️ Full CRUD Support**: Seamlessly handle GET, POST, PUT, PATCH, and DELETE operations.
- **🔐 OAuth2 Integrated**: Built-in support for FastAPI's OAuth2PasswordBearer flow.
- **📁 File Management**: Robust endpoints for image uploads and file retrieval.
- **🔌 Real-time Capabilities**: Support for both standard WebSockets and Socket.IO.
- **🤖 MCP Support**: Integrated Model Context Protocol (MCP) server support.
- **⚡ Fast and Lightweight**: Optimized for performance and developer productivity.

---

## 🛠️ Installation

F-Docs is incredibly easy to install. There are **no Python packages to install**. It's just a single, self-contained JavaScript file!

1. Download the latest `f_docs.js` from the [Releases](#) tab (or build it yourself via `npm run build` in the `frontend` folder).
2. Place `f_docs.js` somewhere in your project, e.g., in a `static/` directory.

---

## 🚀 Quick Start

Using F-Docs is as simple as serving the Javascript file in a basic HTML response:

```python
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

# 1. Disable default Swagger
app = FastAPI(docs_url=None, redoc_url=None)

# 2. Mount the directory containing f_docs.js
app.mount("/static", StaticFiles(directory="static"), name="static")

# 3. Create a custom docs route
@app.get("/docs", include_in_schema=False)
def custom_docs():
    return HTMLResponse("""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>F-Docs</title>
        <!-- Specify your OpenAPI URL and Title here -->
        <script>window.NEXUS_CONFIG = { openApiUrl: "/openapi.json", title: "My Awesome API" };</script>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="/static/f_docs.js"></script>
    </body>
    </html>
    """)
```

Run your application:

```bash
python example/serve_docs.py
```

Visit your docs at `http://localhost:8000/docs` (or your configured path).

---

## 📁 Project Structure

- `FDocs/`: Core Python package implementation.
- `frontend/`: React source code for the documentation UI.
- `example/serve_docs.py`: Example server implementation with full feature demonstration.
- `pyproject.toml`: Project configuration and dependencies.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
