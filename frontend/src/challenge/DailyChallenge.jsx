import { useState, useEffect, useCallback } from "react"
import { useApi } from "../utils/api"
import { MCQChallenge } from "./MCQChallenge"

export function DailyChallenge() {
    const [dailyData, setDailyData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [completed, setCompleted] = useState(false)
    const [result, setResult] = useState(null)
    const { get, post } = useApi()

    const fetchDailyChallenge = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await get('challenges/daily-challenge')
            console.log("Daily challenge data:", data) // Debug log
            setDailyData(data)
            setCompleted(!data?.can_attempt)
        } catch (err) {
            console.error("Failed to fetch daily challenge:", err)
            setError(err.message || "Failed to fetch daily challenge")
        } finally {
            setIsLoading(false)
        }
    }, [get])

    useEffect(() => {
        fetchDailyChallenge()
    }, [fetchDailyChallenge])

    const handleAnswerSubmit = async (answerData) => {
        try {
            const result = await post('challenges/daily-challenge/complete', {
                daily_challenge_id: dailyData.daily_challenge.id,
                is_correct: answerData.is_correct
            })
            
            setResult(result)
            setCompleted(true)
            fetchDailyChallenge()
            
        } catch (err) {
            console.error("Failed to submit daily challenge:", err)
            setError(err.message || "Failed to submit daily challenge")
        }
    }

    const handleShare = useCallback(() => {
        const shareText = `I just completed the Daily Challenge on Code Challenge Creator! 🔥 ${result?.streak_bonus ? `My streak is ${result.new_streak} days!` : ''}`
        navigator.clipboard.writeText(shareText)
        alert('Share text copied to clipboard!')
    }, [result])

    // Add null checks before rendering
    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading today's challenge...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <p>❌ {error}</p>
                    <button 
                        onClick={fetchDailyChallenge}
                        style={styles.retryButton}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    if (!dailyData) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <p>No daily challenge data available</p>
                    <button 
                        onClick={fetchDailyChallenge}
                        style={styles.retryButton}
                    >
                        Refresh
                    </button>
                </div>
            </div>
        )
    }

    const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })

    return (
        <div style={styles.container}>
            <style>{styles.spinnerKeyframes}</style>
            
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Daily Challenge</h1>
                    <p style={{ opacity: 0.9, marginTop: '0.5rem' }}>{today}</p>
                </div>
                <div style={styles.streakContainer}>
                    <div style={styles.streakNumber}>🔥 {dailyData?.streak || 0}</div>
                    <div style={styles.streakLabel}>Day Streak</div>
                </div>
            </div>

            {completed ? (
                <div style={styles.completedCard}>
                    <div style={styles.completedIcon}>🎉</div>
                    <h2 style={styles.completedTitle}>Daily Challenge Completed!</h2>
                    <p style={styles.completedMessage}>
                        {result?.is_correct 
                            ? "Great job! You solved today's challenge correctly." 
                            : "Thanks for trying! Come back tomorrow for a new challenge."}
                    </p>
                    
                    {result?.streak_bonus > 0 && (
                        <div style={styles.bonusInfo}>
                            <strong>🔥 Streak Bonus: +{result.streak_bonus} points</strong>
                            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                Your streak is now {result.new_streak} days!
                            </p>
                        </div>
                    )}
                    
                    <button 
                        style={styles.shareButton}
                        onClick={handleShare}
                    >
                        📤 Share Your Streak
                    </button>
                </div>
            ) : (
                // Add safety check for challenge data
                dailyData?.challenge ? (
                    <MCQChallenge 
                        challenge={dailyData.challenge}
                        onAnswerSubmit={handleAnswerSubmit}
                        showExplanation={false}
                    />
                ) : (
                    <div style={styles.errorContainer}>
                        <p>Challenge data not available</p>
                        <button 
                            onClick={fetchDailyChallenge}
                            style={styles.retryButton}
                        >
                            Refresh
                        </button>
                    </div>
                )
            )}
        </div>
    )
}

// Move styles outside component to avoid recreation
const styles = {
    container: {
        maxWidth: '1000px',
        margin: '2rem auto',
        padding: '0 2rem'
    },
    header: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '1rem',
        padding: '2rem',
        marginBottom: '2rem',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
    },
    title: {
        fontSize: '2rem',
        fontWeight: '700',
        margin: 0
    },
    streakContainer: {
        background: 'rgba(255,255,255,0.2)',
        padding: '1rem 2rem',
        borderRadius: '2rem',
        textAlign: 'center'
    },
    streakNumber: {
        fontSize: '2.5rem',
        fontWeight: '700',
        lineHeight: '1'
    },
    streakLabel: {
        fontSize: '0.9rem',
        opacity: 0.9
    },
    completedCard: {
        background: 'white',
        borderRadius: '1rem',
        padding: '3rem',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    completedIcon: {
        fontSize: '5rem',
        marginBottom: '1rem'
    },
    completedTitle: {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#333',
        marginBottom: '1rem'
    },
    completedMessage: {
        color: '#666',
        marginBottom: '2rem'
    },
    bonusInfo: {
        background: '#fff3cd',
        border: '1px solid #ffeeba',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '2rem',
        color: '#856404'
    },
    shareButton: {
        padding: '0.75rem 2rem',
        background: '#4a90e2',
        color: 'white',
        border: 'none',
        borderRadius: '2rem',
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'background 0.2s',
        ':hover': {
            background: '#357abd'
        }
    },
    loadingContainer: {
        textAlign: 'center',
        padding: '4rem'
    },
    spinner: {
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #4a90e2',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem'
    },
    errorContainer: {
        textAlign: 'center',
        padding: '2rem',
        color: '#e74c3c'
    },
    retryButton: {
        padding: '0.75rem 2rem',
        background: '#4a90e2',
        color: 'white',
        border: 'none',
        borderRadius: '2rem',
        fontSize: '1rem',
        cursor: 'pointer',
        marginTop: '1rem'
    },
    spinnerKeyframes: `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `
}