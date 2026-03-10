from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

from models import NewSessionRequest, NewSessionResponse, PhotoUploadRequest, PhotoResult, ConfirmResponse
from scanner import process_image
from session_manager import create_session, add_photo, get_session, confirm_session

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store websocket connections per session
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_json(message)

manager = ConnectionManager()


@app.post("/sessions/new", response_model=NewSessionResponse)
async def new_session(req: NewSessionRequest):
    try:
        session = create_session(req.pallet_id, req.operator_id, req.manifest)
        # Create session directory for photos
        os.makedirs(f"sessions/{session['session_id']}", exist_ok=True)
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sessions/{session_id}/photos", response_model=PhotoResult)
async def upload_photo(session_id: str, req: PhotoUploadRequest):
    try:
        # Check if session exists
        session_data = get_session(session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        manifest = []
        if session_data["session"]["manifest"]:
            import json
            manifest = json.loads(session_data["session"]["manifest"])

        # Process image
        qr_result = await process_image(req.image_data, manifest)
        
        # Save photo to disk (Optional, for auditing)
        image_path = f"sessions/{session_id}/photo_{req.photo_index:03d}.jpg"
        import base64
        import cv2
        import numpy as np
        try:
            img_data = base64.b64decode(req.image_data.split(',')[1] if ',' in req.image_data else req.image_data)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            cv2.imwrite(image_path, img)
        except Exception as e:
             print(f"Warning: could not save image to disk {e}")

        # Update DB
        final_result = add_photo(session_id, req.photo_index, image_path, qr_result)
        
        # Broadcast via websocket
        await manager.broadcast(final_result, session_id)
        
        return final_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/{session_id}/confirm", response_model=ConfirmResponse)
async def confirm(session_id: str):
    try:
         result = confirm_session(session_id)
         await manager.broadcast({"type": "session_confirmed", "data": result}, session_id)
         return result
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}")
async def get_session_info(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            # wait for messages from client (if they send any)
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
