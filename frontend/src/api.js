const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const createSession = async (palletId, operatorId, manifest) => {
    try {
        const response = await fetch(`${BASE_URL}/sessions/new`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pallet_id: palletId,
                operator_id: operatorId,
                manifest: manifest || null
            })
        });
        if (!response.ok) throw new Error(await response.text());
        return await response.json();
    } catch (e) {
        console.error("createSession Error", e);
        throw e;
    }
};

export const uploadPhoto = async (sessionId, photoIndex, imageBase64) => {
    try {
        const response = await fetch(`${BASE_URL}/sessions/${sessionId}/photos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_data: imageBase64,
                photo_index: photoIndex
            })
        });
        if (!response.ok) throw new Error(await response.text());
        return await response.json();
    } catch (e) {
        console.error("uploadPhoto Error", e);
        throw e;
    }
};

export const confirmSession = async (sessionId) => {
    try {
        const response = await fetch(`${BASE_URL}/sessions/${sessionId}/confirm`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error(await response.text());
        return await response.json();
    } catch (e) {
        console.error("confirmSession Error", e);
        throw e;
    }
};

export const getSession = async (sessionId) => {
    try {
        const response = await fetch(`${BASE_URL}/sessions/${sessionId}`);
        if (!response.ok) throw new Error(await response.text());
        return await response.json();
    } catch (e) {
        console.error("getSession Error", e);
        throw e;
    }
};
