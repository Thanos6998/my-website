import cloudinary.uploader
from cloudinary_config import *
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Header, Query, WebSocket, WebSocketDisconnect, Depends
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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

# Object Storage (legacy fallback)
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "whispero-nepal")
storage_key = None

# Create the main app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = defaultdict(list)

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: str, message: dict):
        for connection in self.active_connections[room_id]:
            try:
                await connection.send_json(message)
            except:
                pass


# Random Chat Manager
class RandomChatManager:
    def __init__(self):
        self.waiting_queue: list = []
        self.active_chats: dict = {}

    async def find_match(self, session_id: str, websocket: WebSocket):
        if self.waiting_queue:
            partner_id = self.waiting_queue.pop(0)
            if partner_id not in self.active_chats:
                logger.error(f"Partner {partner_id} not in active_chats!")
                return await self.find_match(session_id, websocket)
            partner_ws = self.active_chats[partner_id]["websocket"]
            room_id = f"random_{uuid.uuid4()}"
            self.active_chats[session_id] = {"partner_id": partner_id, "room_id": room_id, "websocket": websocket}
            self.active_chats[partner_id]["partner_id"] = session_id
            self.active_chats[partner_id]["room_id"] = room_id
            await websocket.send_json({"type": "matched", "room_id": room_id})
            await partner_ws.send_json({"type": "matched", "room_id": room_id})
            logger.info(f"Matched {session_id} with {partner_id}")
            return room_id
        self.waiting_queue.append(session_id)
        self.active_chats[session_id] = {"websocket": websocket}
        await websocket.send_json({"type": "waiting"})
        logger.info(f"User {session_id} added to waiting queue. Queue: {len(self.waiting_queue)}")
        return None

    async def disconnect_user(self, session_id: str):
        if session_id in self.active_chats:
            chat_info = self.active_chats[session_id]
            partner_id = chat_info.get("partner_id")
            if partner_id and partner_id in self.active_chats:
                partner_ws = self.active_chats[partner_id]["websocket"]
                try:
                    await partner_ws.send_json({"type": "partner_disconnected"})
                except:
                    pass
            del self.active_chats[session_id]
        if session_id in self.waiting_queue:
            self.waiting_queue.remove(session_id)


# Stranger Chat Manager
class StrangerChatManager:
    def __init__(self):
        self.waiting_users = []
        self.connections = {}
        self.online_count = 0
        self._lock = asyncio.Lock()

    def _is_ws_open(self, ws):
        try:
            return ws.client_state.name == "CONNECTED"
        except Exception:
            return False

    async def add_user(self, user_id, websocket):
        async with self._lock:
            self.online_count += 1
            while self.waiting_users:
                partner = self.waiting_users[0]
                partner_id = partner['user_id']
                partner_ws = partner['websocket']
                if not self._is_ws_open(partner_ws):
                    self.waiting_users.pop(0)
                    self.online_count = max(0, self.online_count - 1)
                    continue
                try:
                    await partner_ws.send_json({'type': 'ping'})
                except Exception:
                    self.waiting_users.pop(0)
                    self.online_count = max(0, self.online_count - 1)
                    continue
                self.waiting_users.pop(0)
                self.connections[user_id] = {'partner_id': partner_id, 'websocket': websocket}
                self.connections[partner_id] = {'partner_id': user_id, 'websocket': partner_ws}
                try:
                    await websocket.send_json({'type': 'matched', 'partner_id': partner_id})
                except Exception:
                    pass
                try:
                    await partner_ws.send_json({'type': 'matched', 'partner_id': user_id})
                except Exception:
                    pass
                logger.info(f"Matched {user_id} with {partner_id}")
                return True
            self.waiting_users.append({'user_id': user_id, 'websocket': websocket})
            logger.info(f"User {user_id} waiting. Queue: {len(self.waiting_users)}")
            return False

    async def send_message(self, user_id, message_data):
        conn = self.connections.get(user_id)
        if not conn or 'partner_id' not in conn:
            return 'no_partner'
        partner_id = conn['partner_id']
        partner_conn = self.connections.get(partner_id)
        if not partner_conn:
            return 'no_partner'
        partner_ws = partner_conn['websocket']
        for attempt in range(2):
            if not self._is_ws_open(partner_ws):
                return 'partner_dead'
            try:
                await partner_ws.send_json(message_data)
                return 'ok'
            except Exception as e:
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
                    except Exception:
                        pass
        logger.info(f"User {user_id} disconnected")


stranger_chat_manager = StrangerChatManager()
manager = ConnectionManager()
random_chat_manager = RandomChatManager()


# Storage functions (legacy fallback)
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        raise


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# Models
class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    safe_mode: bool = True


class SessionCreate(BaseModel):
    device_id: str


class Confession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    nickname: Optional[str] = None
    text: str
    category: Literal["love", "college", "secrets", "life"]
    media_url: Optional[str] = None
    media_type: Optional[Literal["image", "video"]] = None
    public_id: Optional[str] = None
    is_adult: bool = False
    city: Optional[str] = None
    likes: int = 0
    dislikes: int = 0
    laughs: int = 0
    sads: int = 0
    angrys: int = 0
    fires: int = 0
    comments_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ConfessionCreate(BaseModel):
    text: str
    category: Literal["love", "college", "secrets", "life"]
    nickname: Optional[str] = None
    is_adult: bool = False
    city: Optional[str] = None


class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    confession_id: str
    session_id: str
    text: str
    nickname: Optional[str] = None
    parent_id: Optional[str] = None
    replies_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CommentCreate(BaseModel):
    text: str
    nickname: Optional[str] = None


class Reaction(BaseModel):
    type: Literal["like", "dislike", "laugh", "sad", "angry", "fire"]


class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    target_type: Literal["confession", "comment"]
    target_id: str
    reporter_session_id: str
    reason: str
    status: Literal["pending", "resolved", "ignored"] = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ReportCreate(BaseModel):
    target_type: Literal["confession", "comment"]
    target_id: str
    reason: str


# =========================
# ROOM MODELS (single definition, no duplicates)
# =========================

class RoomCreate(BaseModel):
    name: str
    emoji: Optional[str] = "💬"


class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    emoji: str = "💬"
    creator_session_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: str = Field(
        default_factory=lambda: (
            datetime.now(timezone.utc) + timedelta(hours=24)
        ).isoformat()
    )


class RoomMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    room_id: str
    nickname: str
    type: str = "text"
    text: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AdminLogin(BaseModel):
    email: str
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Helper functions
def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=24)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def verify_admin_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_nickname():
    adjectives = ["Anonymous", "Secret", "Hidden", "Mystery", "Silent", "Quiet", "Shy", "Bold"]
    nouns = ["Heart", "Soul", "Mind", "Spirit", "Voice", "Whisper", "Dreamer", "Wanderer"]
    import secrets
    return f"{secrets.choice(adjectives)} {secrets.choice(nouns)}"


async def upload_to_cloudinary(contents: bytes, content_type: str, folder: str) -> dict:
    """Upload bytes to Cloudinary and return result."""
    if content_type and content_type.startswith("video/"):
        resource_type = "video"
    else:
        resource_type = "image"
    result = cloudinary.uploader.upload(
        io.BytesIO(contents),
        resource_type=resource_type,
        folder=folder,
        quality="auto",
        fetch_format="auto"
    )
    return result


async def delete_from_cloudinary(public_id: str, resource_type: str = "image"):
    """Delete media from Cloudinary by public_id."""
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        logger.info(f"Deleted from Cloudinary: {public_id}")
    except Exception as e:
        logger.error(f"Failed to delete from Cloudinary: {public_id} — {e}")


# Routes
@api_router.get("/")
async def root():
    return {"message": "Welcome to Whispero Nepal API"}


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
    access_token = create_access_token({"sub": admin["email"], "role": "admin"})
    return AdminToken(access_token=access_token)


@api_router.post("/confessions", response_model=Confession)
async def create_confession(
    session_id: str = Header(..., alias="X-Session-Id"),
    text: str = Query(...),
    category: str = Query(...),
    nickname: Optional[str] = Query(None),
    is_adult: bool = Query(False),
    city: Optional[str] = Query(None),
    media: Optional[UploadFile] = File(None)
):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    media_url, media_type, media_public_id = None, None, None
    if media and media.filename:
        media_url, media_type, media_public_id = await _process_confession_media(media, session_id)

    confession = Confession(
        session_id=session_id,
        text=text,
        category=category,
        nickname=nickname or generate_nickname(),
        is_adult=is_adult,
        city=city,
        media_url=media_url,
        media_type=media_type,
        public_id=media_public_id,
    )
    await db.confessions.insert_one(confession.model_dump())
    return confession


async def _process_confession_media(media: UploadFile, session_id: str):
    """Upload confession media to Cloudinary. Returns (media_url, media_type, public_id)."""
    contents = await media.read()

    if not contents:
        raise HTTPException(status_code=400, detail="Empty file received")

    size_mb = len(contents) / (1024 * 1024)
    if media.content_type and media.content_type.startswith("image/"):
        if size_mb > 2:
            raise HTTPException(status_code=400, detail="Image size exceeds 2MB")
        media_type = "image"
    elif media.content_type and media.content_type.startswith("video/"):
        if size_mb > 10:
            raise HTTPException(status_code=400, detail="Video size exceeds 10MB")
        media_type = "video"
    else:
        media_type = None

    result = await upload_to_cloudinary(contents, media.content_type, "whispero/confessions")

    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["secure_url"],
        "public_id": result["public_id"],
        "original_filename": media.filename,
        "content_type": media.content_type,
        "size": result["bytes"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return result["secure_url"], media_type, result["public_id"]


@api_router.get("/confessions", response_model=List[Confession])
async def get_confessions(
    skip: int = Query(0),
    limit: int = Query(20),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    sort: Literal["latest", "trending"] = Query("latest")
):
    query = {}
    if category:
        query["category"] = category
    if city:
        query["city"] = city
    sort_field = "created_at" if sort == "latest" else "likes"
    confessions = await db.confessions.find(query, {"_id": 0}).sort(sort_field, -1).skip(skip).limit(limit).to_list(limit)
    return confessions


@api_router.get("/confessions/{confession_id}", response_model=Confession)
async def get_confession(confession_id: str):
    confession = await db.confessions.find_one({"id": confession_id}, {"_id": 0})
    if not confession:
        raise HTTPException(status_code=404, detail="Confession not found")
    return Confession(**confession)


@api_router.post("/confessions/{confession_id}/react")
async def react_to_confession(
    confession_id: str,
    reaction: Reaction,
    session_id: str = Header(..., alias="X-Session-Id")
):
    confession = await db.confessions.find_one({"id": confession_id}, {"_id": 0})
    if not confession:
        raise HTTPException(status_code=404, detail="Confession not found")

    REACTION_FIELDS = {
        "like": "likes", "dislike": "dislikes", "laugh": "laughs",
        "sad": "sads", "angry": "angrys", "fire": "fires"
    }

    existing_reaction = await db.reactions.find_one(
        {"confession_id": confession_id, "session_id": session_id}, {"_id": 0}
    )

    if existing_reaction:
        old_type = existing_reaction["type"]
        if old_type == reaction.type:
            await db.reactions.delete_one({"confession_id": confession_id, "session_id": session_id})
            old_field = REACTION_FIELDS.get(old_type)
            if old_field:
                await db.confessions.update_one({"id": confession_id}, {"$inc": {old_field: -1}})
            return {"message": "Reaction removed", "action": "removed"}
        await db.reactions.update_one(
            {"confession_id": confession_id, "session_id": session_id},
            {"$set": {"type": reaction.type}}
        )
        old_field = REACTION_FIELDS.get(old_type)
        new_field = REACTION_FIELDS.get(reaction.type)
        inc_update = {}
        if old_field:
            inc_update[old_field] = -1
        if new_field:
            inc_update[new_field] = 1
        if inc_update:
            await db.confessions.update_one({"id": confession_id}, {"$inc": inc_update})
    else:
        await db.reactions.insert_one({
            "id": str(uuid.uuid4()),
            "confession_id": confession_id,
            "session_id": session_id,
            "type": reaction.type,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        new_field = REACTION_FIELDS.get(reaction.type)
        if new_field:
            await db.confessions.update_one({"id": confession_id}, {"$inc": {new_field: 1}})

    return {"message": "Reaction recorded", "action": "added"}


@api_router.get("/confessions/{confession_id}/comments", response_model=List[Comment])
async def get_comments(confession_id: str, skip: int = Query(0), limit: int = Query(50)):
    comments = await db.comments.find(
        {"confession_id": confession_id, "parent_id": None}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return comments


@api_router.post("/confessions/{confession_id}/comments", response_model=Comment)
async def create_comment(
    confession_id: str,
    input: CommentCreate,
    session_id: str = Header(..., alias="X-Session-Id")
):
    confession = await db.confessions.find_one({"id": confession_id}, {"_id": 0})
    if not confession:
        raise HTTPException(status_code=404, detail="Confession not found")
    comment = Comment(
        confession_id=confession_id,
        session_id=session_id,
        text=input.text,
        nickname=input.nickname or generate_nickname()
    )
    await db.comments.insert_one(comment.model_dump())
    await db.confessions.update_one({"id": confession_id}, {"$inc": {"comments_count": 1}})
    return comment


@api_router.get("/confessions/{confession_id}/comments/{comment_id}/replies", response_model=List[Comment])
async def get_replies(confession_id: str, comment_id: str, skip: int = Query(0), limit: int = Query(50)):
    replies = await db.comments.find(
        {"confession_id": confession_id, "parent_id": comment_id}, {"_id": 0}
    ).sort("created_at", 1).skip(skip).limit(limit).to_list(limit)
    return replies


@api_router.post("/confessions/{confession_id}/comments/{comment_id}/replies", response_model=Comment)
async def create_reply(
    confession_id: str,
    comment_id: str,
    input: CommentCreate,
    session_id: str = Header(..., alias="X-Session-Id")
):
    parent = await db.comments.find_one({"id": comment_id, "confession_id": confession_id}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent comment not found")
    reply = Comment(
        confession_id=confession_id,
        session_id=session_id,
        text=input.text,
        nickname=input.nickname or generate_nickname(),
        parent_id=comment_id
    )
    await db.comments.insert_one(reply.model_dump())
    await db.comments.update_one({"id": comment_id}, {"$inc": {"replies_count": 1}})
    await db.confessions.update_one({"id": confession_id}, {"$inc": {"comments_count": 1}})
    return reply


@api_router.post("/reports", response_model=Report)
async def create_report(
    input: ReportCreate,
    session_id: str = Header(..., alias="X-Session-Id")
):
    report = Report(
        target_type=input.target_type,
        target_id=input.target_id,
        reporter_session_id=session_id,
        reason=input.reason
    )
    await db.reports.insert_one(report.model_dump())
    report_count = await db.reports.count_documents({"target_type": input.target_type, "target_id": input.target_id})
    if report_count >= 5:
        if input.target_type == "confession":
            await db.confessions.update_one({"id": input.target_id}, {"$set": {"is_hidden": True}})
    return report


@api_router.get("/files/{path:path}")
async def download_file(path: str):
    if path.startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=path)
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if record["storage_path"].startswith("http"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=record["storage_path"])
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=record.get("content_type", content_type))
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail="Error downloading file")


@api_router.get("/admin/reports", response_model=List[Report])
async def get_reports(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    reports = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return reports


@api_router.delete("/admin/confessions/{confession_id}")
async def delete_confession(confession_id: str, admin: dict = Depends(verify_admin_token)):
    confession = await db.confessions.find_one({"id": confession_id}, {"_id": 0})
    if not confession:
        raise HTTPException(status_code=404, detail="Confession not found")

    if confession.get("public_id"):
        resource_type = "video" if confession.get("media_type") == "video" else "image"
        await delete_from_cloudinary(confession["public_id"], resource_type)

    await db.confessions.delete_one({"id": confession_id})
    return {"message": "Confession deleted"}


@api_router.delete("/admin/comments/{comment_id}")
async def delete_comment(comment_id: str, admin: dict = Depends(verify_admin_token)):
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted"}


@api_router.delete("/chat-media/cleanup")
async def cleanup_chat_media(
    session_id: str = Header(..., alias="X-Session-Id"),
    public_ids: List[str] = None
):
    """Delete chat media from Cloudinary when chat ends."""
    if not public_ids:
        return {"message": "Nothing to delete"}
    for public_id in public_ids:
        try:
            try:
                cloudinary.uploader.destroy(public_id, resource_type="image")
            except:
                cloudinary.uploader.destroy(public_id, resource_type="video")
            await db.files.update_one(
                {"public_id": public_id},
                {"$set": {"is_deleted": True}}
            )
        except Exception as e:
            logger.error(f"Failed to delete chat media {public_id}: {e}")
    return {"message": f"Deleted {len(public_ids)} files"}


@api_router.post("/upload-chat-media")
async def upload_chat_media(
    session_id: str = Header(..., alias="X-Session-Id"),
    media: UploadFile = File(...)
):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    contents = await media.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    size_mb = len(contents) / (1024 * 1024)
    if media.content_type and media.content_type.startswith("image/"):
        if size_mb > 2:
            raise HTTPException(status_code=400, detail="Image size exceeds 2MB")
    elif media.content_type and media.content_type.startswith("video/"):
        if size_mb > 10:
            raise HTTPException(status_code=400, detail="Video size exceeds 10MB")

    result = await upload_to_cloudinary(contents, media.content_type, "whispero/chat")

    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["secure_url"],
        "public_id": result["public_id"],
        "original_filename": media.filename,
        "content_type": media.content_type,
        "size": result["bytes"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"media_url": result["secure_url"], "public_id": result["public_id"]}


@api_router.post("/upload-compressed-media")
async def upload_compressed_media(
    session_id: str = Header(..., alias="X-Session-Id"),
    media: UploadFile = File(...)
):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    contents = await media.read()
    content_type = media.content_type or "application/octet-stream"
    ext = media.filename.split(".")[-1] if "." in media.filename else "bin"

    contents, content_type = _compress_image(contents, content_type, ext)

    size_mb = len(contents) / (1024 * 1024)
    if size_mb > 5:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB")

    result = await upload_to_cloudinary(contents, content_type, "whispero/compressed")
    return {"media_url": result["secure_url"], "size": result["bytes"]}


def _compress_image(data: bytes, content_type: str, ext: str) -> tuple:
    if not content_type.startswith("image/") or ext.lower() not in ("jpg", "jpeg", "png", "webp"):
        return data, content_type
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        max_dim = 1200
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
        img_clean = Image.new(img.mode, img.size)
        img_clean.putdata(list(img.getdata()))
        buf = io.BytesIO()
        fmt = "JPEG" if ext.lower() in ("jpg", "jpeg") else "WEBP" if ext.lower() == "webp" else "PNG"
        img_clean.save(buf, format=fmt, quality=80, optimize=True)
        return buf.getvalue(), f"image/{fmt.lower()}"
    except Exception as e:
        logger.warning(f"Image compression failed, uploading original: {e}")
        return data, content_type


@api_router.post("/admin/ban-session")
async def ban_session(session_id: str = Query(...), reason: str = Query(...), admin: dict = Depends(verify_admin_token)):
    await db.banned_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "reason": reason,
        "banned_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Session banned"}


@api_router.get("/admin/analytics")
async def admin_analytics(admin: dict = Depends(verify_admin_token)):
    total_confessions = await db.confessions.count_documents({})
    total_comments = await db.comments.count_documents({})
    total_reports = await db.reports.count_documents({})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    total_sessions = await db.sessions.count_documents({})
    total_files = await db.files.count_documents({"is_deleted": False})
    total_banned = await db.banned_sessions.count_documents({})
    category_pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    categories = await db.confessions.aggregate(category_pipeline).to_list(10)
    category_data = [{"name": c["_id"], "count": c["count"]} for c in categories]
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    daily_pipeline = [
        {"$match": {"created_at": {"$gte": seven_days_ago}}},
        {"$addFields": {"day": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_posts = await db.confessions.aggregate(daily_pipeline).to_list(30)
    daily_data = [{"date": d["_id"], "posts": d["count"]} for d in daily_posts]
    top_confessions = await db.confessions.find({}, {"_id": 0}).sort("likes", -1).limit(5).to_list(5)
    return {
        "total_confessions": total_confessions,
        "total_comments": total_comments,
        "total_reports": total_reports,
        "pending_reports": pending_reports,
        "total_sessions": total_sessions,
        "total_files": total_files,
        "total_banned": total_banned,
        "category_data": category_data,
        "daily_data": daily_data,
        "top_confessions": top_confessions
    }


@api_router.get("/admin/sessions")
async def admin_sessions(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    sessions = await db.sessions.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    banned_ids = [b["session_id"] for b in await db.banned_sessions.find({}, {"_id": 0, "session_id": 1}).to_list(1000)]
    for s in sessions:
        s["is_banned"] = s.get("id") in banned_ids
    return sessions


@api_router.get("/admin/comments")
async def admin_comments(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    comments = await db.comments.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return comments


@api_router.get("/admin/images")
async def admin_images(skip: int = Query(0), limit: int = Query(50), admin: dict = Depends(verify_admin_token)):
    files = await db.files.find({"is_deleted": False}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return files


@api_router.delete("/admin/images/{file_id}")
async def admin_delete_image(file_id: str, admin: dict = Depends(verify_admin_token)):
    file = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file.get("public_id"):
        content_type = file.get("content_type", "")
        resource_type = "video" if content_type.startswith("video/") else "image"
        await delete_from_cloudinary(file["public_id"], resource_type)

    await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True}})
    return {"message": "File deleted"}


@api_router.post("/admin/reports/{report_id}/resolve")
async def resolve_report(report_id: str, action: str = Query(...), admin: dict = Depends(verify_admin_token)):
    status = "resolved" if action == "resolve" else "ignored"
    result = await db.reports.update_one({"id": report_id}, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": f"Report {status}"}


@api_router.get("/confessions/featured/top")
async def get_confession_of_the_day():
    twenty_four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    top = await db.confessions.find(
        {"created_at": {"$gte": twenty_four_hours_ago}}, {"_id": 0}
    ).sort("likes", -1).limit(1).to_list(1)
    if not top:
        top = await db.confessions.find({}, {"_id": 0}).sort("likes", -1).limit(1).to_list(1)
    return top[0] if top else None


# =========================
# DYNAMIC CHAT ROOMS SYSTEM
# =========================

room_connections = defaultdict(list)

MAX_ROOMS_PER_DAY = 5


def clean_room_name(name: str) -> str:
    return name.strip()[:40]


def validate_message(text: str) -> bool:
    """Return True only if text is non-empty and within 500 chars."""
    return 0 < len(text.strip()) <= 500


# =========================
# CREATE ROOM
# =========================

@api_router.post("/rooms/create")
async def create_room(
    input: RoomCreate,
    session_id: str = Header(..., alias="X-Session-Id")
):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    since = datetime.now(timezone.utc) - timedelta(hours=24)

    count = await db.rooms.count_documents({
        "creator_session_id": session_id,
        "created_at": {"$gte": since.isoformat()}
    })

    if count >= MAX_ROOMS_PER_DAY:
        raise HTTPException(status_code=429, detail="Room limit reached")

    room = Room(
        name=clean_room_name(input.name),
        emoji=input.emoji or "💬",
        creator_session_id=session_id
    )

    await db.rooms.insert_one(room.model_dump())
    logger.info(f"Room created: {room.id} — '{room.name}' by session {session_id}")
    return room


# =========================
# GET ROOMS
# =========================

@api_router.get("/rooms")
async def get_rooms():
    # FIX: use expires_at (not created_at) so rooms live for their full 24-hour window
    now = datetime.now(timezone.utc).isoformat()

    rooms = await db.rooms.find(
        {"expires_at": {"$gt": now}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    result = []
    for room in rooms:
        room_id = room["id"]
        result.append({
            **room,
            "online": len(room_connections.get(room_id, []))
        })

    return result


# =========================
# GET ROOM MESSAGES
# =========================

@api_router.get("/rooms/{room_id}/messages")
async def get_room_messages(room_id: str):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    messages = await db.room_messages.find(
        {"room_id": room_id},
        {"_id": 0}
    ).sort("created_at", 1).limit(100).to_list(100)

    return messages


# =========================
# ROOM WEBSOCKET
# =========================

@app.websocket("/api/ws/rooms/{room_id}")
async def room_websocket(
    websocket: WebSocket,
    room_id: str,
    nickname: str = Query("Anonymous")
):
    room = await db.rooms.find_one({"id": room_id})
    if not room:
        await websocket.close(code=4004)
        return

    await websocket.accept()

    room_connections[room_id].append({
        "ws": websocket,
        "nickname": nickname
    })

    join_msg = {
        "id": str(uuid.uuid4()),
        "type": "system",
        "text": f"{nickname} joined",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "online": len(room_connections[room_id])
    }

    for c in room_connections[room_id]:
        try:
            await c["ws"].send_json(join_msg)
        except:
            pass

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") not in ["text"]:
                continue

            text = data.get("text", "")

            if not validate_message(text):
                continue

            message = RoomMessage(
                room_id=room_id,
                nickname=nickname,
                text=text
            )

            await db.room_messages.insert_one(message.model_dump())

            for c in room_connections[room_id]:
                try:
                    await c["ws"].send_json(message.model_dump())
                except:
                    pass

    except WebSocketDisconnect:
        room_connections[room_id] = [
            u for u in room_connections[room_id]
            if u["ws"] != websocket
        ]

        leave_msg = {
            "id": str(uuid.uuid4()),
            "type": "system",
            "text": f"{nickname} left",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "online": len(room_connections[room_id])
        }

        for c in room_connections[room_id]:
            try:
                await c["ws"].send_json(leave_msg)
            except:
                pass


@api_router.get("/online-count")

async def get_online_count():
    return {"online": stranger_chat_manager.online_count, "waiting": len(stranger_chat_manager.waiting_users)}


# WebSocket for Random Chat
@app.websocket("/api/ws/random-chat")
async def websocket_random_chat(websocket: WebSocket, session_id: str = Query(...)):
    logger.info(f"WebSocket connection attempt from session: {session_id}")
    try:
        await websocket.accept()
    except Exception as e:
        logger.error(f"Failed to accept WebSocket: {e}")
        return
    try:
        room_id = await random_chat_manager.find_match(session_id, websocket)
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "skip":
                await random_chat_manager.disconnect_user(session_id)
                room_id = await random_chat_manager.find_match(session_id, websocket)
                continue
            if session_id in random_chat_manager.active_chats:
                chat_info = random_chat_manager.active_chats[session_id]
                partner_id = chat_info.get("partner_id")
                if partner_id and partner_id in random_chat_manager.active_chats:
                    partner_ws = random_chat_manager.active_chats[partner_id]["websocket"]
                    message = {
                        "type": data.get("type", "text"),
                        "text": data.get("text"),
                        "media_url": data.get("media_url"),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    try:
                        await partner_ws.send_json(message)
                    except:
                        await websocket.send_json({"type": "partner_disconnected"})
    except WebSocketDisconnect:
        await random_chat_manager.disconnect_user(session_id)
    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}")
        await random_chat_manager.disconnect_user(session_id)


# WebSocket for chat
@app.websocket("/api/ws/chat/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            message = {
                "id": str(uuid.uuid4()),
                "room_id": room_id,
                "session_id": data.get("session_id"),
                "text": data.get("text"),
                "nickname": data.get("nickname", "Anonymous"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.chat_messages.insert_one(message)
            await manager.broadcast(room_id, message)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)


async def _ws_keepalive(websocket: WebSocket, interval: int = 5):
    try:
        while True:
            await asyncio.sleep(interval)
            try:
                if websocket.client_state.name == "CONNECTED":
                    await websocket.send_json({'type': 'ping'})
                else:
                    break
            except Exception:
                break
    except asyncio.CancelledError:
        pass


async def _handle_stranger_message(user_id: str, data: dict, websocket: WebSocket) -> bool:
    msg_type = data.get('type', data.get('action', 'unknown'))
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
        except Exception:
            return False
        return True
    return True


# WebSocket for Stranger Chat
@app.websocket("/api/ws/stranger-chat")
async def websocket_stranger_chat(websocket: WebSocket, user_id: str = Query(...)):
    logger.info(f"Stranger chat connection attempt from: {user_id}")
    try:
        await websocket.accept()
    except Exception as e:
        logger.error(f"Failed to accept stranger chat WebSocket: {e}")
        return
    try:
        await websocket.send_json({'type': 'ping'})
    except Exception:
        return
    ping_task = asyncio.create_task(_ws_keepalive(websocket))
    try:
        await stranger_chat_manager.add_user(user_id, websocket)
        while True:
            try:
                raw = await websocket.receive_text()
            except Exception as e:
                break
            try:
                data = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                continue
            if not await _handle_stranger_message(user_id, data, websocket):
                break
    except WebSocketDisconnect:
        logger.info(f"Stranger chat disconnected: {user_id}")
    except Exception as e:
        logger.error(f"Stranger chat error for {user_id}: {e}")
    finally:
        ping_task.cancel()
        await stranger_chat_manager.disconnect(user_id)


# Include router
app.include_router(api_router)


# =========================
# 24-HOUR AUTO-DELETE TASK
# FIX: Rooms are now deleted by expires_at (not created_at),
#      so newly created rooms survive their full 24-hour window.
# =========================

async def auto_delete_old_data():
    while True:
        try:
            now = datetime.now(timezone.utc)
            cutoff = (now - timedelta(hours=24)).isoformat()
            now_iso = now.isoformat()

            # Delete confessions, comments, chat messages older than 24h
            del_conf = await db.confessions.delete_many({"created_at": {"$lt": cutoff}})
            del_comm = await db.comments.delete_many({"created_at": {"$lt": cutoff}})
            del_chat = await db.chat_messages.delete_many({"created_at": {"$lt": cutoff}})

            # FIX: Delete rooms whose expires_at has passed (not based on created_at)
            deleted_rooms = await db.rooms.delete_many({
                "expires_at": {"$lt": now_iso}
            })

            # Delete room messages for expired rooms OR messages older than 24h
            active_rooms = await db.rooms.find({}, {"_id": 0, "id": 1}).to_list(1000)
            active_room_ids = [r["id"] for r in active_rooms]

            deleted_room_messages = await db.room_messages.delete_many({
                "$or": [
                    {"created_at": {"$lt": cutoff}},
                    {"room_id": {"$nin": active_room_ids}}
                ]
            })

            logger.info(
                f"Auto-delete: {deleted_rooms.deleted_count} expired rooms, "
                f"{deleted_room_messages.deleted_count} room messages"
            )

            # Delete old files from Cloudinary
            old_files = await db.files.find(
                {"created_at": {"$lt": cutoff}, "is_deleted": False}, {"_id": 0}
            ).to_list(1000)

            for f in old_files:
                if f.get("public_id"):
                    content_type = f.get("content_type", "")
                    resource_type = "video" if content_type.startswith("video/") else "image"
                    await delete_from_cloudinary(f["public_id"], resource_type)

            del_files = await db.files.update_many(
                {"created_at": {"$lt": cutoff}, "is_deleted": False},
                {"$set": {"is_deleted": True}}
            )
            del_sess = await db.sessions.delete_many({"created_at": {"$lt": cutoff}})
            del_react = await db.reactions.delete_many({"created_at": {"$lt": cutoff}})

            total = (
                del_conf.deleted_count + del_comm.deleted_count +
                del_chat.deleted_count + del_sess.deleted_count +
                del_react.deleted_count
            )
            if total > 0:
                logger.info(f"Auto-delete: removed {total} old records")

        except Exception as e:
            logger.error(f"Auto-delete error: {e}")

        await asyncio.sleep(600)


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
        admin_email = os.environ.get("ADMIN_EMAIL", "")
        admin_password = os.environ.get("ADMIN_PASSWORD", "")
        if admin_email and admin_password:
            admin_exists = await db.admins.find_one({"email": admin_email})
            if not admin_exists:
                await db.admins.insert_one({
                    "id": str(uuid.uuid4()),
                    "email": admin_email,
                    "password_hash": pwd_context.hash(admin_password),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                logger.info("Admin created from environment variables")
        asyncio.create_task(auto_delete_old_data())
        logger.info("24-hour auto-delete task started")
    except Exception as e:
        logger.error(f"Startup error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


@app.get("/admin.html", response_class=HTMLResponse)
async def admin_panel():
    admin_file = ROOT_DIR / "admin.html"
    if not admin_file.exists():
        raise HTTPException(status_code=404, detail="Admin panel not found")
    return HTMLResponse(content=admin_file.read_text())


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        result = await upload_to_cloudinary(contents, file.content_type, "whispero/uploads")
        return {"url": result["secure_url"]}
    except Exception as e:
        return {"error": str(e)}