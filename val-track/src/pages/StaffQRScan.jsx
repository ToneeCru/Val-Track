import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import {
    QrCode,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    MapPin,
    RotateCcw
} from 'lucide-react';

export default function StaffQRScan() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();
    const [session, setSession] = useState(null);

    // Areas State
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [areaCounts, setAreaCounts] = useState({}); // { areaId: count }

    // Simulation / Scanning State
    // Using mock patrons for demo purposes as in original file
    const [patrons, setPatrons] = useState([
        { id: 'P-2024-001', name: 'Juan Dela Cruz' },
        { id: 'P-2024-002', name: 'Maria Santos' },
        { id: 'P-2024-003', name: 'Pedro Reyes' },
        { id: 'P-2024-004', name: 'Ana Garcia' },
        { id: 'P-2024-005', name: 'Carlos Rodriguez' },
    ]);
    const [activePatrons, setActivePatrons] = useState([]); // List of attendance records
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanHistory, setScanHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const sessionData = localStorage.getItem('valtrack_session');
        if (!sessionData) {
            navigate('/Home');
            return;
        }
        const parsed = JSON.parse(sessionData);
        if (parsed.role !== 'staff') {
            navigate('/Home');
            return;
        }
        setSession(parsed);
    }, [navigate]);

    // Fetch Areas and Data when branch changes
    useEffect(() => {
        if (!selectedBranch?.id) return;
        fetchAreasAndData();
    }, [selectedBranch]);

    // Refresh data periodically or on selection change
    useEffect(() => {
        if (selectedArea) {
            fetchAttendanceData();
        }
    }, [selectedArea]);

    const fetchAreasAndData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Areas
            // Fetch floors first to link areas (or use view if created, but sticking to tables)
            const { data: floors } = await supabase.from('floors').select('id').eq('branch_id', selectedBranch.id);
            const floorIds = floors?.map(f => f.id) || [];

            let fetchedAreas = [];
            if (floorIds.length > 0) {
                const { data: areaData } = await supabase
                    .from('areas')
                    .select('*, floors(label, floor_number)')
                    .in('floor_id', floorIds)
                    .order('name');
                fetchedAreas = areaData || [];
            }
            setAreas(fetchedAreas);

            // Set default selected area if not set but available
            if (fetchedAreas.length > 0 && !selectedArea) {
                setSelectedArea(fetchedAreas[0]);
            } else if (fetchedAreas.length > 0 && selectedArea) {
                // Verify selected area is still valid
                if (!fetchedAreas.find(a => a.id === selectedArea.id)) {
                    setSelectedArea(fetchedAreas[0]);
                }
            }

            // 2. Fetch Recent Scan History (Branch Level)
            const { data: logs } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('module', 'QR Scan')
                .eq('branch_id', selectedBranch.id)
                .order('timestamp', { ascending: false })
                .limit(10);
            setScanHistory(logs || []);

        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAttendanceData = async () => {
        if (!areas.length) return;

        try {
            // 1. Get counts for ALL areas in this branch (to show in selector)
            const areaIds = areas.map(a => a.id);
            const { data: allActive } = await supabase
                .from('area_attendance')
                .select('area_id')
                .eq('status', 'active')
                .in('area_id', areaIds);

            const counts = {};
            areas.forEach(a => counts[a.id] = 0);
            allActive?.forEach(att => {
                if (counts[att.area_id] !== undefined) counts[att.area_id]++;
            });
            setAreaCounts(counts);

            // 2. Get active patrons details for logic checking
            // We need to know who is active in ANY area of this branch to prevent double entry or allow moving
            // Actually, usually user exits one area to enter another.
            // Or we check if patron is active in THIS area to toggle Check-out.

            const { data: activeRecs } = await supabase
                .from('area_attendance')
                .select('*')
                .eq('status', 'active')
                .in('area_id', areaIds);

            setActivePatrons(activeRecs || []);

        } catch (error) {
            console.error("Error fetching attendance:", error);
        }
    };

    const handleDemoScan = async (patron) => {
        if (!selectedArea) {
            toast.error("Please select an area first");
            return;
        }

        setIsScanning(true);
        setScanResult(null);

        try {
            // Check if patron is active in ANY area of this branch
            const existingRecord = activePatrons.find(a => a.patron_id === patron.id);

            if (existingRecord) {
                // If active in CURRENT area -> Check OUT
                if (existingRecord.area_id === selectedArea.id) {
                    const { error: updateError } = await supabase
                        .from('area_attendance')
                        .update({
                            status: 'exited',
                            exit_time: new Date().toISOString()
                        })
                        .eq('id', existingRecord.id);

                    if (updateError) throw updateError;

                    await supabase.from('audit_logs').insert({
                        user_name: session.name || 'Staff',
                        action: 'Patron Check-Out',
                        module: 'QR Scan',
                        details: `${patron.name} (${patron.id}) checked OUT from ${selectedArea.name}`,
                        timestamp: new Date().toISOString(),
                        branch_id: selectedBranch.id
                    });

                    setScanResult({
                        type: 'success',
                        action: 'out',
                        message: `${patron.name} checked OUT successfully`,
                        patron: patron
                    });
                    toast.success('Check-out successful');
                } else {
                    // Active in DIFFERENT area -> Error or Auto-Transfer?
                    // Typically error: "User is currently in [Other Area]. Please check out there first."
                    const otherArea = areas.find(a => a.id === existingRecord.area_id);
                    const otherAreaName = otherArea ? otherArea.name : 'another area';

                    setScanResult({
                        type: 'error',
                        message: `Patron is currently checked in at ${otherAreaName}. Please check out there first.`,
                        patron: patron
                    });
                    toast.error(`Already in ${otherAreaName}`);
                }
            } else {
                // Not active -> Check IN
                // Check Capacity
                const currentCount = areaCounts[selectedArea.id] || 0;
                if (currentCount >= selectedArea.capacity) {
                    setScanResult({
                        type: 'error',
                        message: `Capacity reached for ${selectedArea.name}. Cannot check in.`,
                        patron: patron
                    });
                    toast.error('Area capacity reached');
                    return;
                }

                const { error: insertError } = await supabase
                    .from('area_attendance')
                    .insert({
                        patron_name: patron.name,
                        patron_id: patron.id,
                        area_id: selectedArea.id,
                        status: 'active',
                        entry_time: new Date().toISOString()
                    });

                if (insertError) throw insertError;

                await supabase.from('audit_logs').insert({
                    user_name: session.name || 'Staff',
                    action: 'Patron Check-In',
                    module: 'QR Scan',
                    details: `${patron.name} (${patron.id}) checked IN to ${selectedArea.name}`,
                    timestamp: new Date().toISOString(),
                    branch_id: selectedBranch.id
                });

                setScanResult({
                    type: 'success',
                    action: 'in',
                    message: `${patron.name} checked IN successfully`,
                    patron: patron
                });
                toast.success('Check-in successful');
            }

            // Refresh data
            fetchAttendanceData();
            // Also refresh logs
            const { data: logs } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('module', 'QR Scan')
                .eq('branch_id', selectedBranch.id)
                .order('timestamp', { ascending: false })
                .limit(10);
            setScanHistory(logs || []);

        } catch (error) {
            console.error('Scan operation error:', error);
            toast.error('Failed to process scan');
        } finally {
            setIsScanning(false);
        }
    };

    if (!session) return null;

    const currentCount = selectedArea ? (areaCounts[selectedArea.id] || 0) : 0;
    const maxCapacity = selectedArea?.capacity || 0;
    const capacityPercentage = maxCapacity > 0 ? (currentCount / maxCapacity) * 100 : 0;
    const isNearCapacity = capacityPercentage >= 90;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="staff" />

            <div className="ml-64">
                <Topbar title="Patron QR Scan" subtitle="Automated check-in/check-out system" />

                <main className="p-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Area Selection & Status */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                {/* Area Selector */}
                                <div className="bg-white rounded-xl p-6 border border-gray-100 flex flex-col h-full max-h-[500px]">
                                    <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-blue-600" /> Select Area
                                    </h3>
                                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
                                        {areas.length > 0 ? areas.map((area) => (
                                            <button
                                                key={area.id}
                                                onClick={() => setSelectedArea(area)}
                                                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${selectedArea?.id === area.id
                                                        ? 'bg-[#00104A] text-white shadow-md'
                                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="font-medium block">{area.name}</span>
                                                        <span className={`text-xs ${selectedArea?.id === area.id ? 'text-blue-200' : 'text-gray-400'}`}>
                                                            {area.floors?.label || `Floor ${area.floors?.floor_number}`}
                                                        </span>
                                                    </div>
                                                    <span className={`text-sm font-mono ${selectedArea?.id === area.id ? 'text-blue-200' : 'text-gray-500'}`}>
                                                        {areaCounts[area.id] || 0}/{area.capacity}
                                                    </span>
                                                </div>
                                            </button>
                                        )) : (
                                            <div className="text-center text-gray-400 py-10 italic">No areas available</div>
                                        )}
                                    </div>
                                </div>

                                {/* Current Area Status */}
                                <div className="bg-white rounded-xl p-6 border border-gray-100 lg:col-span-2 flex flex-col justify-between">
                                    {selectedArea ? (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg text-gray-900">{selectedArea.name} Status</h3>
                                                    <p className="text-sm text-gray-500">{selectedArea.floors?.label || `Floor ${selectedArea.floors?.floor_number}`}</p>
                                                </div>
                                                {isNearCapacity && (
                                                    <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                                                        <AlertCircle className="w-3 h-3" /> Near Capacity
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="text-center p-6 rounded-xl bg-blue-50">
                                                    <p className="text-3xl font-bold text-blue-600">{currentCount}</p>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Inside</p>
                                                </div>
                                                <div className="text-center p-6 rounded-xl bg-green-50">
                                                    <p className="text-3xl font-bold text-green-600">{maxCapacity}</p>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Capacity</p>
                                                </div>
                                                <div className={`text-center p-6 rounded-xl ${isNearCapacity ? 'bg-red-50' : 'bg-gray-50'}`}>
                                                    <p className={`text-3xl font-bold ${isNearCapacity ? 'text-red-600' : 'text-gray-600'}`}>
                                                        {Math.max(0, maxCapacity - currentCount)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Available</p>
                                                </div>
                                            </div>

                                            <div className="mt-auto">
                                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                                    <span>Occupancy Rate</span>
                                                    <span>{Math.round(capacityPercentage)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                                    <div
                                                        className="h-full transition-all duration-500 ease-out"
                                                        style={{
                                                            width: `${Math.min(capacityPercentage, 100)}%`,
                                                            backgroundColor: isNearCapacity ? '#FF2B2B' : '#56CBF9'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-400">
                                            Select an area to view status
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Scan Result */}
                            {scanResult && (
                                <div className={`mb-8 p-6 rounded-xl border-l-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ${scanResult.type === 'error' ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scanResult.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {scanResult.type === 'error' ? <AlertCircle className="w-6 h-6" /> :
                                                scanResult.action === 'in' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />
                                            }
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${scanResult.type === 'error' ? 'text-red-900' : 'text-green-900'}`}>{scanResult.message}</h4>
                                            <p className="text-sm opacity-80">{scanResult.patron.name} ({scanResult.patron.id})</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* QR Codes Grid */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <QrCode className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">QR Code Simulation</h3>
                                        <p className="text-sm text-gray-500">Tap to simulate scan in <strong>{selectedArea?.name || '...'}</strong></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {patrons.map((patron) => {
                                        // Check status in ANY area, but highlight specifically for current area
                                        const record = activePatrons.find(a => a.patron_id === patron.id);
                                        const isInCurrentArea = record && selectedArea && record.area_id === selectedArea.id;
                                        const isInOtherArea = record && selectedArea && record.area_id !== selectedArea.id;

                                        return (
                                            <button
                                                key={patron.id}
                                                onClick={() => handleDemoScan(patron)}
                                                disabled={isScanning || !selectedArea}
                                                className={`p-4 rounded-xl border-2 text-center transition-all hover:shadow-md ${isInCurrentArea ? 'border-green-500 bg-green-50' :
                                                        isInOtherArea ? 'border-amber-300 bg-amber-50 opacity-80' :
                                                            'border-gray-200 hover:border-blue-300'
                                                    } ${isScanning || !selectedArea ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className={`w-16 h-16 mx-auto mb-3 rounded-lg flex items-center justify-center ${isInCurrentArea ? 'bg-green-100 text-green-600' :
                                                        isInOtherArea ? 'bg-amber-100 text-amber-600' :
                                                            'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    <QrCode className="w-10 h-10" />
                                                </div>
                                                <p className="font-bold text-sm text-gray-900 truncate">{patron.name}</p>
                                                <p className="text-xs text-gray-500 mb-2">{patron.id}</p>

                                                {isInCurrentArea && <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800">HERE</span>}
                                                {isInOtherArea && <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800">OTHER AREA</span>}
                                                {!record && <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">OUT</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}