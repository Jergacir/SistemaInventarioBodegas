'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icons } from '../ui/Icons';

const ModalContext = createContext(null);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

export const ModalProvider = ({ children }) => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: '',
        content: null,
        size: 'default', // 'sm', 'default', 'lg'
        onClose: null
    });

    const openModal = useCallback((titleOrOptions, content, size = 'default', onClose) => {
        // Support both object and positional arguments
        if (typeof titleOrOptions === 'object' && titleOrOptions !== null && !React.isValidElement(titleOrOptions)) {
            const { title, content: c, size: s = 'default', onClose: oc } = titleOrOptions;
            setModalState({
                isOpen: true,
                title,
                content: c,
                size: s,
                onClose: oc
            });
        } else {
            // Positional arguments: (title, content, size?, onClose?)
            setModalState({
                isOpen: true,
                title: titleOrOptions,
                content: content,
                size: size,
                onClose: onClose
            });
        }
    }, []);

    const closeModal = useCallback(() => {
        if (modalState.onClose) {
            modalState.onClose();
        }
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, [modalState.onClose]);

    return (
        <ModalContext.Provider value={{ openModal, closeModal, isOpen: modalState.isOpen }}>
            {children}
            <ModalOverlay modal={modalState} onClose={closeModal} />
        </ModalContext.Provider>
    );
};

const ModalOverlay = ({ modal, onClose }) => {
    if (!modal.isOpen) return null;

    const sizeClass = modal.size !== 'default' ? `modal-${modal.size}` : '';

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay backdrop-blur-sm active" onClick={handleOverlayClick}>
            <div className={`modal ${sizeClass}`} role="dialog" aria-modal="true">
                <div className="modal-header">
                    <h3 className="modal-title">{modal.title}</h3>
                    <button className="modal-close" onClick={onClose} aria-label="Cerrar">
                        <Icons.Close size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    {typeof modal.content === 'string' ? (
                        <div dangerouslySetInnerHTML={{ __html: modal.content }} />
                    ) : (
                        modal.content
                    )}
                </div>
            </div>
        </div>
    );
};
