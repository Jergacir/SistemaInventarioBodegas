'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Icons } from '../ui/Icons';
import { Badge } from '../ui/Badge';

export const Sidebar = ({ isOpen, toggleSidebar, user }) => {
    const pathname = usePathname();
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        // Get saved theme or default to light
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'Home', path: '/dashboard' },
        { id: 'products', label: 'Productos', icon: 'Items', path: '/products', roles: ['ADMIN', 'SUPERVISOR'] },
        { id: 'inventory', label: 'Inventario', icon: 'Inventory', path: '/inventory' },
        { id: 'entries', label: 'Entradas', icon: 'Check', path: '/entries' },
        { id: 'requests', label: 'Solicitudes', icon: 'File', path: '/requests', roles: ['ADMIN', 'SUPERVISOR'] },
        // { id: 'transfers', label: 'Transferencias', icon: 'Transfers', path: '/transfers' }, // Disabled per user request
        { id: 'exits', label: 'Salidas', icon: 'Truck', path: '/exits' },
        { id: 'history', label: 'Historial', icon: 'Movements', path: '/history', roles: ['ADMIN', 'SUPERVISOR'] },
        { id: 'users', label: 'Usuarios', icon: 'Users', path: '/users', roles: ['ADMIN'] },
        { id: 'settings', label: 'Configuración', icon: 'Settings', path: '/settings' }
    ];

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={toggleSidebar}></div>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
                <div className="sidebar-header" style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                    <Image
                        src="/assets/img/eneragro-logo.png"
                        alt="Eneragro"
                        width={180}
                        height={60}
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                        priority
                    />
                </div>

                <div className="sidebar-nav">
                    {navItems.map(item => {
                        // Role check
                        if (item.roles && user && !item.roles.includes(user.rol)) {
                            return null;
                        }

                        const Icon = Icons[item.icon] || Icons.Box;
                        const isActive = pathname === item.path;

                        return (
                            <Link
                                key={item.id}
                                href={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                    if (window.innerWidth <= 1024) {
                                        toggleSidebar();
                                    }
                                }}
                            >
                                <Icon className="nav-icon" size={20} />
                                <span>{item.label}</span>
                                {item.id === 'transfers' && (
                                    <span id="pending-transfers-badge" className="nav-badge" style={{ display: 'none' }}>0</span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="sidebar-footer">
                    <button
                        className="theme-toggle"
                        id="theme-toggle"
                        onClick={toggleTheme}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            width: '100%',
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                            borderRadius: 'var(--radius-default)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {theme === 'dark' ? (
                            <>
                                <Icons.Sun size={18} className="theme-icon-dark" />
                                <span>Tema Claro</span>
                            </>
                        ) : (
                            <>
                                <Icons.Moon size={18} className="theme-icon-light" />
                                <span>Tema Oscuro</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
};
