import React from 'react';

export default function Layout({ children, currentPageName }) {
    // No layout wrapper needed - each page includes its own sidebar
    return <>{children}</>;
}