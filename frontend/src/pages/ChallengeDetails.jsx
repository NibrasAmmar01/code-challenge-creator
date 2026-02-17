import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { MCQChallenge } from "../challenge/MCQChallenge"
import { useApi } from "../utils/api"

export function ChallengeDetails() {
    const { id } = useParams() // Get challenge ID from URL
    const navigate = useNavigate()
    const [challenge, setChallenge] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isBookmarked, setIsBookmarked] = useState(false)
    const [showShareFeedback, setShowShareFeedback] = useState(false)
    
    const { get, post } = useApi()

    // Memoize fetch functions to prevent unnecessary re-renders
    const fetchChallenge = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        
        try {
            const data = await get(`challenges/challenge/${id}`)
            setChallenge(data)
        } catch (err) {
            console.error("Failed to fetch challenge:", err)
            setError(err.message || "Failed to load challenge")
            
            // If challenge not found, redirect to history after 3 seconds
            if (err.message.includes("404")) {
                setTimeout(() => navigate('/history'), 3000)
            }
        } finally {
            setIsLoading(false)
        }
    }, [id, get, navigate])

    const checkBookmarkStatus = useCallback(async () => {
        try {
            // Fetch all bookmarks and check if current challenge is bookmarked
            const bookmarks = await get('challenges/bookmarks')
            const isMarked = bookmarks.bookmarks.some(b => b.id === parseInt(id))
            setIsBookmarked(isMarked)
        } catch (err) {
            console.error("Failed to check bookmark:", err)
        }
    }, [id, get])

    useEffect(() => {
        fetchChallenge()
        checkBookmarkStatus()
    }, [fetchChallenge, checkBookmarkStatus])

    const toggleBookmark = async () => {
        try {
            const result = await post(`challenges/challenge/${id}/bookmark`, {})
            setIsBookmarked(result.bookmarked)
        } catch (err) {
            console.error("Failed to toggle bookmark:", err)
        }
    }

    const handleShare = async () => {
        try {
            const shareUrl = `${window.location.origin}/challenge/${id}`
            await navigator.clipboard.writeText(shareUrl)
            setShowShareFeedback(true)
            setTimeout(() => setShowShareFeedback(false), 2000)
        } catch (err) {
            console.error("Failed to copy link:", err)
            alert('Could not copy to clipboard. Here\'s the link:\n' + `${window.location.origin}/challenge/${id}`)
        }
    }

    const handleBack = () => {
        navigate(-1) // Go back to previous page
    }

    const styles = {
        container: {
            maxWidth: '1000px',
            margin: '2rem auto',
            padding: '0 2rem'
        },
        header: {
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
        },
        backButton: {
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '2px solid #e0e0e0',
            borderRadius: '2rem',
            color: '#666',
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
        },
        actionButtons: {
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
        },
        iconButton: {
            padding: '0.75rem',
            borderRadius: '50%',
            border: 'none',
            background: '#f8f9fa',
            cursor: 'pointer',
            fontSize: '1.2rem',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '45px',
            height: '45px'
        },
        bookmarkActive: {
            background: '#fff3cd',
            color: '#f1c40f'
        },
        bookmarkInactive: {
            color: '#999'
        },
        shareButton: {
            color: '#3498db'
        },
        shareFeedback: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#4a90e2',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s ease',
            zIndex: 1000
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
            padding: '4rem',
            background: '#fee',
            borderRadius: '12px',
            border: '1px solid #dc3545'
        },
        errorTitle: {
            fontSize: '1.5rem',
            color: '#dc3545',
            marginBottom: '1rem'
        },
        errorMessage: {
            color: '#666',
            marginBottom: '2rem'
        },
        notFoundContainer: {
            textAlign: 'center',
            padding: '4rem'
        },
        notFoundTitle: {
            fontSize: '2rem',
            color: '#333',
            marginBottom: '1rem'
        },
        notFoundText: {
            color: '#666',
            marginBottom: '2rem'
        }
    }

    // Add keyframe animations
    const keyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `

    if (isLoading) {
        return (
            <>
                <style>{keyframes}</style>
                <div style={styles.container}>
                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>
                        <p>Loading challenge...</p>
                    </div>
                </div>
            </>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <h2 style={styles.errorTitle}>❌ Error</h2>
                    <p style={styles.errorMessage}>{error}</p>
                    {error.includes("404") && (
                        <p style={{ color: '#666' }}>Redirecting to history...</p>
                    )}
                    <button 
                        onClick={handleBack}
                        style={styles.backButton}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#f0f0f0'
                            e.target.style.borderColor = '#ccc'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent'
                            e.target.style.borderColor = '#e0e0e0'
                        }}
                    >
                        ← Go Back
                    </button>
                </div>
            </div>
        )
    }

    if (!challenge) {
        return (
            <div style={styles.container}>
                <div style={styles.notFoundContainer}>
                    <h2 style={styles.notFoundTitle}>🔍 Challenge Not Found</h2>
                    <p style={styles.notFoundText}>The challenge you're looking for doesn't exist or has been deleted.</p>
                    <button 
                        onClick={handleBack}
                        style={styles.backButton}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#f0f0f0'
                            e.target.style.borderColor = '#ccc'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent'
                            e.target.style.borderColor = '#e0e0e0'
                        }}
                    >
                        ← Go Back to History
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <style>{keyframes}</style>
            
            {/* Share feedback toast */}
            {showShareFeedback && (
                <div style={styles.shareFeedback}>
                    ✓ Link copied to clipboard!
                </div>
            )}
            
            <div style={styles.container}>
                {/* Header with actions */}
                <div style={styles.header}>
                    <button
                        onClick={handleBack}
                        style={styles.backButton}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#f0f0f0'
                            e.target.style.borderColor = '#ccc'
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent'
                            e.target.style.borderColor = '#e0e0e0'
                        }}
                    >
                        ← Back
                    </button>

                    <div style={styles.actionButtons}>
                        {/* Bookmark button */}
                        <button
                            onClick={toggleBookmark}
                            style={{
                                ...styles.iconButton,
                                ...(isBookmarked ? styles.bookmarkActive : styles.bookmarkInactive)
                            }}
                            title={isBookmarked ? "Remove bookmark" : "Bookmark this challenge"}
                        >
                            {isBookmarked ? '★' : '☆'}
                        </button>

                        {/* Share button */}
                        <button
                            onClick={handleShare}
                            style={{
                                ...styles.iconButton,
                                ...styles.shareButton
                            }}
                            title="Share challenge"
                        >
                            🔗
                        </button>
                    </div>
                </div>

                {/* Challenge content */}
                <MCQChallenge 
                    challenge={challenge}
                    showExplanation={true}
                />
            </div>
        </>
    )
}