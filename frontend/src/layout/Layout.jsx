import "react"
import { useState, useEffect, useCallback } from "react"
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react"
import { Outlet, Link, Navigate } from "react-router-dom"
import { useApi } from "../utils/api"
import { ThemeToggle } from "../components/ThemeToggle"

export function Layout(){
    const [quota, setQuota] = useState(null)
    const { get } = useApi()

    const fetchQuota = useCallback(async () => {
        try {
            const quotaData = await get("challenges/quota")
            setQuota(quotaData)
        } catch (err) {
            console.error("Failed to fetch quota:", err)
        }
    }, [get])

    useEffect(() => {
        let isMounted = true
        
        const loadQuota = async () => {
            await fetchQuota()
        }
        
        loadQuota()
        
        const interval = setInterval(() => {
            if (isMounted) {
                fetchQuota()
            }
        }, 60000)
        
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [fetchQuota])

    const styles = {
        appLayout: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-primary)',
            transition: 'background-color 0.3s ease'
        },
        appHeader: {
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            padding: '0.75rem 2rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        headerContent: {
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        titleSection: {
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem'
        },
        h1: {
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'white'
        },
        credits: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '0.4rem 1rem',
            borderRadius: '30px',
            fontSize: '0.9rem',
            fontWeight: '500',
            color: 'white'
        },
        creditIcon: {
            fontSize: '1.1rem'
        },
        creditNumber: {
            fontWeight: '700',
            marginRight: '0.25rem'
        },
        creditWarning: {
            backgroundColor: 'rgba(255, 193, 7, 0.2)',
            color: '#ffc107'
        },
        creditDanger: {
            backgroundColor: 'rgba(220, 53, 69, 0.2)',
            color: '#dc3545'
        },
        nav: {
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center'
        },
        link: {
            color: 'white',
            textDecoration: 'none',
            fontWeight: '500',
            padding: '0.5rem 0',
            borderBottom: '2px solid transparent',
            transition: 'border-color 0.3s'
        },
        main: {
            flex: 1,
            maxWidth: '1200px',
            width: '100%',
            margin: '2rem auto',
            padding: '0 2rem',
            backgroundColor: 'transparent'
        }
    }

    const getCreditStyle = () => {
        if (!quota) return {}
        if (quota.quota_remaining <= 5) return styles.creditDanger
        if (quota.quota_remaining <= 15) return styles.creditWarning
        return {}
    }

    const getCreditIcon = () => {
        if (!quota) return '⚡'
        if (quota.quota_remaining <= 0) return '🚫'
        if (quota.quota_remaining <= 5) return '⚠️'
        if (quota.quota_remaining <= 15) return '⚡'
        return '✨'
    }

    return (
        <div style={styles.appLayout}>
            <header style={styles.appHeader}>
                <div style={styles.headerContent}>
                    <div style={styles.titleSection}>
                        <h1 style={styles.h1}>Code Challenge Generator</h1>
                        <SignedIn>
                            {quota && (
                                <div style={{ ...styles.credits, ...getCreditStyle() }}>
                                    <span style={styles.creditIcon}>{getCreditIcon()}</span>
                                    <span>
                                        <span style={styles.creditNumber}>{quota.quota_remaining}</span>
                                        / {quota.total_quota || 50} remaining
                                    </span>
                                </div>
                            )}
                        </SignedIn>
                    </div>
                    <nav style={styles.nav}>
                        <SignedIn>
                            <ThemeToggle />
                            <Link 
                                to="/" 
                                style={styles.link}
                                onMouseEnter={(e) => e.target.style.borderBottom = '2px solid white'}
                                onMouseLeave={(e) => e.target.style.borderBottom = '2px solid transparent'}
                            >
                                Generate
                            </Link>
                            <Link 
                                to="/history" 
                                style={styles.link}
                                onMouseEnter={(e) => e.target.style.borderBottom = '2px solid white'}
                                onMouseLeave={(e) => e.target.style.borderBottom = '2px solid transparent'}
                            >
                                History
                            </Link>
                            <Link 
                                to="/stats" 
                                style={styles.link}
                                onMouseEnter={(e) => e.target.style.borderBottom = '2px solid white'}
                                onMouseLeave={(e) => e.target.style.borderBottom = '2px solid transparent'}
                            >
                                Stats
                            </Link>
                            <UserButton />
                        </SignedIn>
                    </nav>
                </div>
            </header>
            <main style={styles.main}>
                <SignedOut>
                    <Navigate to="/sign-in" replace />
                </SignedOut>
                <SignedIn>
                    <Outlet />
                </SignedIn>
            </main>
        </div>
    )
}