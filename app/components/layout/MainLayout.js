'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MockData } from '../../lib/mockData'; // Ensure we have access to MockData for initial state

export const MainLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Hydrate user from session storage or mock
        // This mirrors App.init() logic
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('currentUser');
            if (saved) {
                setCurrentUser(JSON.parse(saved));
            } else {
                // Fallback for dev if needed, or redirect to login
                // For now, let's assume we might need to handle login check
            }
        }
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="app-container">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} user={currentUser} />

            <div className="main-content">
                <Header
                    toggleSidebar={toggleSidebar}
                    user={currentUser}
                />

                <main className="page-container" id="page-container">
                    {children}
                </main>

                {/* Footer Credits */}
                <footer style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    borderTop: '1px solid var(--border-light)',
                    marginTop: 'auto',
                    background: 'var(--bg-primary)'
                }}>
                    Developed by Andy Ñañez Ramirez
                </footer>
            </div>
        </div>
    );
};
