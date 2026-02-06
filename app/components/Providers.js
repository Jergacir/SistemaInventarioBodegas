'use client';

import { ModalProvider } from './ui/Modal';
import { ToastProvider } from './ui/Toast';

export function Providers({ children }) {
    return (
        <ToastProvider>
            <ModalProvider>
                {children}
            </ModalProvider>
        </ToastProvider>
    );
}
