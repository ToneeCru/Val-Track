import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    const modalContent = (
        <div className="fixed inset-0 z-[999] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity"
                    onClick={onClose}
                />

                <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} transform transition-all`}>
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 className="text-lg font-semibold" style={{ color: '#232323' }}>{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}