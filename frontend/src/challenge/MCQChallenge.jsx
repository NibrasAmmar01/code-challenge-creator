import "react"
import { useState } from "react"
import { useApi } from "../utils/api"

export function MCQChallenge({ challenge, showExplanation = false, onAnswerSubmit }) {
    const [selectedOption, setSelectedOption] = useState(null)
    const [shouldShowExplanation, setShouldShowExplanation] = useState(showExplanation)
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    // New state for hints
    const [showHints, setShowHints] = useState(false)
    const [hints, setHints] = useState([])
    const [isLoadingHint, setIsLoadingHint] = useState(false)
    const [hintError, setHintError] = useState(null)
    const [hintLevel, setHintLevel] = useState(1)
    
    const { post } = useApi()

    const options = typeof challenge.options === "string"
        ? JSON.parse(challenge.options)
        : challenge.options

    const handleOptionSelect = async (index) => {
        if (selectedOption !== null || isSubmitting) return
        
        setSelectedOption(index)
        setShouldShowExplanation(true)
        
        if (onAnswerSubmit) {
            setIsSubmitting(true)
            try {
                await onAnswerSubmit({
                    challenge_id: challenge.id,
                    selected_answer_index: index,
                    is_correct: index === challenge.correct_answer_id
                })
            } catch (error) {
                console.error("Failed to submit answer:", error)
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    // New function to request a hint
    const requestHint = async () => {
        if (hints.length >= 3) {
            return // Max hints reached
        }
        
        setIsLoadingHint(true)
        setHintError(null)
        
        try {
            const response = await post("challenges/get-hint", {
                challenge_id: challenge.id,
                hint_level: hintLevel
            })
            
            setHints([...hints, response.hint])
            setHintLevel(prev => prev + 1)
            setShowHints(true)
        } catch (err) {
            console.error("Failed to get hint:", err)
            setHintError(err.message || "Failed to load hint. Please try again.")
        } finally {
            setIsLoadingHint(false)
        }
    }

    const getDifficultyColor = () => {
        switch(challenge.difficulty) {
            case 'easy': return 'var(--success-500)';
            case 'medium': return 'var(--warning-500)';
            case 'hard': return 'var(--error-500)';
            default: return 'var(--primary-500)';
        }
    }

    const getOptionStyle = (index) => {
        const baseStyle = {
            padding: '1.25rem',
            margin: '0.75rem 0',
            borderRadius: '0.75rem',
            border: '2px solid var(--border-color)',
            cursor: selectedOption === null && !isSubmitting ? 'pointer' : 'default',
            transition: 'all 0.2s',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-primary)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '1rem',
            lineHeight: '1.5'
        }

        if (selectedOption === null) {
            return baseStyle
        }

        if (index === challenge.correct_answer_id) {
            return {
                ...baseStyle,
                borderColor: 'var(--success-500)',
                backgroundColor: 'var(--success-50)',
                color: 'var(--success-700)',
                fontWeight: '500'
            }
        }
        
        if (selectedOption === index && index !== challenge.correct_answer_id) {
            return {
                ...baseStyle,
                borderColor: 'var(--error-500)',
                backgroundColor: 'var(--error-50)',
                color: 'var(--error-700)'
            }
        }

        return {
            ...baseStyle,
            opacity: 0.5,
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)'
        }
    }

    const styles = {
        container: {
            maxWidth: '800px',
            margin: '0 auto',
            background: 'var(--card-bg)',
            borderRadius: '1rem',
            padding: '2rem',
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--card-border)'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px solid var(--border-color)'
        },
        difficulty: {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 1rem',
            borderRadius: '2rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            background: `${getDifficultyColor()}15`,
            color: getDifficultyColor(),
            border: `1px solid ${getDifficultyColor()}`
        },
        topic: {
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        title: {
            fontSize: '1.75rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
            lineHeight: '1.3'
        },
        question: {
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '0.75rem',
            borderLeft: '4px solid var(--primary-500)'
        },
        // New hint section styles
        hintSection: {
            marginBottom: '2rem',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '0.75rem',
            border: '1px dashed var(--primary-500)'
        },
        hintButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '2px solid var(--primary-500)',
            borderRadius: '2rem',
            color: 'var(--primary-500)',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '1rem'
        },
        hintButtonDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
            borderColor: 'var(--text-muted)',
            color: 'var(--text-muted)'
        },
        hintContainer: {
            marginTop: '1rem'
        },
        hintItem: {
            padding: '1rem',
            marginBottom: '0.75rem',
            background: 'var(--card-bg)',
            borderRadius: '0.5rem',
            borderLeft: '4px solid var(--primary-500)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            animation: 'slideIn 0.3s ease-out'
        },
        hintHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            color: 'var(--primary-600)',
            fontWeight: '600',
            fontSize: '0.9rem'
        },
        hintText: {
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            fontSize: '0.95rem'
        },
        hintLevel: {
            fontSize: '0.8rem',
            padding: '0.2rem 0.5rem',
            background: 'var(--primary-100)',
            borderRadius: '1rem',
            color: 'var(--primary-700)',
            marginLeft: 'auto'
        },
        hintError: {
            padding: '0.75rem',
            background: 'var(--error-50)',
            border: '1px solid var(--error-500)',
            borderRadius: '0.5rem',
            color: 'var(--error-700)',
            fontSize: '0.9rem',
            marginTop: '0.5rem'
        },
        hintSpinner: {
            width: '16px',
            height: '16px',
            border: '2px solid var(--primary-200)',
            borderTop: '2px solid var(--primary-600)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        },
        optionsContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '2rem'
        },
        optionLetter: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--primary-500)',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '600'
        },
        explanation: {
            marginTop: '2rem',
            padding: '2rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '1rem',
            borderLeft: '4px solid var(--primary-500)'
        },
        explanationTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-primary)',
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem'
        },
        explanationText: {
            color: 'var(--text-secondary)',
            lineHeight: '1.8',
            fontSize: '1rem',
            marginBottom: '1.5rem'
        },
        complexity: {
            display: 'flex',
            gap: '2rem',
            padding: '1rem',
            background: 'var(--card-bg)',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)'
        },
        complexityItem: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
        },
        complexityLabel: {
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        complexityValue: {
            fontSize: '1.1rem',
            fontWeight: '600',
            color: 'var(--text-primary)'
        },
        correctIcon: {
            color: 'var(--success-500)',
            fontWeight: 'bold',
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
        },
        incorrectIcon: {
            color: 'var(--error-500)',
            fontWeight: 'bold',
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
        }
    }

    const handleOptionHover = (e) => {
        if (selectedOption !== null || isSubmitting) return
        e.currentTarget.style.borderColor = 'var(--primary-500)'
        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
        e.currentTarget.style.transform = 'translateX(4px)'
    }

    const handleOptionLeave = (e) => {
        if (selectedOption !== null || isSubmitting) return
        e.currentTarget.style.borderColor = 'var(--border-color)'
        e.currentTarget.style.backgroundColor = 'var(--card-bg)'
        e.currentTarget.style.transform = 'none'
    }

    const optionLetters = ['A', 'B', 'C', 'D']

    const hintLevelNames = ['Subtle Hint', 'Specific Hint', 'Detailed Hint']

    return (
        <div style={styles.container} className="animate-slide-in">
            <div style={styles.header}>
                <span style={styles.difficulty}>
                    {challenge.difficulty === 'easy' && '🌱 '}
                    {challenge.difficulty === 'medium' && '📚 '}
                    {challenge.difficulty === 'hard' && '🚀 '}
                    {challenge.difficulty?.toUpperCase()}
                </span>
                <span style={styles.topic}>
                    <span>📌</span> {challenge.topic}
                </span>
            </div>
            
            <h3 style={styles.title}>{challenge.title}</h3>
            
            <div style={styles.question}>
                {challenge.question}
            </div>

            {/* New Hint Section */}
            {selectedOption === null && (
                <div style={styles.hintSection}>
                    <button
                        onClick={requestHint}
                        disabled={isLoadingHint || hints.length >= 3}
                        style={{
                            ...styles.hintButton,
                            ...((isLoadingHint || hints.length >= 3) && styles.hintButtonDisabled)
                        }}
                    >
                        {isLoadingHint ? (
                            <>
                                <span style={styles.hintSpinner}></span>
                                Generating hint...
                            </>
                        ) : hints.length >= 3 ? (
                            <>
                                <span>🔒</span>
                                No more hints available
                            </>
                        ) : (
                            <>
                                <span>💡</span>
                                Get {hintLevelNames[hintLevel - 1]}
                            </>
                        )}
                    </button>

                    {hintError && (
                        <div style={styles.hintError}>
                            ❌ {hintError}
                        </div>
                    )}

                    {hints.length > 0 && (
                        <div style={styles.hintContainer}>
                            {hints.map((hint, index) => (
                                <div key={index} style={styles.hintItem}>
                                    <div style={styles.hintHeader}>
                                        <span>💡 Hint {index + 1}</span>
                                        <span style={styles.hintLevel}>{hintLevelNames[index]}</span>
                                    </div>
                                    <div style={styles.hintText}>{hint}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            <div style={styles.optionsContainer}>
                {options.map((option, index) => (
                    <div 
                        key={index} 
                        style={getOptionStyle(index)}
                        onClick={() => handleOptionSelect(index)}
                        onMouseEnter={handleOptionHover}
                        onMouseLeave={handleOptionLeave}
                    >
                        <span style={styles.optionLetter}>{optionLetters[index]}</span>
                        <span style={{ flex: 1 }}>{option}</span>
                        
                        {selectedOption !== null && index === challenge.correct_answer_id && (
                            <span style={styles.correctIcon}>
                                ✓ <span style={{ fontSize: '0.9rem' }}>Correct</span>
                            </span>
                        )}
                        
                        {selectedOption === index && index !== challenge.correct_answer_id && (
                            <span style={styles.incorrectIcon}>
                                ✗ <span style={{ fontSize: '0.9rem' }}>Incorrect</span>
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {shouldShowExplanation && selectedOption !== null && (
                <div style={styles.explanation}>
                    <div style={styles.explanationTitle}>
                        <span>📚</span> Explanation
                    </div>
                    <p style={styles.explanationText}>{challenge.explanation}</p>
                    
                    {(challenge.time_complexity || challenge.space_complexity) && (
                        <div style={styles.complexity}>
                            {challenge.time_complexity && challenge.time_complexity !== 'N/A' && (
                                <div style={styles.complexityItem}>
                                    <span style={styles.complexityLabel}>⏱️ Time</span>
                                    <span style={styles.complexityValue}>{challenge.time_complexity}</span>
                                </div>
                            )}
                            {challenge.space_complexity && challenge.space_complexity !== 'N/A' && (
                                <div style={styles.complexityItem}>
                                    <span style={styles.complexityLabel}>💾 Space</span>
                                    <span style={styles.complexityValue}>{challenge.space_complexity}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {selectedOption !== null && selectedOption === challenge.correct_answer_id && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'var(--success-50)',
                    color: 'var(--success-700)',
                    borderRadius: '0.75rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    border: '1px solid var(--success-500)',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    🎉 Correct! Great job! Keep up the good work!
                </div>
            )}
        </div>
    )
}