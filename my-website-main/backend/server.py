import cloudinary.uploader
import cloudinary.api
from cloudinary_config import *
from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Header, Query, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, HTMLResponse
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import requests
from collections import defaultdict
import asyncio
import io
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ── Database ──────────────────────────────────────────────────────────────────
mongo_url = os.environ['MONGO_URL']
client    = AsyncIOMotorClient(mongo_url)
db        = client[os.environ['DB_NAME']]

# ── Security ──────────────────────────────────────────────────────────────────
pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET    = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

# ── Legacy storage ────────────────────────────────────────────────────────────
STORAGE_URL  = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME     = os.environ.get("APP_NAME", "whispero-nepal")
storage_key  = None

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# STATIC ROOMS  (no DB needed — always available)
# ══════════════════════════════════════════════════════════════════════════════
STATIC_ROOMS = {
    "general": {"name": "General Whispers", "emoji": "💬"},
    "love":    {"name": "Love & Crush",     "emoji": "💕"},
    "college": {"name": "College Life",     "emoji": "🎓"},
    "rants":   {"name": "Rants",            "emoji": "😤"},
    "fun":     {"name": "Fun & Games",      "emoji": "🎮"},
}

# room_id → list of {"ws", "nickname", "is_anon"}
room_connections: dict = defaultdict(list)

# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET MANAGERS
# ══════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = defaultdict(list)

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: str, message: dict):
        dead = []
        for ws in self.active_connections[room_id]:
            try:
                await ws.send_json(message)
            except:
                dead.append(ws)
        for ws in dead:
            self.active_connections[room_id].remove(ws)


class RandomChatManager:
    def __init__(self):
        self.waiting_queue: list = []
        self.active_chats: dict  = {}

    async def find_match(self, session_id: str, websocket: WebSocket):
        if self.waiting_queue:
            partner_id = self.waiting_queue.pop(0)
            if partner_id not in self.active_chats:
                return await self.find_match(session_id, websocket)
            partner_ws = self.active_chats[partner_id]["websocket"]
            room_id    = f"random_{uuid.uuid4()}"
            self.active_chats[session_id]              = {"partner_id": partner_id, "room_id": room_id, "websocket": websocket}
            self.active_chats[partner_id]["partner_id"] = session_id
            self.active_chats[partner_id]["room_id"]    = room_id
            await websocket.send_json({"type": "matched", "room_id": room_id})
            await partner_ws.send_json({"type": "matched", "room_id": room_id})
            return room_id
        self.waiting_queue.append(session_id)
        self.active_chats[session_id] = {"websocket": websocket}
        await websocket.send_json({"type": "waiting"})
        return None

    async def disconnect_user(self, session_id: str):
        if session_id in self.active_chats:
            partner_id = self.active_chats[session_id].get("partner_id")
            if partner_id and partner_id in self.active_chats:
                try:
                    await self.active_chats[partner_id]["websocket"].send_json({"type": "partner_disconnected"})
                except:
                    pass
            del self.active_chats[session_id]
        if session_id in self.waiting_queue:
            self.waiting_queue.remove(session_id)


class StrangerChatManager:
    def __init__(self):
        self.waiting_users = []
        self.connections   = {}
        self.online_count  = 0
        self._lock         = asyncio.Lock()

    def _is_ws_open(self, ws):
        try:
            return ws.client_state.name == "CONNECTED"
        except:
            return False

    async def add_user(self, user_id, websocket):
        async with self._lock:
            self.online_count += 1
            while self.waiting_users:
                partner    = self.waiting_users[0]
                partner_id = partner['user_id']
                partner_ws = partner['websocket']
                if not self._is_ws_open(partner_ws):
                    self.waiting_users.pop(0)
                    self.online_count = max(0, self.online_count - 1)
                    continue
                try:
                    await partner_ws.send_json({'type': 'ping'})
                except:
                    self.waiting_users.pop(0)
                    self.online_count = max(0, self.online_count - 1)
                    continue
                self.waiting_users.pop(0)
                self.connections[user_id]   = {'partner_id': partner_id, 'websocket': websocket}
                self.connections[partner_id] = {'partner_id': user_id,   'websocket': partner_ws}
                try:
                    await websocket.send_json({'type': 'matched', 'partner_id': partner_id})
                except:
                    pass
                try:
                    await partner_ws.send_json({'type': 'matched', 'partner_id': user_id})
                except:
                    pass
                return True
            self.waiting_users.append({'user_id': user_id, 'websocket': websocket})
            return False

    async def send_message(self, user_id, message_data):
        conn = self.connections.get(user_id)
        if not conn or 'partner_id' not in conn:
            return 'no_partner'
        partner_conn = self.connections.get(conn['partner_id'])
        if not partner_conn:
            return 'no_partner'
        partner_ws = partner_conn['websocket']
        for attempt in range(2):
            if not self._is_ws_open(partner_ws):
                return 'partner_dead'
            try:
                await partner_ws.send_json(message_data)
                return 'ok'
            except:
                if attempt == 0:
                    await asyncio.sleep(0.1)
                else:
                    return 'partner_dead'
        return 'partner_dead'

    async def handle_partner_dead(self, user_id):
        async with self._lock:
            conn = self.connections.get(user_id)
            if not conn:
                return
            partner_id = conn.get('partner_id')
            if partner_id and partner_id in self.connections:
                del self.connections[partner_id]
                self.online_count = max(0, self.online_count - 1)
            if user_id in self.connections:
                self.connections[user_id].pop('partner_id', None)

    async def disconnect(self, user_id):
        async with self._lock:
            self.online_count = max(0, self.online_count - 1)
            self.waiting_users = [u for u in self.waiting_users if u['user_id'] != user_id]
            conn = self.connections.pop(user_id, None)
            if conn:
                partner_id = conn.get('partner_id')
                if partner_id and partner_id in self.connections:
                    partner_ws = self.connections[partner_id]['websocket']
                    self.connections[partner_id].pop('partner_id', None)
                    try:
                        if self._is_ws_open(partner_ws):
                            await partner_ws.send_json({'type': 'disconnected'})
                    except:
                        pass


stranger_chat_manager = StrangerChatManager()
manager               = ConnectionManager()
random_chat_manager   = RandomChatManager()

# ══════════════════════════════════════════════════════════════════════════════
# STORAGE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        raise

def get_object(path: str) -> tuple[bytes, str]:
    key  = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

async def upload_to_cloudinary(contents: bytes, content_type: str, folder: str) -> dict:
    resource_type = "video" if content_type and content_type.startswith("video/") else "image"
    return cloudinary.uploader.upload(
        io.BytesIO(contents),
        resource_type=resource_type,
        folder=folder,
        quality="auto",
        fetch_format="auto",
    )

async def delete_from_cloudinary(public_id: str, resource_type: str = "image"):
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception as e:
        logger.error(f"Cloudinary delete failed {public_id}: {e}")

def _compress_image(data: bytes, content_type: str, ext: str) -> tuple:
    if not content_type.startswith("image/") or ext.lower() not in ("jpg", "jpeg", "png", "webp"):
        return data, content_type
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        if max(img.size) > 1200:
            img.thumbnail((1200, 1200), Image.LANCZOS)
        img_clean = Image.new(img.mode, img.size)
        img_clean.putdata(list(img.getdata()))
        buf = io.BytesIO()
        fmt = "JPEG" if ext.lower() in ("jpg", "jpeg") else "WEBP" if ext.lower() == "webp" else "PNG"
        img_clean.save(buf, format=fmt, quality=80, optimize=True)
        return buf.getvalue(), f"image/{fmt.lower()}"
    except Exception as e:
        logger.warning(f"Compression failed: {e}")
        return data, content_type

# ══════════════════════════════════════════════════════════════════════════════
# MODELS
# ══════════════════════════════════════════════════════════════════════════════

class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id:         str  = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id:  str
    created_at: str  = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    safe_mode:  bool = True

class SessionCreate(BaseModel):
    device_id: str

class Confession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id:             str            = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id:     str
    nickname:       Optional[str]  = None
    text:           str
    category:       Literal["love", "college", "secrets", "life"]
    media_url:      Optional[str]  = None
    media_type:     Optional[Literal["image", "video"]] = None
    public_id:      Optional[str]  = None
    is_adult:       bool           = False
    city:           Optional[str]  = None
    likes:          int            = 0
    dislikes:       int            = 0
    laughs:         int            = 0
    sads:           int            = 0
    angrys:         int            = 0
    fires:          int            = 0
    comments_count: int            = 0
    created_at:     str            = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ConfessionCreate(BaseModel):
    text:     str
    category: Literal["love", "college", "secrets", "life"]
    nickname: Optional[str]  = None
    is_adult: bool           = False
    city:     Optional[str]  = None

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id:            str           = Field(default_factory=lambda: str(uuid.uuid4()))
    confession_id: str
    session_id:    str
    text:          str
    nickname:      Optional[str] = None
    parent_id:     Optional[str] = None
    replies_count: int           = 0
    created_at:    str           = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CommentCreate(BaseModel):
    text:     str
    nickname: Optional[str] = None

class Reaction(BaseModel):
    type: Literal["like", "dislike", "laugh", "sad", "angry", "fire"]

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id:                  str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_type:         Literal["confession", "comment"]
    target_id:           str
    reporter_session_id: str
    reason:              str
    status:              Literal["pending", "resolved", "ignored"] = "pending"
    created_at:          str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReportCreate(BaseModel):
    target_type: Literal["confession", "comment"]
    target_id:   str
    reason:      str

class AdminLogin(BaseModel):
    email:    str
    password: str

class AdminToken(BaseModel):
    access_token: str
    token_type:   str = "bearer"

# Room message stored in MongoDB
class RoomMessage(BaseModel):
    id:         str           = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id:    str
    nickname:   str
    is_anon:    bool          = False
    type:       str           = "text"   # text | image | video | gif | emoji | system
    text:       Optional[str] = None
    emoji:      Optional[str] = None
    gif_url:    Optional[str] = None
    media_url:  Optional[str] = None
    public_id:  Optional[str] = None
    created_at: str           = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ══════════════════════════════════════════════════════════════════════════════
# AUTH HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=24)):
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_admin_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return jwt.decode(authorization.split(" ")[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_nickname():
    import secrets as _s
    adj  = ["Anonymous","Secret","Hidden","Mystery","Silent","Quiet","Shy","Bold"]
    noun = ["Heart","Soul","Mind","Spirit","Voice","Whisper","Dreamer","Wanderer"]
    return f"{_s.choice(adj)} {_s.choice(noun)}"

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — GENERAL
# ══════════════════════════════════════════════════════════════════════════════

@api_router.get("/")
async def root():
    return {"message": "Welcome to Whispero Nepal API"}

@api_router.get("/ping")
async def ping():
    return {"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/online-count")
async def get_online_count():
    return {"online": stranger_chat_manager.online_count, "waiting": len(stranger_chat_manager.waiting_users)}

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — AUTH / SESSION
# ══════════════════════════════════════════════════════════════════════════════

@api_router.post("/auth/session", response_model=Session)
async def create_session(input: SessionCreate):
    existing = await db.sessions.find_one({"device_id": input.device_id}, {"_id": 0})
    if existing:
        return Session(**existing)
    session = Session(device_id=input.device_id)
    await db.sessions.insert_one(session.model_dump())
    return session

@api_router.post("/admin/login", response_model=AdminToken)
async def admin_login(input: AdminLogin):
    admin = await db.admins.find_one({"email": input.email}, {"_id": 0})
    if not admin or not pwd_context.verify(input.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return AdminToken(access_token=create_access_token({"sub": admin["email"], "role": "admin"}))

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — CONFESSIONS
# ══════════════════════════════════════════════════════════════════════════════

@api_router.post("/confessions", response_model=Confession)
async def create_confession(
    session_id: str            = Header(..., alias="X-Session-Id"),
    text:       str            = Query(...),
    category:   str            = Query(...),
    nickname:   Optional[str]  = Query(None),
    is_adult:   bool           = Query(False),
    city:       Optional[str]  = Query(None),
    media:      Optional[UploadFile] = File(None),
):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    media_url, media_type, media_public_id = None, None, None
    if media and media.filename:
        media_url, media_type, media_public_id = await _process_confession_media(media)

    confession = Confession(
        session_id=session_id, text=text, category=category,
        nickname=nickname or generate_nickname(),
        is_adult=is_adult, city=city,
        media_url=media_url, media_type=media_type, public_id=media_public_id,
    )
    await db.confessions.insert_one(confession.model_dump())
    return confession

async def _process_confession_media(media: UploadFile):
    contents = await media.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    size_mb = len(contents) / (1024 * 1024)
    if media.content_type and media.content_type.startswith("image/"):
        if size_mb > 2:
            raise HTTPException(status_code=400, detail="Image max 2MB")
        media_type = "image"
    elif media.content_type and media.content_type.startswith("video/"):
        if size_mb > 10:
            raise HTTPException(status_code=400, detail="Video max 10MB")
        media_type = "video"
    else:
        media_type = None
    result = await upload_to_cloudinary(contents, media.content_type or "", "whispero/confessions")
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["secure_url"],
        "public_id": result["public_id"], "original_filename": media.filename,
        "content_type": media.content_type, "size": result["bytes"],
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return result["secure_url"], media_type, result["public_id"]

@api_router.get("/confessions", response_model=List[Confession])
async def get_confessions(
    skip:     int           = Query(0),
    limit:    int           = Query(20),
    category: Optional[str] = Query(None),
    city:     Optional[str] = Query(None),
    sort:     Literal["latest", "trending"] = Query("latest"),
):
    query = {}
    if category: query["category"] = category
    if city:     query["city"]     = city
    sort_field = "created_at" if sort == "latest" else "likes"
    return await db.confessions.find(query, {"_id": 0}).sort(sort_field, -1).skip(skip).limit(limit).to_list(limit)

@api_router.get("/confessions/featured/top")
async def get_confession_of_the_day():
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    top = await db.confessions.find({"created_at": {"$gte": cutoff}}, {"_id": 0}).sort("likes", -1).limit(1).to_list(1)
    if not top:
        top = await db.confessions.find({}, {"_id": 0}).sort("likes", -1).limit(1).to_list(1)
    return top[0] if top else None

@api_router.get("/confessions/{confession_id}", response_model=Confession)
async def get_confession(confession_id: str):
    c = await db.confessions.find_one({"id": confession_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Confession not found")
    return Confession(**c)

@api_router.post("/confessions/{confession_id}/react")
async def react_to_confession(
    confession_id: str,
    reaction:      Reaction,
    session_id:    str = Header(..., alias="X-Session-Id"),
):
    if not await db.confessions.find_one({"id": confession_id}):
        raise HTTPException(status_code=404, detail="Confession not found")
    FIELDS = {"like":"likes","dislike":"dislikes","laugh":"laughs","sad":"sads","angry":"angrys","fire":"fires"}
    existing = await db.reactions.find_one({"confession_id": confession_id, "session_id": session_id}, {"_id": 0})
    if existing:
        old = existing["type"]
        if old == reaction.type:
            await db.reactions.delete_one({"confession_id": confession_id, "session_id": session_id})
            if FIELDS.get(old): await db.confessions.update_one({"id": confession_id}, {"$inc": {FIELDS[old]: -1}})
            return {"action": "removed"}
        await db.reactions.update_one({"confession_id": confession_id, "session_id": session_id}, {"$set": {"type": reaction.type}})
        inc = {}
        if FIELDS.get(old):          inc[FIELDS[old]]          = -1
        if FIELDS.get(reaction.type): inc[FIELDS[reaction.type]] = 1
        if inc: await db.confessions.update_one({"id": confession_id}, {"$inc": inc})
    else:
        await db.reactions.insert_one({"id": str(uuid.uuid4()), "confession_id": confession_id, "session_id": session_id, "type": reaction.type, "created_at": datetime.now(timezone.utc).isoformat()})
        if FIELDS.get(reaction.type): await db.confessions.update_one({"id": confession_id}, {"$inc": {FIELDS[reaction.type]: 1}})
    return {"action": "added"}

@api_router.get("/confessions/{confession_id}/comments", response_model=List[Comment])
async def get_comments(confession_id: str, skip: int = Query(0), limit: int = Query(50)):
    return await db.comments.find({"confession_id": confession_id, "parent_id": None}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

@api_router.post("/confessions/{confession_id}/comments", response_model=Comment)
async def create_comment(confession_id: str, input: CommentCreate, session_id: str = Header(..., alias="X-Session-Id")):
    if not await db.confessions.find_one({"id": confession_id}):
        raise HTTPException(status_code=404, detail="Confession not found")
    comment = Comment(confession_id=confession_id, session_id=session_id, text=input.text, nickname=input.nickname or generate_nickname())
    await db.comments.insert_one(comment.model_dump())
    await db.confessions.update_one({"id": confession_id}, {"$inc": {"comments_count": 1}})
    return comment

@api_router.get("/confessions/{confession_id}/comments/{comment_id}/replies", response_model=List[Comment])
async def get_replies(confession_id: str, comment_id: str, skip: int = Query(0), limit: int = Query(50)):
    return await db.comments.find({"confession_id": confession_id, "parent_id": comment_id}, {"_id": 0}).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)

@api_router.post("/confessions/{confession_id}/comments/{comment_id}/replies", response_model=Comment)
async def create_reply(confession_id: str, comment_id: str, input: CommentCreate, session_id: str = Header(..., alias="X-Session-Id")):
    if not await db.comments.find_one({"id": comment_id, "confession_id": confession_id}):
        raise HTTPException(status_code=404, detail="Parent comment not found")
    reply = Comment(confession_id=confession_id, session_id=session_id, text=input.text, nickname=input.nickname or generate_nickname(), parent_id=comment_id)
    await db.comments.insert_one(reply.model_dump())
    await db.comments.update_one({"id": comment_id}, {"$inc": {"replies_count": 1}})
    await db.confessions.update_one({"id": confession_id}, {"$inc": {"comments_count": 1}})
    return reply

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — REPORTS
# ══════════════════════════════════════════════════════════════════════════════

@api_router.post("/reports", response_model=Report)
async def create_report(input: ReportCreate, session_id: str = Header(..., alias="X-Session-Id")):
    report = Report(target_type=input.target_type, target_id=input.target_id, reporter_session_id=session_id, reason=input.reason)
    await db.reports.insert_one(report.model_dump())
    if await db.reports.count_documents({"target_type": input.target_type, "target_id": input.target_id}) >= 5:
        if input.target_type == "confession":
            await db.confessions.update_one({"id": input.target_id}, {"$set": {"is_hidden": True}})
    return report

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — FILES
# ══════════════════════════════════════════════════════════════════════════════

@api_router.get("/files/{path:path}")
async def download_file(path: str):
    from fastapi.responses import RedirectResponse
    if path.startswith("http"):
        return RedirectResponse(url=path)
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if record["storage_path"].startswith("http"):
        return RedirectResponse(url=record["storage_path"])
    try:
        data, ct = get_object(path)
        return Response(content=data, media_type=record.get("content_type", ct))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error downloading file")

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — MEDIA UPLOAD
# ══════════════════════════════════════════════════════════════════════════════

@api_router.post("/upload-chat-media")
async def upload_chat_media(session_id: str = Header(..., alias="X-Session-Id"), media: UploadFile = File(...)):
    if not await db.sessions.find_one({"id": session_id}):
        raise HTTPException(status_code=401, detail="Invalid session")
    contents = await media.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    size_mb = len(contents) / (1024 * 1024)
    if media.content_type and media.content_type.startswith("image/") and size_mb > 2:
        raise HTTPException(status_code=400, detail="Image max 2MB")
    if media.content_type and media.content_type.startswith("video/") and size_mb > 10:
        raise HTTPException(status_code=400, detail="Video max 10MB")
    result = await upload_to_cloudinary(contents, media.content_type or "", "whispero/chat")
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["secure_url"], "public_id": result["public_id"], "original_filename": media.filename, "content_type": media.content_type, "size": result["bytes"], "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"media_url": result["secure_url"], "public_id": result["public_id"]}

@api_router.post("/upload-compressed-media")
async def upload_compressed_media(session_id: str = Header(..., alias="X-Session-Id"), media: UploadFile = File(...)):
    if not await db.sessions.find_one({"id": session_id}):
        raise HTTPException(status_code=401, detail="Invalid session")
    contents = await media.read()
    ct  = media.content_type or "application/octet-stream"
    ext = media.filename.split(".")[-1] if media.filename and "." in media.filename else "bin"
    contents, ct = _compress_image(contents, ct, ext)
    if len(contents) / (1024 * 1024) > 5:
        raise HTTPException(status_code=400, detail="File too large")
    result = await upload_to_cloudinary(contents, ct, "whispero/compressed")
    return {"media_url": result["secure_url"], "public_id": result["public_id"], "size": result["bytes"]}

@api_router.post("/rooms/upload-media")
async def upload_room_media(media: UploadFile = File(...)):
    """Upload media for room chat — no session required."""
    contents = await media.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    size_mb = len(contents) / (1024 * 1024)
    ct = media.content_type or "application/octet-stream"
    if ct.startswith("image/") and size_mb > 2:
        raise HTTPException(status_code=400, detail="Image max 2MB")
    if ct.startswith("video/") and size_mb > 10:
        raise HTTPException(status_code=400, detail="Video max 10MB")
    ext = media.filename.split(".")[-1] if media.filename and "." in media.filename else "bin"
    if ct.startswith("image/"):
        contents, ct = _compress_image(contents, ct, ext)
    result = await upload_to_cloudinary(contents, ct, "whispero/rooms")
    return {"media_url": result["secure_url"], "public_id": result["public_id"]}

@api_router.delete("/chat-media/cleanup")
async def cleanup_chat_media(session_id: str = Header(..., alias="X-Session-Id"), public_ids: List[str] = None):
    if not public_ids:
        return {"message": "Nothing to delete"}
    for pid in public_ids:
        try:
            cloudinary.uploader.destroy(pid, resource_type="image")
        except:
            try:
                cloudinary.uploader.destroy(pid, resource_type="video")
            except:
                pass
        await db.files.update_one({"public_id": pid}, {"$set": {"is_deleted": True}})
    return {"message": f"Deleted {len(public_ids)} files"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        result   = await upload_to_cloudinary(contents, file.content_type or "", "whispero/uploads")
        return {"url": result["secure_url"]}
    except Exception as e:
        return {"error": str(e)}

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — ROOMS
# ══════════════════════════════════════════════════════════════════════════════

@api_router.get("/rooms")
async def get_rooms():
    return [
        {"id": rid, "name": info["name"], "emoji": info["emoji"], "online": len(room_connections.get(rid, []))}
        for rid, info in STATIC_ROOMS.items()
    ]

@api_router.get("/rooms/{room_id}/messages")
async def get_room_messages(room_id: str):
    """Return last 100 messages for a room — used when new user joins."""
    if room_id not in STATIC_ROOMS:
        raise HTTPException(status_code=404, detail="Room not found")
    msgs = await db.room_messages.find(
        {"room_id": room_id},
        {"_id": 0}
    ).sort("created_at", 1).limit(100).to_list(100)
    return msgs

# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — ADMIN
# ══════════════════════════════════════════════════════════════════════════════

@api_router.get("/admin/reports", response_model=List[Report])
async def get_reports(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    return await db.reports.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

@api_router.delete("/admin/confessions/{confession_id}")
async def delete_confession(confession_id: str, admin: dict = Depends(verify_admin_token)):
    c = await db.confessions.find_one({"id": confession_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Confession not found")
    if c.get("public_id"):
        await delete_from_cloudinary(c["public_id"], "video" if c.get("media_type") == "video" else "image")
    await db.confessions.delete_one({"id": confession_id})
    return {"message": "Confession deleted"}

@api_router.delete("/admin/comments/{comment_id}")
async def delete_comment(comment_id: str, admin: dict = Depends(verify_admin_token)):
    if not (await db.comments.delete_one({"id": comment_id})).deleted_count:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted"}

@api_router.get("/admin/analytics")
async def admin_analytics(admin: dict = Depends(verify_admin_token)):
    total_confessions = await db.confessions.count_documents({})
    total_comments    = await db.comments.count_documents({})
    total_reports     = await db.reports.count_documents({})
    pending_reports   = await db.reports.count_documents({"status": "pending"})
    total_sessions    = await db.sessions.count_documents({})
    total_files       = await db.files.count_documents({"is_deleted": False})
    total_banned      = await db.banned_sessions.count_documents({})
    categories = await db.confessions.aggregate([{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]).to_list(10)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    daily_posts = await db.confessions.aggregate([{"$match": {"created_at": {"$gte": seven_days_ago}}}, {"$addFields": {"day": {"$substr": ["$created_at", 0, 10]}}}, {"$group": {"_id": "$day", "count": {"$sum": 1}}}, {"$sort": {"_id": 1}}]).to_list(30)
    top_confessions = await db.confessions.find({}, {"_id": 0}).sort("likes", -1).limit(5).to_list(5)
    return {"total_confessions": total_confessions, "total_comments": total_comments, "total_reports": total_reports, "pending_reports": pending_reports, "total_sessions": total_sessions, "total_files": total_files, "total_banned": total_banned, "category_data": [{"name": c["_id"], "count": c["count"]} for c in categories], "daily_data": [{"date": d["_id"], "posts": d["count"]} for d in daily_posts], "top_confessions": top_confessions}

@api_router.get("/admin/sessions")
async def admin_sessions(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    sessions    = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    banned_ids  = [b["session_id"] for b in await db.banned_sessions.find({}, {"_id": 0, "session_id": 1}).to_list(1000)]
    for s in sessions:
        s["is_banned"] = s.get("id") in banned_ids
    return sessions

@api_router.get("/admin/comments")
async def admin_comments(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    return await db.comments.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

@api_router.get("/admin/images")
async def admin_images(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    return await db.files.find({"is_deleted": False}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

@api_router.delete("/admin/images/{file_id}")
async def admin_delete_image(file_id: str, admin: dict = Depends(verify_admin_token)):
    f = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if f.get("public_id"):
        ct = f.get("content_type", "")
        await delete_from_cloudinary(f["public_id"], "video" if ct.startswith("video/") else "image")
    await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True}})
    return {"message": "File deleted"}

@api_router.post("/admin/reports/{report_id}/resolve")
async def resolve_report(report_id: str, action: str = Query(...), admin: dict = Depends(verify_admin_token)):
    status = "resolved" if action == "resolve" else "ignored"
    if not (await db.reports.update_one({"id": report_id}, {"$set": {"status": status}})).modified_count:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": f"Report {status}"}

@api_router.post("/admin/ban-session")
async def ban_session(session_id: str = Query(...), reason: str = Query(...), admin: dict = Depends(verify_admin_token)):
    await db.banned_sessions.insert_one({"id": str(uuid.uuid4()), "session_id": session_id, "reason": reason, "banned_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Session banned"}

# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET — ROOM CHAT
# Frontend connects to: /api/ws/room/{room_id}?nickname=X&is_anon=false
#
# Frontend sends:
#   {"type":"message","text":"hello"}
#   {"type":"message","emoji":"🔥"}
#   {"type":"message","gif_url":"https://..."}
#   {"type":"message","media_url":"https://...","media_type":"image"}
#   {"type":"typing"}
#
# Backend sends:
#   {"type":"system","text":"X joined","online":N}
#   {"type":"message","nickname":"X","is_anon":false,"text":"...","time":"..."}
#   {"type":"typing","nickname":"X"}
#   {"type":"members","members":[...],"online":N}
#   {"type":"history","messages":[...]}   ← sent once on join
# ══════════════════════════════════════════════════════════════════════════════

@app.websocket("/api/ws/room/{room_id}")
async def room_websocket(
    websocket: WebSocket,
    room_id:   str,
    nickname:  str  = Query("Anonymous"),
    is_anon:   bool = Query(False),
):
    if room_id not in STATIC_ROOMS:
        await websocket.close(code=4004)
        return

    await websocket.accept()

    display_name = "Anonymous" if is_anon else nickname
    user = {"ws": websocket, "nickname": display_name, "is_anon": is_anon}
    room_connections[room_id].append(user)

    # ── 1. Send message history to newly joined user ──────────────────────
    try:
        history = await db.room_messages.find(
            {"room_id": room_id},
            {"_id": 0}
        ).sort("created_at", 1).limit(100).to_list(100)
        await websocket.send_json({"type": "history", "messages": history})
    except Exception as e:
        logger.error(f"History send error: {e}")

    # ── 2. Broadcast join system message ──────────────────────────────────
    online    = len(room_connections[room_id])
    join_msg  = {"type": "system", "text": f"{display_name} joined", "online": online, "created_at": datetime.now(timezone.utc).isoformat()}

    # Save system message to DB
    sys_rec = RoomMessage(room_id=room_id, nickname="system", type="system", text=f"{display_name} joined")
    await db.room_messages.insert_one(sys_rec.model_dump())

    for u in room_connections[room_id]:
        try:
            await u["ws"].send_json(join_msg)
        except:
            pass

    # ── 3. Send members list to all ───────────────────────────────────────
    members_msg = {
        "type":    "members",
        "members": [{"nickname": u["nickname"], "is_anon": u["is_anon"]} for u in room_connections[room_id]],
        "online":  online,
    }
    for u in room_connections[room_id]:
        try:
            await u["ws"].send_json(members_msg)
        except:
            pass

    # ── 4. Main message loop ──────────────────────────────────────────────
    try:
        while True:
            data     = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "message":
                text       = data.get("text", "").strip()
                emoji      = data.get("emoji")
                gif_url    = data.get("gif_url")
                media_url  = data.get("media_url")
                media_type = data.get("media_type")   # "image" | "video"

                # Must have at least one content
                if not text and not emoji and not gif_url and not media_url:
                    continue

                now = datetime.now(timezone.utc).isoformat()

                # Determine sub-type for DB
                if   emoji:      sub = "emoji"
                elif gif_url:    sub = "gif"
                elif media_url:  sub = media_type or "image"
                else:            sub = "text"

                # Save to MongoDB
                rec = RoomMessage(
                    room_id=room_id, nickname=display_name, is_anon=is_anon,
                    type=sub, text=text or None, emoji=emoji,
                    gif_url=gif_url, media_url=media_url, created_at=now,
                )
                await db.room_messages.insert_one(rec.model_dump())

                # Broadcast to ALL users in room (including sender)
                broadcast = {
                    "type":       "message",
                    "id":         rec.id,
                    "nickname":   display_name,
                    "is_anon":    is_anon,
                    "sub_type":   sub,
                    "text":       text or None,
                    "emoji":      emoji,
                    "gif_url":    gif_url,
                    "media_url":  media_url,
                    "media_type": media_type,
                    "time":       now,
                    "online":     len(room_connections[room_id]),
                }
                dead = []
                for u in room_connections[room_id]:
                    try:
                        await u["ws"].send_json(broadcast)
                    except:
                        dead.append(u)
                for d in dead:
                    try:
                        room_connections[room_id].remove(d)
                    except:
                        pass

            elif msg_type == "typing":
                typing_msg = {"type": "typing", "nickname": display_name}
                for u in room_connections[room_id]:
                    if u["ws"] is not websocket:
                        try:
                            await u["ws"].send_json(typing_msg)
                        except:
                            pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Room WS error [{room_id}]: {e}")
    finally:
        # Cleanup
        room_connections[room_id] = [u for u in room_connections[room_id] if u["ws"] is not websocket]
        online_after = len(room_connections[room_id])

        leave_msg = {"type": "system", "text": f"{display_name} left", "online": online_after, "created_at": datetime.now(timezone.utc).isoformat()}
        sys_leave = RoomMessage(room_id=room_id, nickname="system", type="system", text=f"{display_name} left")
        await db.room_messages.insert_one(sys_leave.model_dump())

        updated_members = {
            "type":    "members",
            "members": [{"nickname": u["nickname"], "is_anon": u["is_anon"]} for u in room_connections[room_id]],
            "online":  online_after,
        }
        for u in room_connections[room_id]:
            try:
                await u["ws"].send_json(leave_msg)
                await u["ws"].send_json(updated_members)
            except:
                pass

# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET — RANDOM CHAT
# ══════════════════════════════════════════════════════════════════════════════

@app.websocket("/api/ws/random-chat")
async def websocket_random_chat(websocket: WebSocket, session_id: str = Query(...)):
    try:
        await websocket.accept()
    except Exception as e:
        logger.error(f"Failed to accept WS: {e}")
        return
    try:
        await random_chat_manager.find_match(session_id, websocket)
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "skip":
                await random_chat_manager.disconnect_user(session_id)
                await random_chat_manager.find_match(session_id, websocket)
                continue
            if session_id in random_chat_manager.active_chats:
                partner_id = random_chat_manager.active_chats[session_id].get("partner_id")
                if partner_id and partner_id in random_chat_manager.active_chats:
                    partner_ws = random_chat_manager.active_chats[partner_id]["websocket"]
                    msg = {"type": data.get("type", "text"), "text": data.get("text"), "media_url": data.get("media_url"), "gif_url": data.get("gif_url"), "timestamp": datetime.now(timezone.utc).isoformat()}
                    try:
                        await partner_ws.send_json(msg)
                    except:
                        await websocket.send_json({"type": "partner_disconnected"})
    except WebSocketDisconnect:
        await random_chat_manager.disconnect_user(session_id)
    except Exception as e:
        logger.error(f"Random chat error {session_id}: {e}")
        await random_chat_manager.disconnect_user(session_id)

# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET — OLD ROOM CHAT (kept for backward compatibility)
# ══════════════════════════════════════════════════════════════════════════════

@app.websocket("/api/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            message = {"id": str(uuid.uuid4()), "room_id": room_id, "session_id": data.get("session_id"), "text": data.get("text"), "nickname": data.get("nickname", "Anonymous"), "created_at": datetime.now(timezone.utc).isoformat()}
            await db.chat_messages.insert_one(message)
            await manager.broadcast(room_id, message)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)

# ══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET — STRANGER CHAT
# ══════════════════════════════════════════════════════════════════════════════

async def _ws_keepalive(websocket: WebSocket, interval: int = 5):
    try:
        while True:
            await asyncio.sleep(interval)
            try:
                if websocket.client_state.name == "CONNECTED":
                    await websocket.send_json({'type': 'ping'})
                else:
                    break
            except:
                break
    except asyncio.CancelledError:
        pass

async def _handle_stranger_message(user_id: str, data: dict, websocket: WebSocket) -> bool:
    msg_type = data.get('type', data.get('action', ''))
    if msg_type in ('pong', 'ping'):
        return True
    if data.get('action') == 'next':
        await stranger_chat_manager.disconnect(user_id)
        await stranger_chat_manager.add_user(user_id, websocket)
        return True
    result = await stranger_chat_manager.send_message(user_id, data)
    if result == 'partner_dead':
        await stranger_chat_manager.handle_partner_dead(user_id)
        try:
            await websocket.send_json({'type': 'disconnected'})
        except:
            return False
    return True

@app.websocket("/api/ws/stranger-chat")
async def websocket_stranger_chat(websocket: WebSocket, user_id: str = Query(...)):
    try:
        await websocket.accept()
        await websocket.send_json({'type': 'ping'})
    except Exception as e:
        logger.error(f"Stranger chat accept failed: {e}")
        return
    ping_task = asyncio.create_task(_ws_keepalive(websocket))
    try:
        await stranger_chat_manager.add_user(user_id, websocket)
        while True:
            try:
                raw  = await websocket.receive_text()
                data = json.loads(raw)
            except:
                break
            if not await _handle_stranger_message(user_id, data, websocket):
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Stranger chat error {user_id}: {e}")
    finally:
        ping_task.cancel()
        await stranger_chat_manager.disconnect(user_id)

# ══════════════════════════════════════════════════════════════════════════════
# INCLUDE ROUTER
# ══════════════════════════════════════════════════════════════════════════════
app.include_router(api_router)

# ══════════════════════════════════════════════════════════════════════════════
# AUTO-DELETE TASK
# ══════════════════════════════════════════════════════════════════════════════

async def auto_delete_old_data():
    while True:
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

            # Delete old confessions/comments/sessions/reactions
            await db.confessions.delete_many({"created_at": {"$lt": cutoff}})
            await db.comments.delete_many({"created_at": {"$lt": cutoff}})
            await db.chat_messages.delete_many({"created_at": {"$lt": cutoff}})
            await db.sessions.delete_many({"created_at": {"$lt": cutoff}})
            await db.reactions.delete_many({"created_at": {"$lt": cutoff}})

            # Delete old ROOM MESSAGES (not rooms themselves)
            await db.room_messages.delete_many({"created_at": {"$lt": cutoff}})

            # Delete old Cloudinary files
            old_files = await db.files.find({"created_at": {"$lt": cutoff}, "is_deleted": False}, {"_id": 0}).to_list(1000)
            for f in old_files:
                if f.get("public_id"):
                    ct = f.get("content_type", "")
                    await delete_from_cloudinary(f["public_id"], "video" if ct.startswith("video/") else "image")
            await db.files.update_many({"created_at": {"$lt": cutoff}, "is_deleted": False}, {"$set": {"is_deleted": True}})

            logger.info("Auto-delete cycle complete")
        except Exception as e:
            logger.error(f"Auto-delete error: {e}")
        await asyncio.sleep(600)

# ══════════════════════════════════════════════════════════════════════════════
# STARTUP / SHUTDOWN
# ══════════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        admin_email    = os.environ.get("ADMIN_EMAIL", "")
        admin_password = os.environ.get("ADMIN_PASSWORD", "")
        if admin_email and admin_password:
            if not await db.admins.find_one({"email": admin_email}):
                await db.admins.insert_one({"id": str(uuid.uuid4()), "email": admin_email, "password_hash": pwd_context.hash(admin_password), "created_at": datetime.now(timezone.utc).isoformat()})
                logger.info("Admin created")
        asyncio.create_task(auto_delete_old_data())
        logger.info("Whispero Nepal started ✅")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown():
    client.close()

@app.get("/admin.html", response_class=HTMLResponse)
async def admin_panel():
    admin_file = ROOT_DIR / "admin.html"
    if not admin_file.exists():
        raise HTTPException(status_code=404, detail="Admin panel not found")
    return HTMLResponse(content=admin_file.read_text())