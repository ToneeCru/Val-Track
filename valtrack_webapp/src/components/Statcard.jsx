import React from 'react';

export default function StatCard({ title, value, icon: Icon, trend = '', trendUp = false, color = '#56CBF9', onClick }) {
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">{title}</p>
                    <p className="text-3xl font-bold" style={{ color: '#232323' }}>{value}</p>
                    {trend && (
                        <p className={`text-sm mt-2 flex items-center gap-1 ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                            {trendUp ? '↑' : '↓'} {trend}
                        </p>
                    )}
                </div>
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}15` }}
                >
                    <Icon className="w-6 h-6" style={{ color }} />
                </div>
            </div>
        </div>
    );
}