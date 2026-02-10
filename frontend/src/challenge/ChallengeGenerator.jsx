import "react"
import { useState, useEffect } from "react"
import {MCQChallenge} from "./MCQChallenge"

export function ChallengeGenerator(){
    const [challenge, setChallenge] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [difficulty, setDifficulty] = useState("easy")
    const [quota, setQuota] = useState(null)

    const fetchQuota = async () => {}
    const generateChallenge = async () => {}
    const getNextResetTime = () => {}
    return <div className="challenge-container">
        <h2>Coding Challenge Generator</h2>
        <div className="quota-display">
            <p>Challenges remaining today: {quota?.quota_remaining || 0}</p>
            {quota?.quota_remaining === 0 && (
                <p>Next Reset: {0}</p>
            )}
        </div>
        <div className="difficulty-selecrtor">
            <label htmlFor="difficulty">Select Difficulty</label>
            <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={isLoading}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
            </select>
        </div>
    </div>
}