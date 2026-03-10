import React, { useRef, useState, useEffect } from 'react';
import ScanResult from './ScanResult';
import { uploadPhoto, confirmSession } from '../api';

const C = {
    surface: "#0D1B2E",
    border: "#1A3050",
    accent: "#00BFFF",
    green: "#00E676",
    red: "#FF5252",
    text: "#C8DCF0",
    dim: "#162840",
};

export default function CameraCapture({ session, onConfirm }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(1);
    const [lastResult, setLastResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        let activeStream = null;
        async function setupCamera() {
            try {
                activeStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                setStream(activeStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = activeStream;
                }
            } catch (err) {
                setErrorMsg('Không thể truy cập camera: ' + err.message);
            }
        }
        setupCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);
        setErrorMsg('');

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const base64Image = canvas.toDataURL('image/jpeg', 0.8);

            const result = await uploadPhoto(session.session_id, photoIndex, base64Image);

            setLastResult(result);
            setPhotoIndex(prev => prev + 1);

            // Optional: play beep sound
            if (result.box_status === 'ok') {
                const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'); // dummy short beep
                audio.play().catch(e => { }); // ignore error if browser blocks autoplay
            }

        } catch (err) {
            setErrorMsg('Lỗi khi chụp: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = async () => {
        if (window.confirm("Kết thúc pallet này và xem tổng kết?")) {
            try {
                const finalData = await confirmSession(session.session_id);
                onConfirm(finalData);
            } catch (err) {
                setErrorMsg('Lỗi xác nhận: ' + err.message);
            }
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, padding: "12px 20px", borderRadius: "8px", border: `1px solid ${C.border}` }}>
                <div>
                    <div style={{ fontSize: "12px", color: C.accent }}>Phiên quét: {session.pallet_id}</div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>Thùng #{photoIndex}</div>
                </div>
                <button
                    onClick={handleConfirm}
                    style={{ background: C.green, color: "#000", border: 'none', padding: "8px 16px", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
                >
                    Xác nhận xong
                </button>
            </div>

            <div style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden", border: `2px solid ${C.border}`, background: "#000" }}>
                {!stream && !errorMsg && <div style={{ padding: "40px", textAlign: "center", color: C.text }}>Đang tải camera...</div>}
                {errorMsg && <div style={{ padding: "40px", textAlign: "center", color: C.red }}>{errorMsg}</div>}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ display: stream ? "block" : "none", width: "100%", objectFit: "cover", maxHeight: "60vh" }}
                />

                {/* Visual aiming guide */}
                {stream && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "60%", height: "40%", border: `2px dashed ${C.accent}80`, borderRadius: "8px", pointerEvents: "none" }} />
                )}

                {isProcessing && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontWeight: "bold" }}>
                        Đang xử lý...
                    </div>
                )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <button
                onClick={handleCapture}
                disabled={isProcessing || !stream}
                style={{ background: C.accent, color: "#000", border: 'none', padding: "16px", borderRadius: "8px", fontSize: "18px", fontWeight: "bold", width: "100%", cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.7 : 1 }}
            >
                📸 Chụp thùng này
            </button>

            {lastResult && <ScanResult result={lastResult} />}
        </div>
    );
}
