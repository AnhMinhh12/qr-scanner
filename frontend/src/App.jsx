import React, { useState } from 'react';
import CameraCapture from './components/CameraCapture';
import SessionSummary from './components/SessionSummary';
import { createSession } from './api';

const C = {
    bg: "#07111E",
    surface: "#0D1B2E",
    card: "#112038",
    border: "#1A3050",
    accent: "#00BFFF",
    text: "#C8DCF0",
};

export default function App() {
    const [screen, setScreen] = useState('home'); // home, scanning, result
    const [sessionData, setSessionData] = useState(null);
    const [finalResponse, setFinalResponse] = useState(null);

    const [palletId, setPalletId] = useState('');
    const [operatorId, setOperatorId] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const startSession = async () => {
        setErrorMsg('');
        if (!palletId || !operatorId) {
            setErrorMsg('Vui lòng nhập Pallet ID và Operator ID');
            return;
        }
        try {
            const data = await createSession(palletId, operatorId, null); // manifest is optional
            setSessionData(data);
            setScreen('scanning');
        } catch (err) {
            setErrorMsg('Lỗi tạo session: ' + err.message);
        }
    };

    const handleConfirmSuccess = (confirmData) => {
        setFinalResponse(confirmData);
        setScreen('result');
    };

    const restartPattern = () => {
        setScreen('home');
        setSessionData(null);
        setFinalResponse(null);
        setPalletId('');
    };

    return (
        <div style={{ background: C.bg, minHeight: "100vh", padding: "20px" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto", color: C.text }}>
                {screen === 'home' && (
                    <div style={{ background: C.card, padding: "30px", borderRadius: "12px", border: `1px solid ${C.border}` }}>
                        <h2 style={{ marginTop: 0, color: '#fff' }}>Khởi tạo Phiên Quét</h2>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: C.accent }}>Pallet ID</label>
                            <input
                                value={palletId}
                                onChange={e => setPalletId(e.target.value)}
                                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: `1px solid ${C.border}`, background: C.surface, color: '#fff', fontSize: 16 }}
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: C.accent }}>Operator ID</label>
                            <input
                                value={operatorId}
                                onChange={e => setOperatorId(e.target.value)}
                                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: `1px solid ${C.border}`, background: C.surface, color: '#fff', fontSize: 16 }}
                            />
                        </div>
                        {errorMsg && <div style={{ color: "#FF5252", marginBottom: 16, fontSize: 14 }}>{errorMsg}</div>}
                        <button
                            onClick={startSession}
                            style={{ background: C.accent, color: "#000", border: 'none', padding: "14px 20px", borderRadius: "6px", fontSize: 16, fontWeight: "bold", width: "100%", cursor: "pointer" }}
                        >
                            Bắt đầu quét
                        </button>
                    </div>
                )}

                {screen === 'scanning' && sessionData && (
                    <CameraCapture session={sessionData} onConfirm={handleConfirmSuccess} />
                )}

                {screen === 'result' && finalResponse && (
                    <SessionSummary result={finalResponse} onRestart={restartPattern} />
                )}
            </div>
        </div>
    );
}
