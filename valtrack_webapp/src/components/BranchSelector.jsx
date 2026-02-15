import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useBranch } from '../context/BranchContext';

export default function BranchSelector({ className = '' }) {
    const { selectedBranch, changeBranch, branches, loading } = useBranch();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (branchId) => {
        changeBranch(branchId);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors shadow-sm min-w-[180px] justify-between"
            >
                <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span className="truncate max-w-[140px]">
                        {loading ? 'Loading...' : (selectedBranch?.name || 'All Branches')}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="p-1">
                        <button
                            onClick={() => handleSelect(null)}
                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between rounded-md transition-colors ${!selectedBranch ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span>All Branches</span>
                            {!selectedBranch && <Check className="w-4 h-4" />}
                        </button>

                        <div className="h-px bg-gray-100 my-1 mx-2" />

                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => handleSelect(branch.id)}
                                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between rounded-md transition-colors ${selectedBranch?.id === branch.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="truncate pr-2">{branch.name}</span>
                                    {selectedBranch?.id === branch.id && <Check className="w-4 h-4 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
