import { useAuth } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";

export const useApi = () => {
    const { getToken } = useAuth();

    const makeRequest = useCallback(async (endpoint, options = {}) => {
        try {
            const token = await getToken();
            
            const defaultOptions = {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            };

            const response = await fetch(`http://localhost:8000/api/${endpoint}`, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                if (response.status === 429) {
                    throw new Error("Daily quota exceeded. Please try again tomorrow.");
                }
                if (response.status === 401) {
                    throw new Error("Authentication failed. Please sign in again.");
                }
                throw new Error(errorData?.detail || `Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API request failed:", error);
            throw error;
        }
    }, [getToken]);

    const get = useCallback((endpoint, options = {}) => {
        return makeRequest(endpoint, { method: "GET", ...options });
    }, [makeRequest]);

    const post = useCallback((endpoint, data, options = {}) => {
        return makeRequest(endpoint, { 
            method: "POST", 
            body: JSON.stringify(data),
            ...options 
        });
    }, [makeRequest]);

    const put = useCallback((endpoint, data, options = {}) => {
        return makeRequest(endpoint, { 
            method: "PUT", 
            body: JSON.stringify(data),
            ...options 
        });
    }, [makeRequest]);

    const del = useCallback((endpoint, options = {}) => {
        return makeRequest(endpoint, { method: "DELETE", ...options });
    }, [makeRequest]);

    // Memoize the returned object
    return useMemo(() => ({ 
        makeRequest, 
        get, 
        post, 
        put, 
        delete: del 
    }), [makeRequest, get, post, put, del]);
};