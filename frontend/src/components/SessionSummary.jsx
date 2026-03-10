import React from 'react';

const C = {
    card: "#112038",
    border: "#1A3050",
    accent: "#00BFFF",
    green: "#00E676",
    orange: "#FFB300",
    text: "#C8DCF0",
    dim: "#162840",
    muted: "#4A6A88"
};

export default function SessionSummary({ result, onRestart }) {
    if (!result) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result.export_text).then(() => {
            alert("Đã copy danh sách!");
        }).catch(err => {
            console.error('Could not copy text: ', err);
            alert("Lỗi copy. Hãy copy thủ công.");
        });
    };

    return (
        <div style={{ background: C.card, padding: "30px", borderRadius: "12px", border: `1px solid ${C.border}` }}>
            <h2 style={{ color: C.accent, marginTop: 0, textAlign: "center", borderBottom: `1px solid ${C.border}`, paddingBottom: "16px" }}>
                PALLET {result.pallet_id} — HOÀN THÀNH
            </h2>

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px", marginTop: "20px" }}>
                <div style={{ flex: 1, padding: "12px", background: C.dim, borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ color: C.muted, fontSize: "12px", marginBottom: "4px" }}>Tổng ảnh chụp</div>
                    <div style={{ color: C.green, fontSize: "24px", fontWeight: "bold" }}>{result.summary.total_photos}</div>
                </div>
                <div style={{ flex: 1, padding: "12px", background: C.dim, borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ color: C.muted, fontSize: "12px", marginBottom: "4px" }}>Tổng mã QR</div>
                    <div style={{ color: C.accent, fontSize: "24px", fontWeight: "bold" }}>{result.summary.total_qr}</div>
                </div>
            </div>

            <div style={{ background: "#000A14", padding: "16px", borderRadius: "8px", marginBottom: "20px", maxHeight: "400px", overflowY: "auto" }}>
                <pre style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: C.text, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
                    {result.export_text}
                </pre>
            </div>

            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                <button
                    onClick={copyToClipboard}
                    style={{ background: C.accent, color: "#000", border: 'none', padding: "14px 20px", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}
                >
                    📋 Copy danh sách
                </button>
                <button
                    onClick={onRestart}
                    style={{ background: "transparent", color: C.text, border: `1px solid ${C.border}`, padding: "14px 20px", borderRadius: "6px", fontSize: "16px", cursor: "pointer" }}
                >
                    ↩ Quét pallet mới
                </button>
            </div>
        </div>
    );
}
