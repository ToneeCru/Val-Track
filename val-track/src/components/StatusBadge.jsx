import React from 'react';
import { Bell, Search, Calendar } from 'lucide-react';

export default function Topbar({ title, subtitle }) {
    const session = JSON.parse(localStorage.getItem('valtrack_session') || '{}');
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <header className="bg-white border-b border-gray-100 px-8 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#232323' }}>{title}</h1>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{currentDate}</span>
                    </div>

                    <div className="h-8 w-px bg-gray-200" />

                    <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <Bell className="w-5 h-5 text-gray-500" />
                        <span
                            className="absolute top-1 right-1 w-2 h-2 rounded-full"
                            style={{ backgroundColor: '#FF2B2B' }}
                        />
                    </button>

                    <div className="flex items-center gap-3 pl-2">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm"
                            style={{ backgroundColor: '#00104A' }}
                        >
                            {session.name?.charAt(0) || 'U'}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}