import sqlite3
import json
import os

DB_FILE = "scanner.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        pallet_id TEXT,
        operator_id TEXT,
        manifest TEXT,
        status TEXT,
        started_at TEXT,
        confirmed_at TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        photo_index INTEGER,
        timestamp TEXT,
        image_path TEXT,
        qr_codes TEXT,
        qr_count INTEGER,
        box_status TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# Execute init on import
init_db()
