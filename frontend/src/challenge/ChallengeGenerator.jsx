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
    
    const { get, post } = useApi()

    // Fetch quota on component mount
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
        
        try {
            const newChallenge = await post("challenges/generate-challenge", {
                topic,
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
            } else if (err.message.includes("service unavailable") || err.message.includes("503")) {
                setError("Challenge generation service is temporarily unavailable. Please try again later.")
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
            
            // If answer was incorrect and there's an explanation, you might want to track this
            if (!result.is_correct) {
                console.log("Incorrect answer, showing explanation")
            }
            
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

    // Styles
    const styles = {
        container: {
            maxWidth: '800px',
            margin: '0 auto',
            padding: '2rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        title: {
            color: '#333',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontSize: '1.8rem',
            fontWeight: '600'
        },
        quotaDisplay: {
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            border: '1px solid #e0e0e0'
        },
        quotaText: {
            margin: '0.25rem 0',
            fontSize: '1.1rem',
            color: '#555'
        },
        resetMessage: {
            color: '#ff6b6b',
            fontWeight: '500',
            margin: '0.25rem 0'
        },
        quotaWarning: {
            color: '#f39c12',
            fontWeight: '500',
            margin: '0.25rem 0'
        },
        formGroup: {
            marginBottom: '1.5rem'
        },
        label: {
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#555',
            fontSize: '0.95rem'
        },
        select: {
            width: '100%',
            padding: '0.75rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '1rem',
            transition: 'border-color 0.3s',
            backgroundColor: 'white',
            cursor: 'pointer',
            outline: 'none'
        },
        selectFocus: {
            borderColor: '#4a90e2'
        },
        input: {
            width: '100%',
            padding: '0.75rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '1rem',
            transition: 'border-color 0.3s',
            marginTop: '0.5rem',
            outline: 'none'
        },
        button: {
            width: '100%',
            padding: '1rem',
            background: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
        },
        buttonHover: {
            background: '#357abd',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
        },
        buttonDisabled: {
            background: '#ccc',
            cursor: 'not-allowed',
            opacity: '0.7',
            transform: 'none',
            boxShadow: 'none'
        },
        spinner: {
            width: '20px',
            height: '20px',
            border: '3px solid #ffffff',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        },
        errorContainer: {
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#fee',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            color: '#c0392b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        },
        errorText: {
            margin: 0,
            fontSize: '0.95rem'
        },
        dismissButton: {
            padding: '0.25rem 0.75rem',
            background: 'transparent',
            border: '1px solid #c0392b',
            borderRadius: '4px',
            color: '#c0392b',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontSize: '0.9rem'
        },
        challengeResult: {
            marginTop: '2rem',
            borderTop: '2px solid #e0e0e0',
            paddingTop: '2rem'
        },
        topicInput: {
            width: '100%',
            padding: '0.75rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '1rem',
            marginTop: '0.5rem'
        },
        answerFeedback: {
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '6px',
            textAlign: 'center',
            fontWeight: '500'
        },
        correctFeedback: {
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb'
        },
        incorrectFeedback: {
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb'
        }
    }

    // Keyframes for spinner animation
    const spinnerKeyframes = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `

    return (
        <>
            <style>{spinnerKeyframes}</style>
            <div style={styles.container}>
                <h2 style={styles.title}>Coding Challenge Generator</h2>
                
                {/* Quota Display */}
                <div style={styles.quotaDisplay}>
                    <p style={styles.quotaText}>
                        Challenges remaining today: {quota?.quota_remaining || 0}/50
                    </p>
                    {quota?.quota_remaining === 0 && (
                        <p style={styles.resetMessage}>
                            ⏰ Next reset: {getNextResetTime()}
                        </p>
                    )}
                    {quota?.quota_remaining > 0 && quota?.quota_remaining < 10 && (
                        <p style={styles.quotaWarning}>
                            ⚠️ Only {quota.quota_remaining} challenges left today!
                        </p>
                    )}
                </div>

                {/* Topic Selection */}
                <div style={styles.formGroup}>
                    <label htmlFor="topic" style={styles.label}>
                        Programming Topic
                    </label>
                    <select 
                        id="topic" 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)} 
                        disabled={isLoading}
                        style={styles.select}
                        onFocus={(e) => e.target.style.borderColor = styles.selectFocus.borderColor}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    >
                        {predefinedTopics.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Or enter custom topic..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isLoading}
                        style={styles.input}
                        onFocus={(e) => e.target.style.borderColor = styles.selectFocus.borderColor}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                        list="topic-suggestions"
                    />
                    <datalist id="topic-suggestions">
                        {predefinedTopics.map(t => (
                            <option key={t} value={t} />
                        ))}
                    </datalist>
                </div>

                {/* Difficulty Selection */}
                <div style={styles.formGroup}>
                    <label htmlFor="difficulty" style={styles.label}>
                        Select Difficulty
                    </label>
                    <select 
                        id="difficulty" 
                        value={difficulty} 
                        onChange={(e) => setDifficulty(e.target.value)} 
                        disabled={isLoading}
                        style={styles.select}
                        onFocus={(e) => e.target.style.borderColor = styles.selectFocus.borderColor}
                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                    >
                        <option value="easy">Easy 🌱</option>
                        <option value="medium">Medium 📚</option>
                        <option value="hard">Hard 🚀</option>
                    </select>
                </div>

                {/* Generate Button */}
                <button 
                    onClick={generateChallenge} 
                    disabled={isLoading || isSubmitting || quota?.quota_remaining === 0} 
                    style={{
                        ...styles.button,
                        ...(isLoading || isSubmitting || quota?.quota_remaining === 0 ? styles.buttonDisabled : {}),
                        ...(!isLoading && !isSubmitting && quota?.quota_remaining !== 0 ? { ':hover': styles.buttonHover } : {})
                    }}
                    onMouseEnter={(e) => {
                        if (!isLoading && !isSubmitting && quota?.quota_remaining !== 0) {
                            e.target.style.background = styles.buttonHover.background
                            e.target.style.transform = styles.buttonHover.transform
                            e.target.style.boxShadow = styles.buttonHover.boxShadow
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isLoading && !isSubmitting && quota?.quota_remaining !== 0) {
                            e.target.style.background = styles.button.background
                            e.target.style.transform = 'none'
                            e.target.style.boxShadow = 'none'
                        }
                    }}
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
                        "Generate Challenge"
                    )}
                </button>

                {/* Error Message */}
                {error && (
                    <div style={styles.errorContainer}>
                        <p style={styles.errorText}>❌ {error}</p>
                        <button 
                            onClick={() => setError(null)} 
                            style={styles.dismissButton}
                            onMouseEnter={(e) => {
                                e.target.style.background = '#c0392b'
                                e.target.style.color = 'white'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent'
                                e.target.style.color = '#c0392b'
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Answer Feedback */}
                {answerResult && (
                    <div style={{
                        ...styles.answerFeedback,
                        ...(answerResult.is_correct ? styles.correctFeedback : styles.incorrectFeedback)
                    }}>
                        {answerResult.is_correct ? (
                            <>🎉 {answerResult.feedback || "Correct! Great job!"}</>
                        ) : (
                            <>❌ {answerResult.feedback || "Not quite right. Check the explanation below."}</>
                        )}
                    </div>
                )}

                {/* Challenge Display */}
                {challenge && !isLoading && (
                    <div style={styles.challengeResult}>
                        <MCQChallenge 
                            challenge={challenge}
                            onAnswerSubmit={handleAnswerSubmit}
                            showExplanation={answerResult && !answerResult.is_correct}
                        />
                    </div>
                )}
            </div>
        </>
    )
}