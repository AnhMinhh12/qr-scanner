from pydantic import BaseModel
from typing import List, Optional

class QR_CodeResult(BaseModel):
    data: str
    type: str
    status: str

class QROutputResult(BaseModel):
    decode_status: str
    image_quality: str
    qr_codes: List[QR_CodeResult]
    qr_count: int
    box_status: str
    warnings: List[str]

class NewSessionRequest(BaseModel):
    pallet_id: str
    operator_id: str
    manifest: Optional[List[str]] = None

class NewSessionResponse(BaseModel):
    session_id: str
    pallet_id: str
    started_at: str
    status: str

class PhotoUploadRequest(BaseModel):
    image_data: str # base64
    photo_index: int

class PhotoResult(BaseModel):
    decode_status: str
    image_quality: str
    qr_codes: List[QR_CodeResult]
    qr_count: int
    box_status: str
    warnings: List[str]
    session_id: str
    photo_index: int
    timestamp: str

class ConfirmResponse(BaseModel):
    session_id: str
    pallet_id: str
    confirmed_at: str
    status: str
    result_by_photo: List[dict]
    summary: dict
    export_text: str
