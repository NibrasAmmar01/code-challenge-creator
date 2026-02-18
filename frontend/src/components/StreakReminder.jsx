import { useState, useEffect, useCallback } from "react"
import { useApi } from "../utils/api"
import { Link } from "react-router-dom"

export function StreakReminder() {
    const [dailyData, setDailyData] = useState(null)
    const [show, setShow] = useState(false)
    const { get } = useApi()

    const checkDailyStatus = useCallback(async () => {
        try {
            const data = await get('challenges/daily-challenge')
            
            // Use a function to avoid stale closures
            setDailyData(data)
            
            // Show reminder if not completed
            if (data.can_attempt) {
                setShow(true)
            }
        } catch (err) {
            console.error("Failed to check daily status:", err)
        }
    }, [get])

    useEffect(() => {
        // Use an IIFE (Immediately Invoked Function Expression) pattern
        let isMounted = true
        
        const fetchStatus = async () => {
            await checkDailyStatus()
        }
        
        fetchStatus()
        
        return () => {
            isMounted = false
        }
    }, [checkDailyStatus])

    if (!show || !dailyData) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '1rem',
            borderRadius: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxWidth: '300px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔥 Daily Challenge</span>
                <button 
                    onClick={() => setShow(false)}
                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    ×
                </button>
            </div>
            <p style={{ marginBottom: '1rem' }}>
                You haven't completed today's challenge yet!
            </p>
            <Link 
                to="/daily"
                style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.5rem',
                    background: 'white',
                    color: '#667eea',
                    textDecoration: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600'
                }}
                onClick={() => setShow(false)}
            >
                Try Now
            </Link>
        </div>
    )
}