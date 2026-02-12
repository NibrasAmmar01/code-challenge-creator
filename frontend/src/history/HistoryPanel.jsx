import { useState, useEffect } from "react"
import { MCQChallenge } from "../challenge/MCQChallenge"
import { useApi } from "../utils/api"

export function HistoryPanel(){
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)
    const [selectedChallenge, setSelectedChallenge] = useState(null)
    
    const { get } = useApi()
    const limit = 10

    const fetchHistory = async (pageNum = page) => {
        setIsLoading(true)
        setError(null)
        
        try {
            const response = await get(`challenges/my-history?limit=${limit}&offset=${pageNum * limit}`)
            setHistory(response.challenges || [])
            setTotal(response.total || 0)
        } catch (err) {
            console.error("Failed to fetch history:", err)
            setError(err.message || "Failed to load challenge history")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory(0)
    }, [])

    const handlePageChange = (newPage) => {
        setPage(newPage)
        fetchHistory(newPage)
    }

    const handleChallengeClick = (challenge) => {
        setSelectedChallenge(selectedChallenge?.id === challenge.id ? null : challenge)
    }

    const totalPages = Math.ceil(total / limit)

    const styles = {
        container: {
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '2rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
        },
        title: {
            fontSize: '1.8rem',
            fontWeight: '600',
            color: '#333',
            margin: 0
        },
        stats: {
            color: '#666',
            fontSize: '0.95rem',
            background: '#f8f9fa',
            padding: '0.5rem 1rem',
            borderRadius: '20px'
        },
        loadingContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
            color: '#666'
        },
        spinner: {
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #4a90e2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
        },
        errorContainer: {
            padding: '2rem',
            background: '#fee',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            color: '#c0392b',
            textAlign: 'center'
        },
        retryButton: {
            marginTop: '1rem',
            padding: '0.5rem 1.5rem',
            background: '#c0392b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem'
        },
        emptyState: {
            textAlign: 'center',
            padding: '4rem',
            color: '#999',
            background: '#f8f9fa',
            borderRadius: '8px'
        },
        historyList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        historyCard: {
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'all 0.3s',
            border: '2px solid transparent'
        },
        historyCardHover: {
            borderColor: '#4a90e2',
            background: '#f0f7ff'
        },
        historyCardExpanded: {
            borderColor: '#4a90e2',
            background: '#f0f7ff'
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        cardTitle: {
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#333',
            margin: 0
        },
        cardMeta: {
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
        },
        difficulty: {
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '500'
        },
        easy: {
            background: '#d4edda',
            color: '#155724'
        },
        medium: {
            background: '#fff3cd',
            color: '#856404'
        },
        hard: {
            background: '#f8d7da',
            color: '#721c24'
        },
        date: {
            color: '#999',
            fontSize: '0.85rem'
        },
        expandIcon: {
            color: '#4a90e2',
            fontSize: '0.9rem'
        },
        expandedContent: {
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e0e0e0'
        },
        pagination: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '2rem'
        },
        pageButton: {
            padding: '0.5rem 1rem',
            border: '1px solid #e0e0e0',
            background: 'white',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s'
        },
        pageButtonActive: {
            background: '#4a90e2',
            color: 'white',
            borderColor: '#4a90e2'
        },
        pageButtonDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed'
        }
    }

    // Add keyframe animation
    const spinnerKeyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `

    if (isLoading) {
        return (
            <>
                <style>{spinnerKeyframes}</style>
                <div style={styles.container}>
                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>
                        <p>Loading your challenge history...</p>
                    </div>
                </div>
            </>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <p>❌ {error}</p>
                    <button 
                        style={styles.retryButton}
                        onClick={() => fetchHistory(0)}
                        onMouseEnter={(e) => e.target.style.background = '#a93226'}
                        onMouseLeave={(e) => e.target.style.background = '#c0392b'}
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <style>{spinnerKeyframes}</style>
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Challenge History</h2>
                    {total > 0 && (
                        <span style={styles.stats}>
                            {total} total challenge{total !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {history.length === 0 ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🎯 No challenges yet</p>
                        <p style={{ color: '#999' }}>Generate your first coding challenge to get started!</p>
                    </div>
                ) : (
                    <>
                        <div style={styles.historyList}>
                            {history.map((challenge) => (
                                <div 
                                    key={challenge.id}
                                    style={{
                                        ...styles.historyCard,
                                        ...(selectedChallenge?.id === challenge.id ? styles.historyCardExpanded : {})
                                    }}
                                    onClick={() => handleChallengeClick(challenge)}
                                    onMouseEnter={(e) => {
                                        if (selectedChallenge?.id !== challenge.id) {
                                            e.currentTarget.style.borderColor = styles.historyCardHover.borderColor
                                            e.currentTarget.style.background = styles.historyCardHover.background
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedChallenge?.id !== challenge.id) {
                                            e.currentTarget.style.borderColor = 'transparent'
                                            e.currentTarget.style.background = '#f8f9fa'
                                        }
                                    }}
                                >
                                    <div style={styles.cardHeader}>
                                        <div>
                                            <h3 style={styles.cardTitle}>{challenge.title}</h3>
                                            <div style={styles.cardMeta}>
                                                <span style={{
                                                    ...styles.difficulty,
                                                    ...(challenge.difficulty === 'easy' ? styles.easy :
                                                        challenge.difficulty === 'medium' ? styles.medium : styles.hard)
                                                }}>
                                                    {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1)}
                                                </span>
                                                <span style={styles.date}>
                                                    {new Date(challenge.date_created).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <span style={styles.expandIcon}>
                                            {selectedChallenge?.id === challenge.id ? '▼' : '▶'}
                                        </span>
                                    </div>
                                    
                                    {selectedChallenge?.id === challenge.id && (
                                        <div style={styles.expandedContent}>
                                            <MCQChallenge 
                                                challenge={challenge}
                                                showExplanation={true}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div style={styles.pagination}>
                                <button
                                    style={{
                                        ...styles.pageButton,
                                        ...(page === 0 ? styles.pageButtonDisabled : {})
                                    }}
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 0}
                                >
                                    Previous
                                </button>
                                
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        style={{
                                            ...styles.pageButton,
                                            ...(page === i ? styles.pageButtonActive : {})
                                        }}
                                        onClick={() => handlePageChange(i)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                
                                <button
                                    style={{
                                        ...styles.pageButton,
                                        ...(page === totalPages - 1 ? styles.pageButtonDisabled : {})
                                    }}
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages - 1}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    )
}