import cv2
import numpy as np
from pyzbar.pyzbar import decode, ZBarSymbol
import base64
import asyncio

def convert_base64_to_image(base64_string: str):
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

async def process_image(image_bytes: str, manifest: list = None) -> dict:
    # This receives base64 encoded image string
    result = {
        "decode_status": "success",
        "image_quality": "ok",
        "qr_codes": [],
        "qr_count": 0,
        "box_status": "ok",
        "warnings": []
    }
    
    try:
        img = convert_base64_to_image(image_bytes)
        if img is None:
            raise ValueError("Invalid image")
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Quality Check
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        mean_brightness = np.mean(gray)
        
        if laplacian_var < 100:
            result["decode_status"] = "blurry"
            result["image_quality"] = "blurry"
            result["box_status"] = "failed"
            return result
            
        if mean_brightness < 40:
            result["image_quality"] = "dark"
            result["warnings"].append("too_dark")
            
        # 2. Preprocessing
        # CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        processed = clahe.apply(gray)
        
        # Gaussian blur
        processed = cv2.GaussianBlur(processed, (3, 3), 0)
        
        # Sharpen if slight blur
        if 100 <= laplacian_var < 200:
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            processed = cv2.filter2D(processed, -1, kernel)
            
        # Optional Deskew (simplified placeholder to maintain speed)
        # In a full implementation, find contours and apply rotation
        
        # 3. Decode QR
        decoded_objects = decode(img, symbols=[ZBarSymbol.QRCODE])
        
        if not decoded_objects:
            # Fallback 1: OpenCV
            qcd = cv2.QRCodeDetector()
            retval, decoded_info, points, _ = qcd.detectAndDecodeMulti(img)
            
            if retval and len(decoded_info) > 0 and any(decoded_info):
                 for info in decoded_info:
                     if info:
                         decoded_objects.append(type('obj', (object,), {'data': info.encode(), 'type': 'QR_CODE'}))
            
            # Fallback 2: Filters on pyzbar
            if not decoded_objects:
                 # OTSU
                 _, thresh = cv2.threshold(processed, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
                 decoded_objects = decode(thresh, symbols=[ZBarSymbol.QRCODE])
                 
                 if not decoded_objects:
                     # Adaptive
                     thresh_ad = cv2.adaptiveThreshold(processed, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
                     decoded_objects = decode(thresh_ad, symbols=[ZBarSymbol.QRCODE])
                     
                     if not decoded_objects:
                         # Invert
                         inverted = cv2.bitwise_not(processed)
                         decoded_objects = decode(inverted, symbols=[ZBarSymbol.QRCODE])
                         
        if not decoded_objects:
            result["decode_status"] = "failed"
            result["box_status"] = "failed"
            return result
            
        # 4. Validate QRs
        seen_data = set()
        
        for obj in decoded_objects:
            data_str = obj.data.decode("utf-8").strip()
            
            if data_str in seen_data:
                continue # dedup within same image
            seen_data.add(data_str)
            
            status = "ok"
            if manifest is not None and len(manifest) > 0:
                if data_str not in manifest:
                    status = "unknown"
                    result["warnings"].append(f"unknown_qr_{data_str}")
                    
            qr_type = getattr(obj, "type", "QR_CODE")
            result["qr_codes"].append({
                "data": data_str,
                "type": qr_type,
                "status": status
            })
            
        result["qr_count"] = len(result["qr_codes"])
        
        has_unknown = any(q["status"] == "unknown" for q in result["qr_codes"])
        if has_unknown:
            result["box_status"] = "warning"
            
        return result
        
    except Exception as e:
        print(f"Error processing image: {e}")
        result["decode_status"] = "failed"
        result["box_status"] = "failed"
        result["warnings"].append(str(e))
        return result
