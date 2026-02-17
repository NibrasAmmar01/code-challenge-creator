import ClerkProviderWithRoutes from "./auth/ClerkProviderWithRoutes"
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from "./layout/Layout"
import { ChallengeGenerator } from "./challenge/ChallengeGenerator"
import { HistoryPanel } from "./history/HistoryPanel"
import { StatsDashboard } from "./stats/StatsDashboard"
import { AuthenticationPage } from "./auth/AuthenticationPage"
import { ChallengeDetails } from "./pages/ChallengeDetails" // Add this import
import './styles/theme.css'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <ClerkProviderWithRoutes>
        <Routes>
          <Route path="/sign-in/*" element={<AuthenticationPage />} />
          <Route path="/sign-up" element={<AuthenticationPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<ChallengeGenerator />} />
            <Route path="/history" element={<HistoryPanel />} />
            <Route path="/stats" element={<StatsDashboard />} />
            <Route path="/challenge/:id" element={<ChallengeDetails />} /> {/* Add this route */}
          </Route>
        </Routes>
      </ClerkProviderWithRoutes>
    </ThemeProvider>
  )
}

export default App