import { useState, useEffect, useCallback } from "react"
import { useApi } from "../utils/api"

export function StatsDashboard() {
    const [stats, setStats] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [timeframe, setTimeframe] = useState("all")
    const { get } = useApi()

    const fetchStats = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await get(`stats?timeframe=${timeframe}`)
            setStats(data)
            setError(null)
        } catch (err) {
            console.error("Failed to fetch stats:", err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [timeframe, get]) // Add dependencies

    useEffect(() => {
        fetchStats()
    }, [fetchStats]) // Only depend on fetchStats

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
            marginBottom: '2rem'
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
            fontWeight: '500'
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
        }
    }

    const spinnerKeyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
                <div style={{ textAlign: 'center', color: '#e74c3c', padding: '2rem' }}>
                    <p>❌ Failed to load statistics</p>
                    <button 
                        onClick={fetchStats}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: '#4a90e2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginTop: '1rem'
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    const data = stats || {
        totalChallenges: 0,
        byDifficulty: { easy: 0, medium: 0, hard: 0 },
        successRate: { easy: 0, medium: 0, hard: 0 },
        favoriteTopics: [],
        streak: 0,
        achievements: [],
        recentActivity: []
    }

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
                            {tf.charAt(0).toUpperCase() + tf.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>📝</span>
                    <span style={styles.statValue}>{data.totalChallenges || 0}</span>
                    <span style={styles.statLabel}>Total Challenges</span>
                </div>
                
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>🔥</span>
                    <div style={styles.streakInfo}>
                        <span style={styles.statValue}>{data.streak || 0}</span>
                        <span style={styles.streakDays}>days</span>
                    </div>
                    <span style={styles.statLabel}>Current Streak</span>
                </div>
                
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>⭐</span>
                    <span style={styles.statValue}>
                        {data.totalChallenges > 0 
                            ? Math.round(
                                (data.byDifficulty?.easy * (data.successRate?.easy || 0) / 100 +
                                 data.byDifficulty?.medium * (data.successRate?.medium || 0) / 100 +
                                 data.byDifficulty?.hard * (data.successRate?.hard || 0) / 100) /
                                data.totalChallenges
                            )
                            : 0}%
                    </span>
                    <span style={styles.statLabel}>Overall Success</span>
                </div>
                
                <div style={styles.statCard}>
                    <span style={styles.statIcon}>🎯</span>
                    <span style={styles.statValue}>
                        {data.favoriteTopics?.[0]?.name || "N/A"}
                    </span>
                    <span style={styles.statLabel}>Favorite Topic</span>
                </div>
            </div>

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
                                {data.successRate?.[level] || 0}%
                            </div>
                            <div style={styles.progressBar}>
                                <div style={{
                                    ...styles.progressFill,
                                    width: `${data.successRate?.[level] || 0}%`,
                                    background: styles[level].color
                                }} />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                                {data.byDifficulty?.[level] || 0} challenges
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
                    {data.favoriteTopics?.map((topic, index) => (
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
                </div>
            </div>

            <div style={styles.chartSection}>
                <h2 style={styles.sectionTitle}>
                    <span>🏅</span> Achievements
                </h2>
                <div style={styles.badgesGrid}>
                    {data.achievements?.map((badge) => (
                        <div
                            key={badge.id}
                            style={{
                                ...styles.badgeCard,
                                ...(!badge.unlocked ? styles.badgeLocked : {})
                            }}
                        >
                            <div style={styles.badgeIcon}>{badge.icon}</div>
                            <div style={styles.badgeName}>{badge.name}</div>
                            <div style={styles.badgeDescription}>{badge.description}</div>
                            {!badge.unlocked && badge.progress !== undefined && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ ...styles.progressBar, width: '100%' }}>
                                        <div style={{
                                            ...styles.progressFill,
                                            width: `${(badge.progress / badge.total) * 100}%`
                                        }} />
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                                        {badge.progress}/{badge.total}
                                    </div>
                                </div>
                            )}
                            {badge.unlocked && (
                                <div style={{ fontSize: '0.75rem', color: '#2ecc71', marginTop: '0.25rem' }}>
                                    ✅ Unlocked
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.chartSection}>
                <h2 style={styles.sectionTitle}>
                    <span>📅</span> Recent Activity
                </h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '0.5rem',
                    marginTop: '1rem'
                }}>
                    {data.recentActivity?.map((day) => (
                        <div key={day.date} style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '100%',
                                aspectRatio: '1',
                                borderRadius: '8px',
                                background: day.count === 0 ? '#f0f0f0' :
                                           day.count === 1 ? '#c6e48b' :
                                           day.count === 2 ? '#7bc96f' :
                                           '#239a3b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: day.count > 2 ? 'white' : 'inherit',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}>
                                {day.count > 0 ? day.count : ''}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}