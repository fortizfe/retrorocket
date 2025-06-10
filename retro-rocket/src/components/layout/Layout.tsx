import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    className?: string;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    showHeader = false,
    className = ''
}) => {
    return (
        <div className={`min-h-screen ${className}`}>
            {showHeader && (
                <header className="bg-white shadow-sm border-b">
                    <div className="container mx-auto px-4 py-4">
                        <h1 className="text-xl font-bold">RetroRocket</h1>
                    </div>
                </header>
            )}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
};

export default Layout;