import { useState, useEffect, useCallback } from "react"
import { MCQChallenge } from "../challenge/MCQChallenge"
import { useApi } from "../utils/api"

export function HistoryPanel(){
    const [history, setHistory] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)
    const [selectedChallenge, setSelectedChallenge] = useState(null)
    
    // New state for export
    const [isExporting, setIsExporting] = useState(false)
    const [exportFormat, setExportFormat] = useState('json') // 'json' or 'csv'
    
    // New state for share feedback
    const [shareFeedback, setShareFeedback] = useState({ show: false, message: '', challengeId: null })
    
    // New state for bookmarks
    const [bookmarks, setBookmarks] = useState(new Set())
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
    
    // Filter states
    const [filterDifficulty, setFilterDifficulty] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [sortBy, setSortBy] = useState("desc") // desc = newest first, asc = oldest first
    
    const { get, post } = useApi()
    const limit = 10

    // Memoize fetchHistory to prevent unnecessary re-renders
    const fetchHistory = useCallback(async (pageNum = 0) => {
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
            
            console.log("Fetching with params:", params.toString())
            
            const response = await get(`challenges/my-history?${params.toString()}`)
            console.log("Response:", response)
            
            setHistory(response.challenges || [])
            setTotal(response.total || 0)
            setPage(pageNum)
        } catch (err) {
            console.error("Failed to fetch history:", err)
            setError(err.message || "Failed to load challenge history")
        } finally {
            setIsLoading(false)
        }
    }, [filterDifficulty, searchTerm, sortBy, get, limit])

    // Fetch bookmarks on mount
    useEffect(() => {
        fetchBookmarks()
    }, [])

    const fetchBookmarks = async () => {
        try {
            const response = await get('challenges/bookmarks')
            const bookmarkIds = new Set(response.bookmarks.map(b => b.id))
            setBookmarks(bookmarkIds)
        } catch (err) {
            console.error("Failed to fetch bookmarks:", err)
        }
    }

    // Toggle bookmark function
    const toggleBookmark = async (challengeId, e) => {
        e.stopPropagation()
        
        try {
            const result = await post(`challenges/challenge/${challengeId}/bookmark`, {})
            
            setBookmarks(prev => {
                const newSet = new Set(prev)
                if (result.bookmarked) {
                    newSet.add(challengeId)
                } else {
                    newSet.delete(challengeId)
                }
                return newSet
            })
        } catch (err) {
            console.error("Failed to toggle bookmark:", err)
        }
    }

    // Share function
    const handleShareChallenge = async (challenge, e) => {
        e.stopPropagation() // Prevent card expansion
        
        try {
            // Get share link from backend
            const result = await get(`challenges/challenge/${challenge.id}/share`)
            
            // Copy to clipboard
            await navigator.clipboard.writeText(result.share_url)
            
            // Show success feedback
            setShareFeedback({
                show: true,
                message: '✓ Link copied to clipboard!',
                challengeId: challenge.id
            })
            
            // Hide feedback after 2 seconds
            setTimeout(() => {
                setShareFeedback({ show: false, message: '', challengeId: null })
            }, 2000)
            
        } catch (err) {
            console.error("Failed to share challenge:", err)
            
            // Fallback: try to copy URL manually
            const fallbackUrl = `${window.location.origin}/challenge/${challenge.id}`
            try {
                await navigator.clipboard.writeText(fallbackUrl)
                setShareFeedback({
                    show: true,
                    message: '✓ Link copied to clipboard!',
                    challengeId: challenge.id
                })
                setTimeout(() => {
                    setShareFeedback({ show: false, message: '', challengeId: null })
                }, 2000)
            } catch {
                alert('Could not copy to clipboard. Here\'s the link:\n' + fallbackUrl)
            }
        }
    }

    // Export functions
    const exportToJSON = () => {
        const exportData = {
            exported_at: new Date().toISOString(),
            total_challenges: total,
            filters: {
                difficulty: filterDifficulty || 'all',
                search: searchTerm || 'none',
                sort: sortBy
            },
            challenges: history.map(ch => ({
                id: ch.id,
                title: ch.title,
                difficulty: ch.difficulty,
                topic: ch.topic,
                question: ch.question,
                options: ch.options,
                correct_answer_id: ch.correct_answer_id,
                explanation: ch.explanation,
                time_complexity: ch.time_complexity,
                space_complexity: ch.space_complexity,
                date_created: ch.date_created
            }))
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `challenge-history-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const exportToCSV = () => {
        // Define CSV headers
        const headers = ['ID', 'Title', 'Difficulty', 'Topic', 'Date Created', 'Time Complexity', 'Space Complexity']
        
        // Convert challenges to CSV rows
        const rows = history.map(ch => [
            ch.id,
            `"${ch.title.replace(/"/g, '""')}"`,
            ch.difficulty,
            `"${ch.topic.replace(/"/g, '""')}"`,
            new Date(ch.date_created).toLocaleDateString(),
            ch.time_complexity || 'N/A',
            ch.space_complexity || 'N/A'
        ])
        
        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `challenge-history-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const exportToPDF = async () => {
        setIsExporting(true)
        try {
            const printWindow = window.open('', '_blank')
            if (!printWindow) {
                alert('Please allow pop-ups to print')
                return
            }
            
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Challenge History Export</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 2rem; }
                            h1 { color: #333; }
                            .header { display: flex; justify-content: space-between; margin-bottom: 2rem; }
                            .filters { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
                            table { width: 100%; border-collapse: collapse; }
                            th { background: #4a90e2; color: white; padding: 0.75rem; text-align: left; }
                            td { padding: 0.75rem; border-bottom: 1px solid #ddd; }
                            tr:nth-child(even) { background: #f9f9f9; }
                            .badge { 
                                padding: 0.25rem 0.75rem; 
                                border-radius: 20px; 
                                font-size: 0.85rem;
                                display: inline-block;
                            }
                            .easy { background: #d4edda; color: #155724; }
                            .medium { background: #fff3cd; color: #856404; }
                            .hard { background: #f8d7da; color: #721c24; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Challenge History Export</h1>
                            <p>Exported: ${new Date().toLocaleString()}</p>
                        </div>
                        
                        <div class="filters">
                            <h3>Applied Filters:</h3>
                            <p>Difficulty: ${filterDifficulty || 'All'}</p>
                            <p>Search: ${searchTerm || 'None'}</p>
                            <p>Sort: ${sortBy === 'desc' ? 'Newest First' : 'Oldest First'}</p>
                            <p>Total Challenges: ${total}</p>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Difficulty</th>
                                    <th>Topic</th>
                                    <th>Date</th>
                                    <th>Time Complexity</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${history.map(ch => `
                                    <tr>
                                        <td>${ch.title}</td>
                                        <td><span class="badge ${ch.difficulty}">${ch.difficulty}</span></td>
                                        <td>${ch.topic}</td>
                                        <td>${new Date(ch.date_created).toLocaleDateString()}</td>
                                        <td>${ch.time_complexity || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <p style="margin-top: 2rem; text-align: center; color: #666;">
                            Generated by Code Challenge Generator
                        </p>
                    </body>
                </html>
            `)
            
            printWindow.document.close()
            
            setTimeout(() => {
                printWindow.print()
            }, 500)
            
        } catch (err) {
            console.error("Failed to generate PDF:", err)
            setError("Failed to generate PDF")
        } finally {
            setIsExporting(false)
        }
    }

    const handleExport = () => {
        if (history.length === 0) {
            alert('No challenges to export')
            return
        }
        
        switch(exportFormat) {
            case 'json':
                exportToJSON()
                break
            case 'csv':
                exportToCSV()
                break
            case 'pdf':
                exportToPDF()
                break
            default:
                exportToJSON()
        }
    }

    // Initial fetch
    useEffect(() => {
        fetchHistory(0)
    }, [fetchHistory])

    // Fetch when filters change
    useEffect(() => {
        fetchHistory(0)
    }, [filterDifficulty, sortBy, fetchHistory])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHistory(0)
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm, fetchHistory])

    const handlePageChange = (newPage) => {
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
        setShowBookmarksOnly(false)
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
        sortBy !== "desc",
        showBookmarksOnly
    ].filter(Boolean).length

    // Filter history based on bookmarks if needed
    const displayedHistory = showBookmarksOnly 
        ? history.filter(ch => bookmarks.has(ch.id))
        : history

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
        headerActions: {
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        stats: {
            color: '#666',
            fontSize: '0.95rem',
            background: '#f8f9fa',
            padding: '0.5rem 1rem',
            borderRadius: '20px'
        },
        exportContainer: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
        },
        exportSelect: {
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            background: 'white',
            fontSize: '0.9rem',
            color: '#333',
            cursor: 'pointer'
        },
        exportButton: {
            padding: '0.5rem 1rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        exportButtonDisabled: {
            background: '#6c757d',
            cursor: 'not-allowed',
            opacity: 0.5
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
        bookmarksToggle: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: showBookmarksOnly ? '#4a90e2' : 'white',
            color: showBookmarksOnly ? 'white' : '#666',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.95rem',
            height: '42px',
            transition: 'all 0.2s'
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
            border: '2px solid transparent',
            position: 'relative'
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
            alignItems: 'center',
            width: '100%'
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
        // Action buttons styles
        actionButtons: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
        },
        actionButton: {
            padding: '0.5rem',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '1.2rem',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        },
        bookmarkButton: {
            color: '#f1c40f'
        },
        bookmarkButtonInactive: {
            color: '#999'
        },
        shareButton: {
            color: '#3498db'
        },
        shareFeedback: {
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: '#4a90e2',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            animation: 'fadeInOut 2s ease',
            zIndex: 10
        },
        expandIcon: {
            color: '#4a90e2',
            fontSize: '0.9rem',
            marginLeft: '0.5rem'
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
    const keyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            20% { opacity: 1; transform: translateY(0); }
            80% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }
    `

    if (isLoading && page === 0) {
        return (
            <>
                <style>{keyframes}</style>
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
            <style>{keyframes}</style>
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Challenge History</h2>
                    <div style={styles.headerActions}>
                        {total > 0 && (
                            <span style={styles.stats}>
                                {total} total challenge{total !== 1 ? 's' : ''}
                            </span>
                        )}
                        
                        {/* Export controls */}
                        {history.length > 0 && (
                            <div style={styles.exportContainer}>
                                <select
                                    value={exportFormat}
                                    onChange={(e) => setExportFormat(e.target.value)}
                                    style={styles.exportSelect}
                                    disabled={isExporting}
                                >
                                    <option value="json">JSON</option>
                                    <option value="csv">CSV</option>
                                    <option value="pdf">PDF</option>
                                </select>
                                <button
                                    onClick={handleExport}
                                    style={{
                                        ...styles.exportButton,
                                        ...(isExporting ? styles.exportButtonDisabled : {})
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isExporting) {
                                            e.target.style.background = '#218838'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isExporting) {
                                            e.target.style.background = '#28a745'
                                        }
                                    }}
                                    disabled={isExporting}
                                >
                                    {isExporting ? 'Exporting...' : '📥 Export'}
                                </button>
                            </div>
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

                    <button
                        style={styles.bookmarksToggle}
                        onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                    >
                        <span>⭐</span>
                        {showBookmarksOnly ? 'Showing Bookmarks' : 'Show Bookmarks'}
                    </button>

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
                {displayedHistory.length > 0 && (
                    <div style={styles.statsRow}>
                        <div style={styles.statCard}>
                            <div style={styles.statValue}>{displayedHistory.length}</div>
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

                {displayedHistory.length === 0 && !isLoading ? (
                    <div style={styles.emptyState}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                            {showBookmarksOnly ? '⭐ No bookmarked challenges' : (searchTerm || filterDifficulty ? '🔍 No matches found' : '🎯 No challenges yet')}
                        </p>
                        <p style={{ color: '#999' }}>
                            {showBookmarksOnly 
                                ? 'Bookmark challenges by clicking the star icon' 
                                : (searchTerm || filterDifficulty 
                                    ? 'Try adjusting your filters' 
                                    : 'Generate your first coding challenge to get started!')}
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={styles.historyList}>
                            {displayedHistory.map((challenge) => (
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
                                    {/* Share feedback popup */}
                                    {shareFeedback.show && shareFeedback.challengeId === challenge.id && (
                                        <div style={styles.shareFeedback}>
                                            {shareFeedback.message}
                                        </div>
                                    )}
                                    
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
                                        
                                        {/* Action Buttons */}
                                        <div style={styles.actionButtons}>
                                            {/* Bookmark Button */}
                                            <button
                                                onClick={(e) => toggleBookmark(challenge.id, e)}
                                                style={{
                                                    ...styles.actionButton,
                                                    color: bookmarks.has(challenge.id) ? '#f1c40f' : '#999'
                                                }}
                                                title={bookmarks.has(challenge.id) ? "Remove bookmark" : "Bookmark challenge"}
                                            >
                                                {bookmarks.has(challenge.id) ? '★' : '☆'}
                                            </button>
                                            
                                            {/* Share Button */}
                                            <button
                                                onClick={(e) => handleShareChallenge(challenge, e)}
                                                style={{
                                                    ...styles.actionButton,
                                                    ...styles.shareButton
                                                }}
                                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                                title="Share challenge"
                                            >
                                                🔗
                                            </button>
                                            <span style={styles.expandIcon}>
                                                {selectedChallenge?.id === challenge.id ? '▼' : '▶'}
                                            </span>
                                        </div>
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

                        {totalPages > 1 && !showBookmarksOnly && (
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