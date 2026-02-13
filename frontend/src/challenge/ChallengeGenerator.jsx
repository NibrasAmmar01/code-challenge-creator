import "react"
import { useState, useEffect } from "react"
import { MCQChallenge } from "./MCQChallenge"
import { useApi } from "../utils/api"

export function ChallengeGenerator() {
    const [challenge, setChallenge] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [difficulty, setDifficulty] = useState("easy")
    const [topic, setTopic] = useState("Python lists")
    const [quota, setQuota] = useState(null)
    const [answerResult, setAnswerResult] = useState(null)
    const [customTopic, setCustomTopic] = useState("")
    const [isCustomTopic, setIsCustomTopic] = useState(false)
    
    const { get, post } = useApi()

    useEffect(() => {
        fetchQuota()
    }, [])

    const fetchQuota = async () => {
        try {
            const quotaData = await get("challenges/quota")
            setQuota(quotaData)
        } catch (err) {
            console.error("Failed to fetch quota:", err)
        }
    }

    const generateChallenge = async () => {
        setIsLoading(true)
        setError(null)
        setChallenge(null)
        setAnswerResult(null)
        
        const selectedTopic = isCustomTopic ? customTopic : topic
        
        try {
            const newChallenge = await post("challenges/generate-challenge", {
                topic: selectedTopic,
                difficulty
            })
            
            setChallenge(newChallenge)
            await fetchQuota()
        } catch (err) {
            console.error("Failed to generate challenge:", err)
            
            if (err.message.includes("quota exceeded") || err.message.includes("429")) {
                setError("You've reached your daily limit. Please try again tomorrow.")
                await fetchQuota()
            } else if (err.message.includes("Authentication") || err.message.includes("401")) {
                setError("Please sign in to generate challenges.")
            } else {
                setError(err.message || "Failed to generate challenge. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleAnswerSubmit = async (answerData) => {
        setIsSubmitting(true)
        setError(null)
        
        try {
            const result = await post("challenges/validate-answer", {
                challenge_id: answerData.challenge_id,
                selected_answer_index: answerData.selected_answer_index
            })
            
            setAnswerResult(result)
            return result
        } catch (err) {
            console.error("Failed to validate answer:", err)
            setError("Failed to validate answer. Please try again.")
            throw err
        } finally {
            setIsSubmitting(false)
        }
    }

    const getNextResetTime = () => {
        if (!quota?.next_reset_date) return "tomorrow"
        
        const resetDate = new Date(quota.next_reset_date)
        const now = new Date()
        const hoursRemaining = Math.floor((resetDate - now) / (1000 * 60 * 60))
        const minutesRemaining = Math.floor(((resetDate - now) % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hoursRemaining > 24) {
            return `${Math.floor(hoursRemaining / 24)} days`
        } else if (hoursRemaining > 0) {
            return `${hoursRemaining}h ${minutesRemaining}m`
        } else if (minutesRemaining > 0) {
            return `${minutesRemaining} minutes`
        } else {
            return "soon"
        }
    }

    const predefinedTopics = [
        "Python lists",
        "Python dictionaries", 
        "Python functions",
        "Python classes",
        "JavaScript arrays",
        "JavaScript promises",
        "React hooks",
        "SQL queries",
        "Algorithms",
        "Data structures"
    ]

    const getDifficultyColor = (level) => {
        switch(level) {
            case 'easy': return 'var(--success-500)';
            case 'medium': return 'var(--warning-500)';
            case 'hard': return 'var(--error-500)';
            default: return 'var(--primary-500)';
        }
    }

    const styles = {
        container: {
            maxWidth: '900px',
            margin: '0 auto',
            animation: 'slideIn 0.3s ease-out'
        },
        header: {
            marginBottom: '2rem',
            textAlign: 'center'
        },
        title: {
            fontSize: '2.5rem',
            fontWeight: '700',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
        },
        subtitle: {
            color: 'var(--text-secondary)',
            fontSize: '1.1rem'
        },
        quotaCard: {
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
        },
        quotaInfo: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        },
        quotaBadge: {
            width: '3rem',
            height: '3rem',
            borderRadius: '0.75rem',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white'
        },
        quotaText: {
            fontSize: '1.1rem',
            color: 'var(--text-primary)'
        },
        quotaRemaining: {
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'var(--primary-500)'
        },
        quotaWarning: {
            padding: '0.5rem 1rem',
            background: 'var(--warning-50)',
            border: '1px solid var(--warning-500)',
            borderRadius: '2rem',
            color: 'var(--warning-700)',
            fontSize: '0.9rem',
            fontWeight: '500'
        },
        formCard: {
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '1rem',
            padding: '2rem',
            marginBottom: '2rem'
        },
        topicToggle: {
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            padding: '0.25rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '2rem',
            width: 'fit-content'
        },
        toggleButton: {
            padding: '0.5rem 1.25rem',
            borderRadius: '2rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        toggleButtonActive: {
            background: 'white',
            color: 'var(--primary-600)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        difficultySelector: {
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.5rem'
        },
        difficultyButton: {
            flex: 1,
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '2px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
        },
        difficultyButtonActive: (level) => ({
            borderColor: getDifficultyColor(level),
            background: level === 'easy' ? 'var(--success-50)' :
                       level === 'medium' ? 'var(--warning-50)' :
                       'var(--error-50)',
            color: level === 'easy' ? 'var(--success-700)' :
                   level === 'medium' ? 'var(--warning-700)' :
                   'var(--error-700)'
        }),
        generateButton: {
            width: '100%',
            padding: '1rem',
            background: 'var(--accent-gradient)',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
        },
        errorContainer: {
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'var(--error-50)',
            border: '1px solid var(--error-500)',
            borderRadius: '0.75rem',
            color: 'var(--error-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        },
        spinner: {
            width: '20px',
            height: '20px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }
    }

    return (
        <div style={styles.container} className="animate-slide-in">
            <div style={styles.header}>
                <h1 style={styles.title}>Challenge Generator</h1>
                <p style={styles.subtitle}>Create custom coding challenges powered by AI</p>
            </div>

            {/* Quota Display */}
            <div style={styles.quotaCard}>
                <div style={styles.quotaInfo}>
                    <div style={styles.quotaBadge}>
                        {quota?.quota_remaining || 0}
                    </div>
                    <div>
                        <div style={styles.quotaText}>
                            Daily Challenges Remaining
                        </div>
                        <div style={styles.quotaRemaining}>
                            {quota?.quota_remaining || 0}/50
                        </div>
                    </div>
                </div>
                {quota?.quota_remaining === 0 && (
                    <div style={styles.quotaWarning}>
                        ⏰ Resets {getNextResetTime()}
                    </div>
                )}
            </div>

            {/* Topic Selection Card */}
            <div style={styles.formCard}>
                <div style={styles.topicToggle}>
                    <button
                        style={{
                            ...styles.toggleButton,
                            ...(!isCustomTopic ? styles.toggleButtonActive : {})
                        }}
                        onClick={() => setIsCustomTopic(false)}
                    >
                        Predefined Topics
                    </button>
                    <button
                        style={{
                            ...styles.toggleButton,
                            ...(isCustomTopic ? styles.toggleButtonActive : {})
                        }}
                        onClick={() => setIsCustomTopic(true)}
                    >
                        Custom Topic
                    </button>
                </div>

                {!isCustomTopic ? (
                    <div className="form-group">
                        <label className="form-label">Select Topic</label>
                        <select
                            className="form-select"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={isLoading}
                        >
                            {predefinedTopics.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="form-group">
                        <label className="form-label">Enter Custom Topic</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Python decorators, Binary trees..."
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <div style={styles.difficultySelector}>
                        {['easy', 'medium', 'hard'].map((level) => (
                            <button
                                key={level}
                                style={{
                                    ...styles.difficultyButton,
                                    ...(difficulty === level ? styles.difficultyButtonActive(level) : {})
                                }}
                                onClick={() => setDifficulty(level)}
                                disabled={isLoading}
                            >
                                {level === 'easy' && '🌱'}
                                {level === 'medium' && '📚'}
                                {level === 'hard' && '🚀'}
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={generateChallenge}
                    disabled={isLoading || isSubmitting || quota?.quota_remaining === 0 || (isCustomTopic && !customTopic)}
                    style={styles.generateButton}
                >
                    {isLoading ? (
                        <>
                            <span style={styles.spinner}></span>
                            Generating...
                        </>
                    ) : isSubmitting ? (
                        <>
                            <span style={styles.spinner}></span>
                            Submitting...
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            Generate Challenge
                        </>
                    )}
                </button>

                {error && (
                    <div style={styles.errorContainer}>
                        <span>❌ {error}</span>
                        <button 
                            onClick={() => setError(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 1rem' }}
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>

            {/* Answer Feedback */}
            {answerResult && (
                <div className={`card ${answerResult.is_correct ? 'badge-success' : 'badge-error'}`} 
                     style={{ padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                    {answerResult.is_correct ? (
                        <>🎉 {answerResult.feedback || "Correct! Great job!"}</>
                    ) : (
                        <>❌ {answerResult.feedback || "Not quite right. Check the explanation below."}</>
                    )}
                </div>
            )}

            {/* Challenge Display */}
            {challenge && !isLoading && (
                <div className="animate-slide-in">
                    <MCQChallenge 
                        challenge={challenge}
                        onAnswerSubmit={handleAnswerSubmit}
                        showExplanation={answerResult && !answerResult.is_correct}
                    />
                </div>
            )}
        </div>
    )
}