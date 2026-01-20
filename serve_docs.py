from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status, Query, Body, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi_mcp import FastApiMCP
from typing import List, Optional, Dict, Any,Literal
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import os
import shutil
from pathlib import Path
from jose import JWTError, jwt
from passlib.context import CryptContext
import socketio
import asyncio
import random
import json
from fastapi_mcp import FastApiMCP

# Import custom F-Docs helper
from nexus_ui import get_nexus_ui_html

# Initialize FastAPI with docs disabled (we will serve our own)
app = FastAPI(
    title="Test API - Full CRUD Operations with OAuth2",
    docs_url=None,
    redoc_url=None
)

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)
socket_app = socketio.ASGIApp(sio, app)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount F-Docs Static Assets
# Ensure dist/assets exists before mounting to avoid errors
if os.path.exists("dist/assets"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

# Serve F-Docs at /docs
@app.get("/docs", include_in_schema=False, response_class=HTMLResponse)
async def custom_swagger_ui_html():
    return get_nexus_ui_html(
        openapi_url="/openapi.json",
        title="F-Docs - Test API"
    )

# OAuth2 Configuration
SECRET_KEY = "your-secret-key-keep-it-secret-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Fake users database
fake_users_db = {
    "admin": {
        "username": "admin",
        "full_name": "Admin User",
        "email": "admin@example.com",
        "hashed_password": pwd_context.hash("admin"),
        "disabled": False,
    }
}

# สร้างโฟลเดอร์สำหรับเก็บรูปภาพ
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# ===== Auth Models =====
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserInDB(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    hashed_password: str

# ===== Pydantic Models =====
class User(BaseModel):
    id: Optional[int] = None
    username: str
    email: str
    full_name: Optional[str] = None
    age: Optional[int] = None
    is_active: bool = True
    created_at: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    is_active: Optional[bool] = None

class Product(BaseModel):
    id: Optional[int] = None
    name: Literal["Laptop", "Mouse", "Keyboard"]
    description: Optional[str] = None
    price: float
    stock: int = 0
    category: Optional[str] = None
    created_at: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None

class Order(BaseModel):
    id: Optional[int] = None
    user_id: int
    product_id: int
    quantity: int
    total_price: Optional[float] = None
    status: str = "pending"
    created_at: Optional[str] = None

class Post(BaseModel):
    id: Optional[int] = None
    title: str
    content: str
    author: str
    tags: List[str] = []
    published: bool = False
    created_at: Optional[str] = None

# ===== In-Memory Database =====
users_db: Dict[int, User] = {
    1: User(id=1, username="john_doe", email="john@example.com", full_name="John Doe", age=30, created_at=datetime.now().isoformat()),
    2: User(id=2, username="jane_smith", email="jane@example.com", full_name="Jane Smith", age=25, created_at=datetime.now().isoformat()),
}

products_db: Dict[int, Product] = {
    1: Product(id=1, name="Laptop", description="High-performance laptop", price=999.99, stock=10, category="Electronics", created_at=datetime.now().isoformat()),
    2: Product(id=2, name="Mouse", description="Wireless mouse", price=29.99, stock=50, category="Electronics", created_at=datetime.now().isoformat()),
    3: Product(id=3, name="Keyboard", description="Mechanical keyboard", price=79.99, stock=30, category="Electronics", created_at=datetime.now().isoformat()),
}

orders_db: Dict[int, Order] = {
    1: Order(id=1, user_id=1, product_id=1, quantity=1, total_price=999.99, status="completed", created_at=datetime.now().isoformat()),
}

posts_db: Dict[int, Post] = {
    1: Post(id=1, title="First Post", content="This is my first post", author="john_doe", tags=["intro", "hello"], published=True, created_at=datetime.now().isoformat()),
}

# Counters for auto-increment IDs
user_counter = 3
product_counter = 4
order_counter = 2
post_counter = 2

# ===== Auth Functions =====
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(fake_db, username: str, password: str):
    user = fake_db.get(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = fake_users_db.get(token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("disabled"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# ===== Auth Endpoints =====
@app.post("/token", response_model=Token, tags=["Authentication"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login เพื่อรับ access token (username: admin, password: admin)"""
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", tags=["Authentication"])
async def read_users_me(current_user: dict = Depends(get_current_active_user)):
    """ดูข้อมูลผู้ใช้ที่ login อยู่"""
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "full_name": current_user["full_name"]
    }

# ===== Root Endpoint =====
@app.get("/")
def read_root():
    return {
        "message": "Test API - Full CRUD Operations with OAuth2",
        "auth": "POST /token with username: admin, password: admin to get access token",
        "endpoints": {
            "token": "/token (POST to login)",
            "me": "/me (GET current user)",
            "users": "/users",
            "products": "/products",
            "orders": "/orders",
            "posts": "/posts",
            "files": "/files",
            "docs": "/docs"
        }
    }

# ===== USERS API =====
@app.get("/users", tags=["Users"])
async def get_users(
    skip: Literal[1,2,3]  = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user)
):
    """ดึงรายการ users ทั้งหมด"""
    users_list = list(users_db.values())[skip:skip+limit]
    return {"total": len(users_db), "skip": skip, "limit": limit, "data": users_list}

@app.get("/users/{user_id}", tags=["Users"])
async def get_user(user_id: int, current_user: dict = Depends(get_current_active_user)):
    """ดึงข้อมูล user ตาม ID"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return users_db[user_id]

@app.post("/users", tags=["Users"], status_code=201)
async def create_user(user: User, current_user: dict = Depends(get_current_active_user)):
    """สร้าง user ใหม่"""
    global user_counter
    user.id = user_counter
    user.created_at = datetime.now().isoformat()
    users_db[user_counter] = user
    user_counter += 1
    return user

@app.put("/users/{user_id}", tags=["Users"])
async def update_user(user_id: int, user: User, current_user: dict = Depends(get_current_active_user)):
    """อัพเดท user ทั้งหมด (replace)"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    user.id = user_id
    user.created_at = users_db[user_id].created_at
    users_db[user_id] = user
    return user

@app.patch("/users/{user_id}", tags=["Users"])
async def partial_update_user(user_id: int, user_update: UserUpdate, current_user: dict = Depends(get_current_active_user)):
    """อัพเดท user บางส่วน"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    stored_user = users_db[user_id]
    update_data = user_update.dict(exclude_unset=True)
    updated_user = stored_user.copy(update=update_data)
    users_db[user_id] = updated_user
    return updated_user

@app.delete("/users/{user_id}", tags=["Users"])
async def delete_user(user_id: int, current_user: dict = Depends(get_current_active_user)):
    """ลบ user"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    deleted_user = users_db.pop(user_id)
    return {"message": "User deleted successfully", "deleted_user": deleted_user}

# ===== PRODUCTS API =====
@app.get("/products", tags=["Products"])
async def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """ดึงรายการ products พร้อม filter"""
    products_list = list(products_db.values())
    
    if category:
        products_list = [p for p in products_list if p.category == category]
    if min_price is not None:
        products_list = [p for p in products_list if p.price >= min_price]
    if max_price is not None:
        products_list = [p for p in products_list if p.price <= max_price]
    
    total = len(products_list)
    products_list = products_list[skip:skip+limit]
    
    return {"total": total, "skip": skip, "limit": limit, "data": products_list}

@app.get("/products/{product_id}", tags=["Products"])
async def get_product(product_id: int, current_user: dict = Depends(get_current_active_user)):
    """ดึงข้อมูล product ตาม ID"""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    return products_db[product_id]

@app.post("/products", tags=["Products"], status_code=201)
async def create_product(product: Product, current_user: dict = Depends(get_current_active_user)):
    """สร้าง product ใหม่"""
    global product_counter
    product.id = product_counter
    product.created_at = datetime.now().isoformat()
    products_db[product_counter] = product
    product_counter += 1
    return product

@app.put("/products/{product_id}", tags=["Products"])
async def update_product(product_id: int, product: Product, current_user: dict = Depends(get_current_active_user)):
    """อัพเดท product ทั้งหมด"""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    product.id = product_id
    product.created_at = products_db[product_id].created_at
    products_db[product_id] = product
    return product

@app.patch("/products/{product_id}", tags=["Products"])
async def partial_update_product(product_id: int, product_update: ProductUpdate, current_user: dict = Depends(get_current_active_user)):
    """อัพเดท product บางส่วน"""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    
    stored_product = products_db[product_id]
    update_data = product_update.dict(exclude_unset=True)
    updated_product = stored_product.copy(update=update_data)
    products_db[product_id] = updated_product
    return updated_product

@app.delete("/products/{product_id}", tags=["Products"])
async def delete_product(product_id: int, current_user: dict = Depends(get_current_active_user)):
    """ลบ product"""
    if product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    deleted_product = products_db.pop(product_id)
    return {"message": "Product deleted successfully", "deleted_product": deleted_product}

# ===== ORDERS API =====
@app.get("/orders", tags=["Orders"])
async def get_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """ดึงรายการ orders พร้อม filter"""
    orders_list = list(orders_db.values())
    
    if status:
        orders_list = [o for o in orders_list if o.status == status]
    if user_id:
        orders_list = [o for o in orders_list if o.user_id == user_id]
    
    total = len(orders_list)
    orders_list = orders_list[skip:skip+limit]
    
    return {"total": total, "skip": skip, "limit": limit, "data": orders_list}

@app.get("/orders/{order_id}", tags=["Orders"])
async def get_order(order_id: int, current_user: dict = Depends(get_current_active_user)):
    """ดึงข้อมูล order ตาม ID"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    return orders_db[order_id]

@app.post("/orders", tags=["Orders"], status_code=201)
async def create_order(order: Order, current_user: dict = Depends(get_current_active_user)):
    """สร้าง order ใหม่"""
    global order_counter
    
    if order.user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    if order.product_id not in products_db:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = products_db[order.product_id]
    order.total_price = product.price * order.quantity
    
    order.id = order_counter
    order.created_at = datetime.now().isoformat()
    orders_db[order_counter] = order
    order_counter += 1
    return order

@app.patch("/orders/{order_id}/status", tags=["Orders"])
async def update_order_status(
    order_id: int,
    status: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_active_user)
):
    """อัพเดทสถานะ order"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    orders_db[order_id].status = status
    return orders_db[order_id]

@app.delete("/orders/{order_id}", tags=["Orders"])
async def delete_order(order_id: int, current_user: dict = Depends(get_current_active_user)):
    """ลบ order"""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    deleted_order = orders_db.pop(order_id)
    return {"message": "Order deleted successfully", "deleted_order": deleted_order}

# ===== POSTS API =====
@app.get("/posts", tags=["Posts"])
async def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    published: Optional[bool] = None,
    author: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """ดึงรายการ posts พร้อม filter"""
    posts_list = list(posts_db.values())
    
    if published is not None:
        posts_list = [p for p in posts_list if p.published == published]
    if author:
        posts_list = [p for p in posts_list if p.author == author]
    if tag:
        posts_list = [p for p in posts_list if tag in p.tags]
    
    total = len(posts_list)
    posts_list = posts_list[skip:skip+limit]
    
    return {"total": total, "skip": skip, "limit": limit, "data": posts_list}

@app.get("/posts/{post_id}", tags=["Posts"])
async def get_post(post_id: int, current_user: dict = Depends(get_current_active_user)):
    """ดึงข้อมูล post ตาม ID"""
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Post not found")
    return posts_db[post_id]

@app.post("/posts", tags=["Posts"], status_code=201)
async def create_post(post: Post, current_user: dict = Depends(get_current_active_user)):
    """สร้าง post ใหม่"""
    global post_counter
    post.id = post_counter
    post.created_at = datetime.now().isoformat()
    posts_db[post_counter] = post
    post_counter += 1
    return post

@app.put("/posts/{post_id}", tags=["Posts"])
async def update_post(post_id: int, post: Post, current_user: dict = Depends(get_current_active_user)):
    """อัพเดท post ทั้งหมด"""
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Post not found")
    post.id = post_id
    post.created_at = posts_db[post_id].created_at
    posts_db[post_id] = post
    return post

@app.patch("/posts/{post_id}/publish", tags=["Posts"])
async def publish_post(
    post_id: int,
    published: bool = Body(..., embed=True),
    current_user: dict = Depends(get_current_active_user)
):
    """เผยแพร่หรือยกเลิกเผยแพร่ post"""
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Post not found")
    
    posts_db[post_id].published = published
    return posts_db[post_id]

@app.delete("/posts/{post_id}", tags=["Posts"])
async def delete_post(post_id: int, current_user: dict = Depends(get_current_active_user)):
    """ลบ post"""
    if post_id not in posts_db:
        raise HTTPException(status_code=404, detail="Post not found")
    deleted_post = posts_db.pop(post_id)
    return {"message": "Post deleted successfully", "deleted_post": deleted_post}

# ===== UTILITIES API =====
@app.post("/echo", tags=["Utilities"])
async def echo_json(data: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_active_user)):
    """ส่ง JSON กลับมาเหมือนเดิม พร้อมข้อมูลเพิ่มเติม"""
    return {
        "received": data,
        "timestamp": datetime.now().isoformat(),
        "authenticated_user": current_user["username"]
    }

@app.post("/calculate", tags=["Utilities"])
async def calculate(
    operation: str = Body(...),
    a: float = Body(...),
    b: float = Body(...),
    current_user: dict = Depends(get_current_active_user)
):
    """คำนวณทางคณิตศาสตร์"""
    operations = {
        "add": a + b,
        "subtract": a - b,
        "multiply": a * b,
        "divide": a / b if b != 0 else None
    }
    
    if operation not in operations:
        raise HTTPException(status_code=400, detail="Invalid operation. Use: add, subtract, multiply, divide")
    
    result = operations[operation]
    if result is None:
        raise HTTPException(status_code=400, detail="Cannot divide by zero")
    
    return {
        "operation": operation,
        "a": a,
        "b": b,
        "result": result
    }

# ===== FILES API =====
@app.post("/upload", tags=["Files"])
async def upload_images(
    name: str = Body(...),
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """อัพโหลด 2 รูปภาพพร้อมชื่อ"""
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".ico"}
    
    uploaded_files = []
    
    for idx, file in enumerate([file1, file2], 1):
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type for file{idx}. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # สร้างชื่อไฟล์ใหม่โดยใช้ name และเวลา
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"{name}_{timestamp}_file{idx}{file_ext}"
        file_path = UPLOAD_DIR / new_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        uploaded_files.append({
            "original_filename": file.filename,
            "saved_filename": new_filename,
            "size": os.path.getsize(file_path)
        })
    
    return {
        "message": "Files uploaded successfully",
        "name": name,
        "files": uploaded_files
    }

@app.get("/files", tags=["Files"])
async def get_all_files(current_user: dict = Depends(get_current_active_user)):
    """ดึงรายการไฟล์รูปภาพทั้งหมด"""
    files = []
    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file():
            files.append({
                "filename": file_path.name,
                "size": file_path.stat().st_size,
                "url": f"/files/{file_path.name}"
            })
    
    return {"total": len(files), "files": files}

@app.get("/files/{filename}", tags=["Files"])
async def get_file(filename: str, current_user: dict = Depends(get_current_active_user)):
    """ดาวน์โหลดหรือดูรูปภาพ"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@app.delete("/files/{filename}", tags=["Files"])
async def delete_file(filename: str, current_user: dict = Depends(get_current_active_user)):
    """ลบรูปภาพ"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path.unlink()
    return {"message": f"File {filename} deleted successfully"}

# Mount the MCP server
mcp = FastApiMCP(app)
mcp.mount_http(mount_path="/mcp")

# ===== WEBSOCKET CONNECTIONS MANAGER =====
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"❌ WebSocket client disconnected. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# ===== WEBSOCKET ENDPOINTS =====
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint หลัก - รับส่งข้อความทั่วไป"""
    await manager.connect(websocket)
    try:
        # ส่งข้อความต้อนรับ
        await websocket.send_json({
            "type": "welcome",
            "message": "Connected to WebSocket server!",
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            # รับข้อความจาก client
            data = await websocket.receive_text()
            
            try:
                # พยายาม parse เป็น JSON
                message = json.loads(data)
                
                # ตอบกลับ
                response = {
                    "type": "echo",
                    "received": message,
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_json(response)
                
            except json.JSONDecodeError:
                # ถ้าไม่ใช่ JSON ก็ส่งกลับเป็น text
                await websocket.send_text(f"Echo: {data}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/realtime")
async def websocket_realtime(websocket: WebSocket):
    """WebSocket endpoint สำหรับข้อมูล real-time"""
    await websocket.accept()
    print("✅ WebSocket real-time client connected")
    
    try:
        # ส่งข้อความต้อนรับ
        await websocket.send_json({
            "type": "connected",
            "message": "Real-time data stream started",
            "timestamp": datetime.now().isoformat()
        })
        
        # สร้าง task สำหรับส่งข้อมูล
        async def send_sensor_data():
            while True:
                data = {
                    "type": "sensor_data",
                    "timestamp": datetime.now().isoformat(),
                    "temperature": round(random.uniform(20.0, 35.0), 2),
                    "humidity": round(random.uniform(40.0, 80.0), 2),
                    "pressure": round(random.uniform(990.0, 1020.0), 2),
                    "light": round(random.uniform(100.0, 1000.0), 2),
                    "interval": "1s"
                }
                await websocket.send_json(data)
                await asyncio.sleep(1)
        
        async def send_system_stats():
            while True:
                data = {
                    "type": "system_stats",
                    "timestamp": datetime.now().isoformat(),
                    "cpu_usage": round(random.uniform(10.0, 90.0), 2),
                    "memory_usage": round(random.uniform(30.0, 85.0), 2),
                    "disk_usage": round(random.uniform(40.0, 95.0), 2),
                    "network_speed": round(random.uniform(1.0, 100.0), 2),
                    "active_connections": random.randint(1, 50),
                    "interval": "0.5s"
                }
                await websocket.send_json(data)
                await asyncio.sleep(0.5)
        
        # รัน tasks พร้อมกัน
        await asyncio.gather(
            send_sensor_data(),
            send_system_stats()
        )
        
    except WebSocketDisconnect:
        print("❌ WebSocket real-time client disconnected")

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint สำหรับ chat - broadcast ไปทุก client"""
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            
            # Broadcast ข้อความไปทุก client
            message = {
                "type": "chat",
                "message": data,
                "timestamp": datetime.now().isoformat()
            }
            await manager.broadcast(json.dumps(message))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # แจ้งทุกคนว่ามีคนออก
        await manager.broadcast(json.dumps({
            "type": "system",
            "message": "A user has left the chat",
            "timestamp": datetime.now().isoformat()
        }))



mcp = FastApiMCP(app)
mcp.mount_http(mount_path="/mcp")

# ===== SOCKET.IO EVENTS =====
@sio.event
async def connect(sid, environ):
    """เมื่อ client เชื่อมต่อ"""
    print(f"✅ Client connected: {sid}")
    await sio.emit('message', {'data': 'Connected to server!', 'sid': sid}, room=sid)

@sio.event
async def disconnect(sid):
    """เมื่อ client ตัดการเชื่อมต่อ"""
    print(f"❌ Client disconnected: {sid}")

@sio.event
async def ping(sid, data):
    """รับ ping จาก client"""
    await sio.emit('pong', {'timestamp': datetime.now().isoformat(), 'data': data}, room=sid)

@sio.event
async def get_status(sid):
    """ส่งสถานะปัจจุบัน"""
    status_data = {
        'server_time': datetime.now().isoformat(),
        'total_users': len(fake_users_db),
        'total_products': len(products_db),
        'total_orders': len(orders_db),
        'total_posts': len(posts_db)
    }
    await sio.emit('status_response', status_data, room=sid)

# Background task สำหรับส่งข้อมูล real-time ทุก 1 วินาที
async def send_realtime_data():
    """ส่งข้อมูล sensor แบบ real-time ทุกๆ 1 วินาที"""
    try:
        while True:
            try:
                # ข้อมูลสุ่มทุก 1 วินาที
                data_1s = {
                    'type': 'slow_update',
                    'timestamp': datetime.now().isoformat(),
                    'temperature': round(random.uniform(20.0, 35.0), 2),
                    'humidity': round(random.uniform(40.0, 80.0), 2),
                    'pressure': round(random.uniform(990.0, 1020.0), 2),
                    'light': round(random.uniform(100.0, 1000.0), 2),
                    'interval': '1s'
                }
                await sio.emit('sensor_data', data_1s)
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in send_realtime_data: {e}")
                await asyncio.sleep(1)
    except asyncio.CancelledError:
        print("📡 Sensor data task cancelled")

# Background task สำหรับส่งข้อมูล real-time ทุก 0.5 วินาที
async def send_fast_data():
    """ส่งข้อมูล system stats แบบ real-time ทุกๆ 0.5 วินาที"""
    try:
        while True:
            try:
                # ข้อมูลสุ่มทุก 0.5 วินาที
                data_05s = {
                    'type': 'fast_update',
                    'timestamp': datetime.now().isoformat(),
                    'cpu_usage': round(random.uniform(10.0, 90.0), 2),
                    'memory_usage': round(random.uniform(30.0, 85.0), 2),
                    'disk_usage': round(random.uniform(40.0, 95.0), 2),
                    'network_speed': round(random.uniform(1.0, 100.0), 2),
                    'active_connections': random.randint(1, 50),
                    'interval': '0.5s'
                }
                await sio.emit('system_stats', data_05s)
                await asyncio.sleep(0.5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in send_fast_data: {e}")
                await asyncio.sleep(0.5)
    except asyncio.CancelledError:
        print("💻 System stats task cancelled")

# เริ่ม background tasks เมื่อ server start
background_tasks = set()

@app.on_event("startup")
async def startup_event():
    """เริ่ม background tasks"""
    task1 = asyncio.create_task(send_realtime_data())
    task2 = asyncio.create_task(send_fast_data())
    background_tasks.add(task1)
    background_tasks.add(task2)
    
    print("\n" + "="*60)
    print("✅ Server Started Successfully")
    print("="*60)
    print("📡 Real-time data broadcasting:")
    print("   - Socket.IO 'sensor_data': every 1 second")
    print("   - Socket.IO 'system_stats': every 0.5 seconds")
    print("\n🔌 WebSocket endpoints:")
    print("   - ws://localhost:8000/ws (Echo)")
    print("   - ws://localhost:8000/ws/realtime (Real-time data)")
    print("   - ws://localhost:8000/ws/chat (Chat room)")
    print("\n🔌 Socket.IO endpoint:")
    print("   - ws://localhost:8000/socket.io/")
    print("\n📚 API Documentation:")
    print("   - http://localhost:8000/docs (F-Docs)") # Updated log
    print("   - http://localhost:8000/redoc (ReDoc)")
    print("="*60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup เมื่อ server shutdown"""
    print("\n" + "="*60)
    print("⚠️  Shutting down server...")
    print("="*60)
    
    # Cancel background tasks
    for task in background_tasks:
        task.cancel()
    
    # รอให้ tasks ทั้งหมดจบ
    await asyncio.gather(*background_tasks, return_exceptions=True)
    
    print("✅ All background tasks stopped")
    print("👋 Server shutdown complete")
    print("="*60 + "\n")

if __name__ == "__main__":
    import uvicorn
    # ใช้ socket_app แทน app เพื่อรองรับ Socket.IO
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
