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
    
    // Filter states
    const [filterDifficulty, setFilterDifficulty] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState("desc") // desc = newest first, asc = oldest first
    
    const { get } = useApi()
    const limit = 10

    const fetchHistory = async (pageNum = 0) => {
        setIsLoading(true)
        setError(null)
        
        try {
            // Build query params
            const params = new URLSearchParams()
            params.append('limit', limit)
            params.append('offset', pageNum * limit)
            params.append('sort', sortBy)
            
            // Only add filters if they have values
            if (filterDifficulty) {
                params.append('difficulty', filterDifficulty)
            }
            
            if (searchTerm.trim()) {
                params.append('search', searchTerm.trim())
            }
            
            console.log("Fetching with params:", params.toString()) // Debug log
            
            const response = await get(`challenges/my-history?${params.toString()}`)
            console.log("Response:", response) // Debug log
            
            setHistory(response.challenges || [])
            setTotal(response.total || 0)
            setPage(pageNum)
        } catch (err) {
            console.error("Failed to fetch history:", err)
            setError(err.message || "Failed to load challenge history")
        } finally {
            setIsLoading(false)
        }
    }

    // Initial fetch
    useEffect(() => {
        fetchHistory(0)
    }, []) // Empty dependency array = run once on mount

    // Fetch when filters change
    useEffect(() => {
        // Reset to first page when filters change
        fetchHistory(0)
    }, [filterDifficulty, sortBy]) // Removed searchTerm from here - we'll handle it separately

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page !== 0) {
                // Reset to first page on search
                fetchHistory(0)
            } else {
                fetchHistory(0)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm])

    const handlePageChange = (newPage) => {
        setPage(newPage)
        fetchHistory(newPage)
    }

    const handleChallengeClick = (challenge) => {
        setSelectedChallenge(selectedChallenge?.id === challenge.id ? null : challenge)
    }

    const handleDifficultyChange = (e) => {
        setFilterDifficulty(e.target.value)
    }

    const handleSortChange = (e) => {
        setSortBy(e.target.value)
    }

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
    }

    const clearFilters = () => {
        setFilterDifficulty("")
        setSearchTerm("")
        setSortBy("desc")
        // Fetch will be triggered by useEffect
    }

    const totalPages = Math.ceil(total / limit)

    const getDifficultyStats = () => {
        const stats = { easy: 0, medium: 0, hard: 0 }
        history.forEach(ch => {
            if (stats[ch.difficulty] !== undefined) {
                stats[ch.difficulty]++
            }
        })
        return stats
    }

    const difficultyStats = getDifficultyStats()

    // Count active filters
    const activeFilterCount = [
        filterDifficulty !== "",
        searchTerm.trim() !== "",
        sortBy !== "desc"
    ].filter(Boolean).length

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
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
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
        filterBar: {
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'flex-end'
        },
        filterGroup: {
            flex: 1,
            minWidth: '200px'
        },
        filterLabel: {
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: '500',
            color: '#666',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        filterSelect: {
            width: '100%',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            background: 'white',
            fontSize: '0.95rem',
            color: '#333',
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.2s'
        },
        searchInput: {
            width: '100%',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            background: 'white',
            fontSize: '0.95rem',
            color: '#333',
            outline: 'none',
            transition: 'border-color 0.2s'
        },
        clearFiltersButton: {
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            color: '#666',
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            height: '42px'
        },
        statsRow: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
        },
        statCard: {
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center'
        },
        statValue: {
            fontSize: '2rem',
            fontWeight: '700',
            color: '#333',
            lineHeight: '1.2'
        },
        statLabel: {
            fontSize: '0.9rem',
            color: '#666',
            marginTop: '0.25rem'
        },
        statEasy: {
            color: '#28a745'
        },
        statMedium: {
            color: '#fd7e14'
        },
        statHard: {
            color: '#dc3545'
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
            alignItems: 'center',
            marginTop: '0.5rem',
            flexWrap: 'wrap'
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
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
        },
        topic: {
            color: '#666',
            fontSize: '0.85rem',
            background: '#e9ecef',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px'
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
            marginTop: '2rem',
            flexWrap: 'wrap'
        },
        pageButton: {
            padding: '0.5rem 1rem',
            border: '1px solid #e0e0e0',
            background: 'white',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            minWidth: '40px'
        },
        pageButtonActive: {
            background: '#4a90e2',
            color: 'white',
            borderColor: '#4a90e2'
        },
        pageButtonDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed'
        },
        activeFilterCount: {
            background: '#4a90e2',
            color: 'white',
            borderRadius: '12px',
            padding: '0.25rem 0.75rem',
            fontSize: '0.85rem',
            marginLeft: '0.5rem'
        }
    }

    // Add keyframe animation
    const spinnerKeyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `

    if (isLoading && page === 0) {
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
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {total > 0 && (
                            <span style={styles.stats}>
                                {total} total challenge{total !== 1 ? 's' : ''}
                            </span>
                        )}
                        {activeFilterCount > 0 && (
                            <span style={styles.activeFilterCount}>
                                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                            </span>
                        )}
                    </div>
                </div>

                {/* Filter Bar */}
                <div style={styles.filterBar}>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Search</label>
                        <input
                            type="text"
                            placeholder="Search by title or topic..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            style={styles.searchInput}
                        />
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Difficulty</label>
                        <select
                            value={filterDifficulty}
                            onChange={handleDifficultyChange}
                            style={styles.filterSelect}
                        >
                            <option value="">All Difficulties</option>
                            <option value="easy">🌱 Easy</option>
                            <option value="medium">📚 Medium</option>
                            <option value="hard">🚀 Hard</option>
                        </select>
                    </div>

                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Sort By</label>
                        <select
                            value={sortBy}
                            onChange={handleSortChange}
                            style={styles.filterSelect}
                        >
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </div>

                    {activeFilterCount > 0 && (
                        <button
                            style={styles.clearFiltersButton}
                            onClick={clearFilters}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#f0f0f0'
                                e.target.style.borderColor = '#ccc'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent'
                                e.target.style.borderColor = '#e0e0e0'
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Statistics Cards */}
                {history.length > 0 && (
                    <div style={styles.statsRow}>
                        <div style={styles.statCard}>
                            <div style={styles.statValue}>{history.length}</div>
                            <div style={styles.statLabel}>Showing</div>
                        </div>
                        {difficultyStats.easy > 0 && (
                            <div style={styles.statCard}>
                                <div style={{...styles.statValue, ...styles.statEasy}}>
                                    {difficultyStats.easy}
                                </div>
                                <div style={styles.statLabel}>Easy</div>
                            </div>
                        )}
                        {difficultyStats.medium > 0 && (
                            <div style={styles.statCard}>
                                <div style={{...styles.statValue, ...styles.statMedium}}>
                                    {difficultyStats.medium}
                                </div>
                                <div style={styles.statLabel}>Medium</div>
                            </div>
                        )}
                        {difficultyStats.hard > 0 && (
                            <div style={styles.statCard}>
                                <div style={{...styles.statValue, ...styles.statHard}}>
                                    {difficultyStats.hard}
                                </div>
                                <div style={styles.statLabel}>Hard</div>
                            </div>
                        )}
                    </div>
                )}

                {history.length === 0 && !isLoading ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                            {searchTerm || filterDifficulty ? '🔍 No matches found' : '🎯 No challenges yet'}
                        </p>
                        <p style={{ color: '#999' }}>
                            {searchTerm || filterDifficulty 
                                ? 'Try adjusting your filters' 
                                : 'Generate your first coding challenge to get started!'}
                        </p>
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
                                            e.currentTarget.style.borderColor = '#4a90e2'
                                            e.currentTarget.style.background = '#f0f7ff'
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
                                                    {challenge.difficulty === 'easy' && '🌱 '}
                                                    {challenge.difficulty === 'medium' && '📚 '}
                                                    {challenge.difficulty === 'hard' && '🚀 '}
                                                    {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1)}
                                                </span>
                                                <span style={styles.topic}>
                                                    📌 {challenge.topic}
                                                </span>
                                                <span style={styles.date}>
                                                    📅 {new Date(challenge.date_created).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
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
                                    ←
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
                                    →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    )
}