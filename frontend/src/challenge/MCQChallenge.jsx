import "react"
import { useState } from "react"

export function MCQChallenge({ challenge, showExplanation = false, onAnswerSubmit }) {
    const [selectedOption, setSelectedOption] = useState(null)
    const [shouldShowExplanation, setShouldShowExplanation] = useState(showExplanation)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const options = typeof challenge.options === "string"
        ? JSON.parse(challenge.options)
        : challenge.options

    const handleOptionSelect = async (index) => {
        if (selectedOption !== null || isSubmitting) return
        
        setSelectedOption(index)
        setShouldShowExplanation(true)
        
        // Submit answer to backend for validation
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

    const getOptionStyle = (index) => {
        const baseStyle = {
            padding: '1rem',
            margin: '0.5rem 0',
            borderRadius: '8px',
            border: '2px solid #e0e0e0',
            cursor: selectedOption === null && !isSubmitting ? 'pointer' : 'default',
            transition: 'all 0.3s',
            backgroundColor: 'white',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        }

        if (selectedOption === null) {
            return baseStyle
        }

        if (index === challenge.correct_answer_id) {
            return {
                ...baseStyle,
                borderColor: '#2ecc71',
                backgroundColor: '#e8f8f5',
                color: '#27ae60',
                fontWeight: '500'
            }
        }
        
        if (selectedOption === index && index !== challenge.correct_answer_id) {
            return {
                ...baseStyle,
                borderColor: '#e74c3c',
                backgroundColor: '#fdeded',
                color: '#c0392b'
            }
        }

        return {
            ...baseStyle,
            opacity: 0.6,
            borderColor: '#e0e0e0',
            backgroundColor: '#f9f9f9'
        }
    }

    // Styles
    const styles = {
        container: {
            maxWidth: '800px',
            margin: '0 auto',
            padding: '2rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        },
        difficulty: {
            color: '#7f8c8d',
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '0.5rem'
        },
        title: {
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '1.5rem',
            lineHeight: '1.4'
        },
        optionsContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            marginBottom: '1.5rem'
        },
        optionLetter: {
            display: 'inline-block',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#4a90e2',
            color: 'white',
            textAlign: 'center',
            lineHeight: '24px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            marginRight: '0.75rem'
        },
        explanation: {
            marginTop: '2rem',
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            borderLeft: '4px solid #4a90e2'
        },
        explanationTitle: {
            color: '#2c3e50',
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '0.75rem'
        },
        explanationText: {
            color: '#34495e',
            lineHeight: '1.6',
            fontSize: '1rem'
        },
        correctIcon: {
            color: '#2ecc71',
            fontWeight: 'bold',
            marginLeft: 'auto'
        },
        incorrectIcon: {
            color: '#e74c3c',
            fontWeight: 'bold',
            marginLeft: 'auto'
        }
    }

    // Hover handlers - removed unused index parameter
    const handleOptionHover = (e) => {
        if (selectedOption !== null || isSubmitting) return
        e.currentTarget.style.borderColor = '#4a90e2'
        e.currentTarget.style.backgroundColor = '#f0f7ff'
        e.currentTarget.style.transform = 'translateX(4px)'
    }

    const handleOptionLeave = (e) => {
        if (selectedOption !== null || isSubmitting) return
        e.currentTarget.style.borderColor = '#e0e0e0'
        e.currentTarget.style.backgroundColor = 'white'
        e.currentTarget.style.transform = 'none'
    }

    const optionLetters = ['A', 'B', 'C', 'D']

    return (
        <div style={styles.container}>
            <p style={styles.difficulty}>
                <strong>Difficulty:</strong> {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1) || 'N/A'}
            </p>
            
            <h3 style={styles.title}>{challenge.title}</h3>
            
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
                            <span style={styles.correctIcon}>✓ Correct</span>
                        )}
                        
                        {selectedOption === index && index !== challenge.correct_answer_id && (
                            <span style={styles.incorrectIcon}>✗ Incorrect</span>
                        )}
                    </div>
                ))}
            </div>

            {shouldShowExplanation && selectedOption !== null && (
                <div style={styles.explanation}>
                    <h4 style={styles.explanationTitle}>📚 Explanation</h4>
                    <p style={styles.explanationText}>{challenge.explanation}</p>
                    
                    {challenge.time_complexity && (
                        <p style={{ marginTop: '1rem', color: '#7f8c8d' }}>
                            <strong>⏱️ Time Complexity:</strong> {challenge.time_complexity}
                        </p>
                    )}
                    
                    {challenge.space_complexity && (
                        <p style={{ color: '#7f8c8d' }}>
                            <strong>💾 Space Complexity:</strong> {challenge.space_complexity}
                        </p>
                    )}
                </div>
            )}

            {selectedOption !== null && selectedOption === challenge.correct_answer_id && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: '500'
                }}>
                    🎉 Correct! Great job!
                </div>
            )}
        </div>
    )
}