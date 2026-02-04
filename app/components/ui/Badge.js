import React from 'react';

export const Badge = ({ children, variant = 'pending', className = '', ...props }) => {
    return (
        <span className={`badge badge-${variant} ${className}`} {...props}>
            {children}
        </span>
    );
};

export const StatusBadge = ({ status }) => {
    const statusMap = {
        'P': { variant: 'pending', text: 'Pendiente' },
        'A': { variant: 'completed', text: 'Aprobado' },
        'C': { variant: 'completed', text: 'Completado' },
        'R': { variant: 'cancelled', text: 'Rechazado' },
        'PENDIENTE': { variant: 'pending', text: 'Pendiente' },
        'COMPLETADO': { variant: 'completed', text: 'Completado' }
    };

    const current = statusMap[status] || { variant: 'pending', text: status };

    return (
        <Badge variant={current.variant}>
            <span className="badge-dot" style={{ marginRight: '4px' }}></span>
            {current.text}
        </Badge>
    );
};
