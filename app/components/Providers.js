'use client';

import { ModalProvider } from './ui/Modal';
import { ToastProvider } from './ui/Toast';

export function Providers({ children }) {
    return (
        <ModalProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </ModalProvider>
    );
}
