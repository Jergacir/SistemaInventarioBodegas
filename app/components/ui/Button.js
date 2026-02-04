import React from 'react';

export const Button = ({
    children,
    variant = 'primary',
    size = 'default',
    className = '',
    disabled = false,
    isLoading = false,
    icon = null,
    type = 'button',
    onClick,
    ...props
}) => {
    const baseClass = 'btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = size !== 'default' ? `btn-${size}` : '';

    return (
        <button
            type={type}
            className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
            disabled={disabled || isLoading}
            onClick={onClick}
            {...props}
        >
            {isLoading && <div className="spinner spinner-sm mr-2" />}
            {!isLoading && icon && <span className="btn-icon-wrapper mr-2">{icon}</span>}
            {children}
        </button>
    );
};
