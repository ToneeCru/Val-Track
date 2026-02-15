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
    RotateCcw,
    Camera,
    XCircle
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

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

    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanHistory, setScanHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

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
        if (!selectedBranch?.id || !session) return;
        fetchAreasAndData();
    }, [selectedBranch, session]);

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
            let areaQuery = supabase.from('areas').select('*, floors(label, floor_number)');

            if (session.assigned_area_id) {
                areaQuery = areaQuery.eq('id', session.assigned_area_id);
            } else if (session.assigned_floor_id) {
                areaQuery = areaQuery.eq('floor_id', session.assigned_floor_id);
            } else {
                const { data: floors } = await supabase.from('floors').select('id').eq('branch_id', selectedBranch.id);
                const floorIds = floors?.map(f => f.id) || [];
                if (floorIds.length > 0) {
                    areaQuery = areaQuery.in('floor_id', floorIds);
                } else {
                    setAreas([]);
                    setIsLoading(false);
                    return;
                }
            }

            const { data: areaData } = await areaQuery.order('name');
            const fetchedAreas = areaData || [];
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

    const processPatronCheck = async (patron) => {
        if (!selectedArea) {
            toast.error("Please select an area first");
            return;
        }

        setIsScanning(true);
        setScanResult(null);

        try {
            // Check if patron is active in ANY area of this branch
            // Refresh active patrons first to be safe
            const { data: currentActive } = await supabase
                .from('area_attendance')
                .select('*')
                .eq('status', 'active')
                .in('area_id', areas.map(a => a.id));

            const existingRecord = (currentActive || []).find(a => a.patron_id === patron.id);

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
                        details: `${patron.firstname} ${patron.surname} (${patron.library_id}) checked OUT from ${selectedArea.name}`,
                        timestamp: new Date().toISOString(),
                        branch_id: selectedBranch.id
                    });

                    setScanResult({
                        type: 'success',
                        action: 'out',
                        message: `${patron.firstname} checked OUT successfully`,
                        patron: { ...patron, name: `${patron.firstname} ${patron.surname}` }
                    });
                    toast.success('Check-out successful');
                } else {
                    // Active in DIFFERENT area -> Error
                    const otherArea = areas.find(a => a.id === existingRecord.area_id);
                    const otherAreaName = otherArea ? otherArea.name : 'another area';

                    setScanResult({
                        type: 'error',
                        message: `Patron is currently checked in at ${otherAreaName}. Please check out there first.`,
                        patron: { ...patron, name: `${patron.firstname} ${patron.surname}` }
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
                        patron: { ...patron, name: `${patron.firstname} ${patron.surname}` }
                    });
                    toast.error('Area capacity reached');
                    return;
                }

                const { error: insertError } = await supabase
                    .from('area_attendance')
                    .insert({
                        patron_name: `${patron.firstname} ${patron.surname}`,
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
                    details: `${patron.firstname} ${patron.surname} (${patron.library_id}) checked IN to ${selectedArea.name}`,
                    timestamp: new Date().toISOString(),
                    branch_id: selectedBranch.id
                });

                setScanResult({
                    type: 'success',
                    action: 'in',
                    message: `${patron.firstname} checked IN successfully`,
                    patron: { ...patron, name: `${patron.firstname} ${patron.surname}` }
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
            // Close camera if open? Maybe keep it open for continous scanning
            // setIsCameraOpen(false); 
        }
    };

    const handleScan = async (detectedCodes) => {
        if (isScanning || !detectedCodes || detectedCodes.length === 0) return;

        const scannedValue = detectedCodes[0].rawValue;
        if (!scannedValue) return;

        setIsScanning(true);
        try {
            // Find patron by library_id or id
            // We use 'ilike' for case-insensitive match on library_id just in case
            const { data: patron, error } = await supabase
                .from('patrons')
                .select('*')
                .or(`library_id.eq.${scannedValue},id.eq.${scannedValue}`)
                .maybeSingle();

            if (error) throw error;

            if (!patron) {
                toast.error('Patron not found');
                setScanResult({
                    type: 'error',
                    message: 'Patron not found',
                    patron: { name: 'Unknown', id: scannedValue }
                });
                setIsScanning(false);
                return;
            }

            await processPatronCheck(patron);

        } catch (err) {
            console.error(err);
            toast.error('Error finding patron');
            setIsScanning(false);
        }
    };

    // Kept for backward compatibility with simulation buttons
    const handleDemoScan = async (patron) => {
        // We need to fetch the REAL patron object from DB based on ID from the mock list
        // The mock list has IDs like 'P-2024-001' which might not exist in real DB.
        // Assuming user wants to test with REAL data mostly.
        // But for simulation, let's just use the mock object passed in if we can't find it?
        // Actually, let's try to find it first.

        // Use the passed patron object directly if simulating
        // But the structure expected by processPatronCheck involves firstname/surname
        // The mock object has 'name'. Let's adapt it.
        const adaptedPatron = {
            id: patron.id,
            firstname: patron.name.split(' ')[0],
            surname: patron.name.split(' ').slice(1).join(' '),
            library_id: patron.id
        };
        await processPatronCheck(adaptedPatron);
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
                                {/* Area Selector Removed */}

                                {/* Current Area Status */}
                                <div className="bg-white rounded-xl p-6 border border-gray-100 lg:col-span-3 flex flex-col justify-between">
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

                            {/* Scanner Section */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <Camera className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">QR Scanner</h3>
                                            <p className="text-sm text-gray-500">Use your camera to scan patron QR codes</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsCameraOpen(!isCameraOpen)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isCameraOpen
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                    >
                                        {isCameraOpen ? (
                                            <>
                                                <XCircle className="w-4 h-4" /> Close Camera
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="w-4 h-4" /> Open Camera
                                            </>
                                        )}
                                    </button>
                                </div>

                                {isCameraOpen && (
                                    <div className="max-w-md mx-auto overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 mb-4 relative">
                                        <div className="aspect-square relative">
                                            <Scanner
                                                onScan={(result) => result && result.length > 0 && handleScan(result)}
                                                onError={(error) => console.log(error?.message)}
                                                styles={{
                                                    container: { width: '100%', height: '100%' },
                                                    video: { width: '100%', height: '100%', objectFit: 'cover' }
                                                }}
                                                components={{
                                                    audio: false,
                                                    torch: false,
                                                    finder: true
                                                }}
                                            />
                                        </div>
                                        <p className="text-center text-xs text-gray-500 py-2">Point camera at QR code</p>
                                    </div>
                                )}
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
                                            <p className="text-sm opacity-80">{scanResult.patron.name} ({scanResult.patron.id || scanResult.patron.library_id})</p>
                                        </div>
                                    </div>
                                </div>
                            )}


                        </>
                    )}
                </main>
            </div>
        </div>
    );
}