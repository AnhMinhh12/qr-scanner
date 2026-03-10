import React from 'react';

const C = {
    card: "#112038",
    border: "#1A3050",
    accent: "#00BFFF",
    green: "#00E676",
    orange: "#FFB300",
    red: "#FF5252",
    text: "#C8DCF0",
    dim: "#162840",
    muted: "#4A6A88"
};

export default function ScanResult({ result }) {
    if (!result) return null;

    let overallColor = C.green;
    let icon = "✅";
    let title = `Ảnh #${result.photo_index} — OK`;

    if (result.box_status === "warning") {
        overallColor = C.orange;
        icon = "⚠️";
        title = `Ảnh #${result.photo_index} — Cần chú ý`;
    } else if (result.box_status === "failed") {
        overallColor = C.red;
        icon = "❌";
        title = `Ảnh #${result.photo_index} — Lỗi`;
    }

    return (
        <div style={{ background: `${overallColor}10`, border: `2px solid ${overallColor}50`, borderRadius: "10px", padding: "16px", marginTop: "20px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "20px" }}>{icon}</span>
                <span style={{ fontSize: "16px", fontWeight: "bold", color: overallColor }}>{title}</span>
            </div>

            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "8px" }}>
                Thời gian: {new Date(result.timestamp).toLocaleTimeString()}
            </div>

            {result.qr_codes && result.qr_codes.length > 0 ? (
                <div style={{ background: "#000A14", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {result.qr_codes.map((qr, idx) => {
                        const statusColor = qr.status === "ok" ? C.green : C.orange;
                        return (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.dim}`, paddingBottom: "4px" }}>
                                <span style={{ color: C.text, wordBreak: "break-all", fontSize: "13px" }}>{qr.data}</span>
                                <span style={{ color: statusColor, fontSize: "12px", marginLeft: "10px", flexShrink: 0 }}>
                                    {qr.status === "ok" ? "✓" : "⚠"}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ color: C.muted, fontSize: "13px", fontStyle: "italic" }}>Không đọc được mã QR nào.</div>
            )}

            {result.warnings && result.warnings.length > 0 && (
                <div style={{ marginTop: "12px", color: C.orange, fontSize: "12px" }}>
                    <strong>Cảnh báo:</strong> {result.warnings.join(", ")}
                </div>
            )}
        </div>
    );
}
