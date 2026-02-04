import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
    return (
        <div className={`card ${className}`} {...props}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-header ${className}`} {...props}>
            {children}
        </div>
    );
};

export const CardTitle = ({ children, className = '', ...props }) => {
    return (
        <h3 className={`card-title ${className}`} {...props}>
            {children}
        </h3>
    );
};

export const CardBody = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-body ${className}`} {...props}>
            {children}
        </div>
    );
};

export const CardFooter = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-footer ${className}`} {...props}>
            {children}
        </div>
    );
};

export const StatsCard = ({ title, value, icon, change, changeType, iconColor = 'primary', ...props }) => {
    return (
        <div className="stats-card" {...props}>
            <div className={`stats-icon ${iconColor}`}>
                {icon}
            </div>
            <div className="stats-content">
                <div className="stats-label">{title}</div>
                <div className="stats-value">{value}</div>
                {change && (
                    <div className={`stats-change ${changeType}`}>
                        {change}
                    </div>
                )}
            </div>
        </div>
    );
};
