import json
from datetime import datetime
from database import get_db_connection

def create_session(pallet_id: str, operator_id: str, manifest: list = None) -> dict:
    session_id = f"PLT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{operator_id}"
    started_at = datetime.now().isoformat()
    manifest_str = json.dumps(manifest) if manifest else "[]"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (session_id, pallet_id, operator_id, manifest, status, started_at) VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, pallet_id, operator_id, manifest_str, "active", started_at)
    )
    conn.commit()
    conn.close()
    
    return {
        "session_id": session_id,
        "pallet_id": pallet_id,
        "started_at": started_at,
        "status": "active"
    }

def add_photo(session_id: str, photo_index: int, image_path: str, qr_result: dict) -> dict:
    timestamp = datetime.now().isoformat()
    qr_codes_str = json.dumps(qr_result["qr_codes"])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO photos (session_id, photo_index, timestamp, image_path, qr_codes, qr_count, box_status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (session_id, photo_index, timestamp, image_path, qr_codes_str, qr_result["qr_count"], qr_result["box_status"])
    )
    conn.commit()
    conn.close()
    
    return {
        **qr_result,
        "session_id": session_id,
        "photo_index": photo_index,
        "timestamp": timestamp
    }

def get_session(session_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
    session = cursor.fetchone()
    
    if not session:
        conn.close()
        return None
        
    cursor.execute("SELECT * FROM photos WHERE session_id = ? ORDER BY photo_index ASC", (session_id,))
    photos = cursor.fetchall()
    
    conn.close()
    
    return {
        "session": dict(session),
        "photos": [dict(p) for p in photos]
    }

def confirm_session(session_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    confirmed_at = datetime.now().isoformat()
    
    cursor.execute("UPDATE sessions SET status = 'confirmed', confirmed_at = ? WHERE session_id = ?", (confirmed_at, session_id))
    cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
    session = dict(cursor.fetchone())
    
    cursor.execute("SELECT * FROM photos WHERE session_id = ? ORDER BY photo_index ASC", (session_id,))
    photos = cursor.fetchall()
    
    conn.commit()
    conn.close()
    
    result_by_photo = []
    total_qr = 0
    export_lines = []
    
    for p in photos:
        photo_dict = dict(p)
        qr_codes = json.loads(photo_dict["qr_codes"])
        
        contents = []
        for q in qr_codes:
            if q["status"] in ("ok", "unknown"):
                contents.append(q["data"])
                total_qr += 1
                
        result_by_photo.append({
            "photo_index": photo_dict["photo_index"],
            "timestamp": photo_dict["timestamp"],
            "qr_contents": contents
        })
        
        # Build Export line
        line = f"Ảnh #{photo_dict['photo_index']:02d} | " + " | ".join(contents)
        export_lines.append(line)
        
    export_text = "\n".join(export_lines)
    
    return {
        "session_id": session_id,
        "pallet_id": session["pallet_id"],
        "confirmed_at": confirmed_at,
        "status": session["status"],
        "result_by_photo": result_by_photo,
        "summary": {
            "total_photos": len(photos),
            "total_qr": total_qr,
        },
        "export_text": export_text
    }
