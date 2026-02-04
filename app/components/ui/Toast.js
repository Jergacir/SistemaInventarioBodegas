'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icons } from '../ui/Icons';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type, title, message, duration = 5000) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const toast = { id, type, title, message };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, [removeToast]);

    const success = useCallback((title, message) => addToast('success', title, message), [addToast]);
    const error = useCallback((title, message) => addToast('error', title, message), [addToast]);
    const warning = useCallback((title, message) => addToast('warning', title, message), [addToast]);
    const info = useCallback((title, message) => addToast('info', title, message), [addToast]);

    // Universal helper: showToast(title, message, type)
    const showToast = useCallback((title, message, type = 'info') => {
        return addToast(type, title, message);
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ success, error, warning, info, showToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
            ))}
        </div>
    );
};

const Toast = ({ toast, onClose }) => {
    const iconMap = {
        success: Icons.Check,
        error: Icons.Close,
        warning: Icons.Warning,
        info: Icons.Bell
    };

    const IconComponent = iconMap[toast.type] || Icons.Bell;

    return (
        <div className={`toast toast-${toast.type}`}>
            <IconComponent className="toast-icon" size={20} />
            <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                {toast.message && <p className="toast-message">{toast.message}</p>}
            </div>
            <button className="toast-close" onClick={onClose} aria-label="Cerrar">
                <Icons.Close size={16} />
            </button>
        </div>
    );
};
