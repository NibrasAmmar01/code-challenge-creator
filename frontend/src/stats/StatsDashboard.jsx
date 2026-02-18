import { useState, useEffect, useCallback } from "react"
import { useApi } from "../utils/api"

export function StatsDashboard() {
    const [stats, setStats] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [timeframe, setTimeframe] = useState("all")
    const [streakInfo, setStreakInfo] = useState(null)
    const [selectedBadge, setSelectedBadge] = useState(null)
    const { get } = useApi()

    const fetchStats = useCallback(async () => {
        setIsLoading(true)
        try {
            // Fetch main stats
            const data = await get(`stats?timeframe=${timeframe}`)
            
            // Fetch streak info separately
            const streak = await get('stats/streak')
            setStreakInfo(streak)
            
            setStats(data)
            setError(null)
        } catch (err) {
            console.error("Failed to fetch stats:", err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [timeframe, get])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    // Transform backend data to match frontend expectations
    const transformedStats = stats ? {
        totalChallenges: stats.totalChallenges || 0,
        byDifficulty: stats.byDifficulty || { easy: 0, medium: 0, hard: 0 },
        successRate: stats.successRate || { easy: 0, medium: 0, hard: 0 },
        favoriteTopics: stats.favoriteTopics || [],
        streak: streakInfo?.current_streak || stats.streak || 0,
        averageResponseTime: stats.averageResponseTime, // Add this
        achievements: stats.achievements || [],
        recentActivity: stats.recentActivity || []
    } : null

    // Certificate generation function
    const generateCertificate = (badge) => {
        // Get user name from local storage or use default
        const userName = localStorage.getItem('userName') || 'User'
        
        // Create a simple HTML certificate
        const certificateHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Certificate of Achievement</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        margin: 0;
                        padding: 20px;
                    }
                    .certificate {
                        background: white;
                        max-width: 800px;
                        width: 100%;
                        padding: 50px;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        position: relative;
                        border: 10px solid #f0f0f0;
                    }
                    .certificate::before {
                        content: "🏆";
                        position: absolute;
                        top: -30px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-size: 60px;
                        background: white;
                        padding: 0 20px;
                    }
                    h1 {
                        color: #333;
                        font-size: 2.5em;
                        margin-bottom: 10px;
                    }
                    .subtitle {
                        color: #666;
                        font-size: 1.2em;
                        margin-bottom: 30px;
                    }
                    .badge-icon {
                        font-size: 80px;
                        margin: 20px 0;
                    }
                    .badge-name {
                        font-size: 2em;
                        color: #4a90e2;
                        font-weight: bold;
                        margin: 20px 0;
                        padding: 10px 30px;
                        background: linear-gradient(135deg, #667eea20, #764ba220);
                        display: inline-block;
                        border-radius: 50px;
                    }
                    .recipient {
                        font-size: 1.3em;
                        color: #333;
                        margin: 20px 0;
                    }
                    .date {
                        color: #999;
                        font-size: 1.1em;
                        margin-top: 30px;
                    }
                    .seal {
                        font-size: 40px;
                        margin-top: 30px;
                        opacity: 0.8;
                    }
                    .footer {
                        margin-top: 40px;
                        color: #666;
                        font-size: 0.9em;
                    }
                </style>
            </head>
            <body>
                <div class="certificate">
                    <h1>🏅 Certificate of Achievement</h1>
                    <div class="subtitle">Proudly presented to</div>
                    <div class="recipient">${userName}</div>
                    <div class="badge-icon">${badge.icon}</div>
                    <div class="badge-name">${badge.name}</div>
                    <div class="subtitle">${badge.description}</div>
                    <div class="date">Earned on ${new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                    <div class="seal">✨</div>
                    <div class="footer">Code Challenge Generator • Master Your Skills</div>
                </div>
            </body>
            </html>
        `
        
        // Create blob and download
        const blob = new Blob([certificateHTML], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `certificate-${badge.name.toLowerCase().replace(/\s+/g, '-')}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // Badge Detail Modal Component
    const BadgeDetailModal = ({ badge, onClose }) => {
        if (!badge) return null
        
        const hasProgress = badge.progress !== undefined && badge.progress !== null
        const hasTotal = badge.total !== undefined && badge.total !== null
        const progressValue = hasProgress ? badge.progress : 0
        const totalValue = hasTotal ? badge.total : 1
        const progressPercentage = hasProgress && hasTotal ? (progressValue / totalValue) * 100 : 0
        
        return (
            <div style={styles.modalOverlay} onClick={onClose}>
                <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <button style={styles.modalClose} onClick={onClose}>×</button>
                    
                    <div style={styles.modalBadgeIcon}>{badge.icon}</div>
                    <h2 style={styles.modalTitle}>{badge.name}</h2>
                    <p style={styles.modalDescription}>{badge.description}</p>
                    
                    {badge.unlocked ? (
                        <>
                            <div style={styles.certificate}>
                                <div style={styles.certificateIcon}>🏆</div>
                                <h3 style={styles.certificateTitle}>Certificate of Achievement</h3>
                                <p style={styles.certificateText}>
                                    This certifies that you have earned the
                                </p>
                                <h4 style={styles.certificateBadgeName}>{badge.name}</h4>
                                <p style={styles.certificateDate}>
                                    {new Date().toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </p>
                                <div style={styles.certificateSeal}>✨</div>
                            </div>
                            
                            <div style={styles.modalActions}>
                                <button 
                                    style={styles.modalButton}
                                    onClick={() => generateCertificate(badge)}
                                    onMouseEnter={(e) => e.target.style.background = '#357abd'}
                                    onMouseLeave={(e) => e.target.style.background = '#4a90e2'}
                                >
                                    📥 Download Certificate
                                </button>
                                <button 
                                    style={styles.modalButtonSecondary}
                                    onClick={onClose}
                                    onMouseEnter={(e) => e.target.style.background = '#e0e0e0'}
                                    onMouseLeave={(e) => e.target.style.background = '#f0f0f0'}
                                >
                                    Close
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {hasProgress && hasTotal ? (
                                <>
                                    <div style={styles.progressContainer}>
                                        <div style={styles.progressLabel}>
                                            <span>Progress</span>
                                            <span>{progressValue}/{totalValue}</span>
                                        </div>
                                        <div style={styles.progressBar}>
                                            <div style={{
                                                ...styles.progressFill,
                                                width: `${progressPercentage}%`
                                            }} />
                                        </div>
                                    </div>
                                    
                                    <p style={styles.modalHint}>
                                        Complete {totalValue - progressValue} more to unlock this badge!
                                    </p>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>🔒</p>
                                    <p style={{ color: '#666' }}>
                                        This achievement hasn't been started yet.
                                    </p>
                                    <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                        Keep practicing to unlock this badge!
                                    </p>
                                </div>
                            )}
                            
                            <button 
                                style={styles.modalButton}
                                onClick={onClose}
                                onMouseEnter={(e) => e.target.style.background = '#357abd'}
                                onMouseLeave={(e) => e.target.style.background = '#4a90e2'}
                            >
                                Got it
                            </button>
                        </>
                    )}
                </div>
            </div>
        )
    }

    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
        },
        title: {
            fontSize: '2rem',
            fontWeight: '700',
            color: '#333',
            margin: 0
        },
        timeframeSelector: {
            display: 'flex',
            gap: '0.5rem',
            background: '#f8f9fa',
            padding: '0.25rem',
            borderRadius: '30px'
        },
        timeframeButton: {
            padding: '0.5rem 1.25rem',
            border: 'none',
            background: 'transparent',
            borderRadius: '30px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            transition: 'all 0.3s'
        },
        timeframeButtonActive: {
            background: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#4a90e2'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
        },
        statCard: {
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
        },
        statIcon: {
            fontSize: '2.5rem',
            marginBottom: '0.5rem'
        },
        statValue: {
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#4a90e2',
            lineHeight: '1'
        },
        statLabel: {
            fontSize: '0.9rem',
            color: '#666',
            marginTop: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        },
        chartSection: {
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        },
        sectionTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        difficultyGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem'
        },
        difficultyItem: {
            textAlign: 'center'
        },
        difficultyLabel: {
            fontSize: '0.9rem',
            color: '#666',
            marginBottom: '0.25rem'
        },
        difficultyValue: {
            fontSize: '1.5rem',
            fontWeight: '700'
        },
        easy: { color: '#2ecc71' },
        medium: { color: '#f39c12' },
        hard: { color: '#e74c3c' },
        progressBar: {
            width: '100%',
            height: '8px',
            background: '#f0f0f0',
            borderRadius: '4px',
            marginTop: '0.5rem',
            overflow: 'hidden'
        },
        progressFill: {
            height: '100%',
            background: '#4a90e2',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
        },
        topicsList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        },
        topicItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        },
        topicName: {
            flex: 1,
            fontSize: '0.95rem',
            color: '#333'
        },
        topicCount: {
            fontSize: '0.9rem',
            color: '#666',
            fontWeight: '500',
            minWidth: '60px'
        },
        badgesGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
        },
        badgeCard: {
            background: '#f8f9fa',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center',
            transition: 'all 0.3s',
            cursor: 'pointer'
        },
        badgeIcon: {
            fontSize: '2rem',
            marginBottom: '0.5rem'
        },
        badgeName: {
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.25rem'
        },
        badgeDescription: {
            fontSize: '0.8rem',
            color: '#666'
        },
        badgeLocked: {
            opacity: 0.5,
            filter: 'grayscale(1)'
        },
        streakInfo: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '0.5rem'
        },
        streakDays: {
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#e67e22'
        },
        loadingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px'
        },
        spinner: {
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #4a90e2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        },
        errorContainer: {
            textAlign: 'center',
            padding: '2rem'
        },
        retryButton: {
            padding: '0.5rem 1.5rem',
            background: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '1rem'
        },
        // Modal styles
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
        },
        modalContent: {
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            animation: 'slideUp 0.3s ease'
        },
        modalClose: {
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '2rem',
            cursor: 'pointer',
            color: '#999',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s'
        },
        modalBadgeIcon: {
            fontSize: '5rem',
            textAlign: 'center',
            marginBottom: '1rem'
        },
        modalTitle: {
            fontSize: '1.8rem',
            fontWeight: '700',
            color: '#333',
            textAlign: 'center',
            marginBottom: '0.5rem'
        },
        modalDescription: {
            fontSize: '1rem',
            color: '#666',
            textAlign: 'center',
            marginBottom: '2rem',
            lineHeight: '1.6'
        },
        certificate: {
            background: 'linear-gradient(135deg, #fff9e6, #fff)',
            border: '3px solid #4a90e2',
            borderRadius: '15px',
            padding: '2rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(74, 144, 226, 0.2)'
        },
        certificateIcon: {
            fontSize: '3rem',
            marginBottom: '1rem'
        },
        certificateTitle: {
            fontSize: '1.4rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '1rem'
        },
        certificateText: {
            fontSize: '1rem',
            color: '#666',
            marginBottom: '0.5rem'
        },
        certificateBadgeName: {
            fontSize: '1.8rem',
            fontWeight: '700',
            color: '#4a90e2',
            marginBottom: '1rem'
        },
        certificateDate: {
            fontSize: '0.95rem',
            color: '#999',
            marginBottom: '1rem'
        },
        certificateSeal: {
            fontSize: '2rem',
            opacity: 0.8
        },
        modalActions: {
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            marginTop: '1rem'
        },
        modalButton: {
            padding: '0.75rem 1.5rem',
            background: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s',
            flex: 1
        },
        modalButtonSecondary: {
            padding: '0.75rem 1.5rem',
            background: '#f0f0f0',
            color: '#666',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s',
            flex: 1
        },
        progressContainer: {
            marginBottom: '1.5rem'
        },
        progressLabel: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            color: '#666',
            marginBottom: '0.5rem'
        },
        modalHint: {
            fontSize: '0.95rem',
            color: '#f39c12',
            textAlign: 'center',
            marginBottom: '1.5rem',
            padding: '0.75rem',
            background: '#fff3cd',
            borderRadius: '8px'
        }
    }

    const spinnerKeyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `

    if (isLoading && !stats) {
        return (
            <>
                <style>{spinnerKeyframes}</style>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                </div>
            </>
        )
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <p style={{ color: '#e74c3c' }}>❌ Failed to load statistics</p>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</p>
                    <button 
                        onClick={fetchStats}
                        style={styles.retryButton}
                        onMouseEnter={(e) => e.target.style.background = '#357abd'}
                        onMouseLeave={(e) => e.target.style.background = '#4a90e2'}
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    const data = transformedStats || {
        totalChallenges: 0,
        byDifficulty: { easy: 0, medium: 0, hard: 0 },
        successRate: { easy: 0, medium: 0, hard: 0 },
        favoriteTopics: [],
        streak: 0,
        averageResponseTime: null,
        achievements: [],
        recentActivity: []
    }

    // Calculate overall success rate
    const overallSuccess = data.totalChallenges > 0
        ? Math.round(
            (data.byDifficulty.easy * (data.successRate.easy / 100) +
             data.byDifficulty.medium * (data.successRate.medium / 100) +
             data.byDifficulty.hard * (data.successRate.hard / 100)) / data.totalChallenges
          )
        : 0

    // Get favorite topic for display
    const favoriteTopic = data.favoriteTopics[0]?.name || "N/A"

    return (
        <div style={styles.container}>
            <style>{spinnerKeyframes}</style>
            
            <div style={styles.header}>
                <h1 style={styles.title}>📊 Your Statistics</h1>
                <div style={styles.timeframeSelector}>
                    {["week", "month", "all"].map((tf) => (
                        <button
                            key={tf}
                            style={{
                                ...styles.timeframeButton,
                                ...(timeframe === tf ? styles.timeframeButtonActive : {})
                            }}
                            onClick={() => setTimeframe(tf)}
                        >
                            {tf === "all" ? "All Time" : tf.charAt(0).toUpperCase() + tf.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>📝</span>
                    <span style={styles.statValue}>{data.totalChallenges}</span>
                    <span style={styles.statLabel}>Total Challenges</span>
                </div>
                
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>🔥</span>
                    <div style={styles.streakInfo}>
                        <span style={styles.statValue}>{data.streak}</span>
                        <span style={styles.streakDays}>days</span>
                    </div>
                    <span style={styles.statLabel}>Current Streak</span>
                    {streakInfo && streakInfo.longest_streak > data.streak && (
                        <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                            Longest: {streakInfo.longest_streak} days
                        </span>
                    )}
                </div>
                
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>⭐</span>
                    <span style={styles.statValue}>{overallSuccess}%</span>
                    <span style={styles.statLabel}>Overall Success</span>
                </div>
                
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>🎯</span>
                    <span style={styles.statValue}>{favoriteTopic}</span>
                    <span style={styles.statLabel}>Favorite Topic</span>
                </div>
            </div>

            {/* Optional: Display Average Response Time if available */}
            {data.averageResponseTime && (
                <div style={{ ...styles.statCard, marginBottom: '1.5rem', width: 'auto' }}>
                    <span style={styles.statIcon}>⚡</span>
                    <span style={styles.statValue}>{data.averageResponseTime}s</span>
                    <span style={styles.statLabel}>Avg Response Time</span>
                </div>
            )}

            <div style={styles.chartSection}>
                <h2 style={styles.sectionTitle}>
                    <span>📈</span> Performance by Difficulty
                </h2>
                <div style={styles.difficultyGrid}>
                    {["easy", "medium", "hard"].map((level) => (
                        <div key={level} style={styles.difficultyItem}>
                            <div style={styles.difficultyLabel}>
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                            </div>
                            <div style={{
                                ...styles.difficultyValue,
                                ...styles[level]
                            }}>
                                {data.successRate[level]}%
                            </div>
                            <div style={styles.progressBar}>
                                <div style={{
                                    ...styles.progressFill,
                                    width: `${data.successRate[level]}%`,
                                    background: styles[level].color
                                }} />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                                {data.byDifficulty[level]} challenges
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.chartSection}>
                <h2 style={styles.sectionTitle}>
                    <span>📚</span> Most Practiced Topics
                </h2>
                <div style={styles.topicsList}>
                    {data.favoriteTopics.map((topic, index) => (
                        <div key={topic.name} style={styles.topicItem}>
                            <span style={{ fontSize: '1.2rem' }}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📌'}
                            </span>
                            <span style={styles.topicName}>{topic.name}</span>
                            <span style={styles.topicCount}>{topic.count} challenges</span>
                            <div style={{ ...styles.progressBar, width: '100px' }}>
                                <div style={{
                                    ...styles.progressFill,
                                    width: data.favoriteTopics[0]?.count 
                                        ? `${(topic.count / data.favoriteTopics[0].count) * 100}%`
                                        : '0%'
                                }} />
                            </div>
                        </div>
                    ))}
                    {data.favoriteTopics.length === 0 && (
                        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
                            No topics yet. Start practicing to see your favorite topics!
                        </p>
                    )}
                </div>
            </div>

            <div style={styles.chartSection}>
                <h2 style={styles.sectionTitle}>
                    <span>🏅</span> Achievements
                </h2>
                <div style={styles.badgesGrid}>
                    {data.achievements.map((badge) => {
                        // Ensure progress and total have default values
                        const hasProgress = badge.progress !== undefined && badge.progress !== null
                        const hasTotal = badge.total !== undefined && badge.total !== null
                        const progressValue = hasProgress ? badge.progress : 0
                        const totalValue = hasTotal ? badge.total : 1
                        const progressPercentage = hasProgress && hasTotal ? (progressValue / totalValue) * 100 : 0
                        
                        return (
                            <div
                                key={badge.id}
                                style={{
                                    ...styles.badgeCard,
                                    ...(!badge.unlocked ? styles.badgeLocked : {})
                                }}
                                onClick={() => setSelectedBadge(badge)}
                                title={badge.description}
                                onMouseEnter={(e) => {
                                    if (badge.unlocked) {
                                        e.currentTarget.style.transform = 'scale(1.05)'
                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = 'none'
                                }}
                            >
                                <div style={styles.badgeIcon}>{badge.icon}</div>
                                <div style={styles.badgeName}>{badge.name}</div>
                                <div style={styles.badgeDescription}>{badge.description}</div>
                                
                                {/* Show progress only for badges that have progress data AND are not unlocked */}
                                {!badge.unlocked && hasProgress && hasTotal && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ ...styles.progressBar, width: '100%' }}>
                                            <div style={{
                                                ...styles.progressFill,
                                                width: `${progressPercentage}%`
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                                            {progressValue}/{totalValue}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Show message for badges without progress data */}
                                {!badge.unlocked && !hasProgress && (
                                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                                        🔒 Not started
                                    </div>
                                )}
                                
                                {badge.unlocked && (
                                    <div style={{ fontSize: '0.75rem', color: '#2ecc71', marginTop: '0.25rem' }}>
                                        ✅ Unlocked
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div style={styles.chartSection}>
                <h2 style={styles.sectionTitle}>
                    <span>📅</span> Recent Activity
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${data.recentActivity.length}, 1fr)`,
                    gap: '0.5rem',
                    marginTop: '1rem'
                }}>
                    {data.recentActivity.map((day) => {
                        const maxCount = Math.max(...data.recentActivity.map(d => d.count), 1)
                        const intensity = day.count === 0 ? 0 : (day.count / maxCount)
                        const bgColor = day.count === 0 ? '#f0f0f0' :
                                      intensity < 0.33 ? '#c6e48b' :
                                      intensity < 0.66 ? '#7bc96f' :
                                      '#239a3b'
                        
                        return (
                            <div key={day.date} style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '1',
                                    borderRadius: '8px',
                                    background: bgColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: intensity > 0.66 ? 'white' : 'inherit',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                }}>
                                    {day.count > 0 ? day.count : ''}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                                    {new Date(day.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Badge Detail Modal */}
            {selectedBadge && (
                <BadgeDetailModal 
                    badge={selectedBadge} 
                    onClose={() => setSelectedBadge(null)} 
                />
            )}
        </div>
    )
}