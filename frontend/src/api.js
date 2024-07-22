import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

export const getClientId = async () => {
    try {
        const response = await api.get('/api/get-client-id');
        return response.data;
    } catch (error) {
        console.error('Error fetching client ID from API:', error);
        throw error;
    }
};

export const authorizeCode = async (code, redirectUri) => {
    try {
        const response = await api.post("/api/authorization-code", { code, currentUrl: redirectUri });
        return response.data;
    } catch (error) {
        console.error('Error authorizing code:', error);
        throw error;
    }
};

export const checkLoginStatus = async () => {
    try {
        const response = await api.get('/api/check-login');
        return response.data;
    } catch (error) {
        console.error('Error checking login status:', error);
        throw error;
    }
};
