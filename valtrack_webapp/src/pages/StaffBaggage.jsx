import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';
import {
    Package,
    QrCode,
    Scan,
    CheckCircle,
    XCircle,
    Grid3X3,
    MapPin,
    AlertCircle,
    Camera
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';


export default function StaffBaggage() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();
    const [session, setSession] = useState(null);

    // Config State
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);
    const [slots, setSlots] = useState([]);

    // Simulation / Active State

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [baggageHistory, setBaggageHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
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

    // Fetch Areas when branch changes
    useEffect(() => {
        if (selectedBranch?.id && session) {
            fetchAreas();
            fetchHistory();
        }
    }, [selectedBranch, session]);

    // Fetch Data when Area changes
    useEffect(() => {
        if (selectedArea) {
            fetchAreaDetails();
        } else {
            setSlots([]);

        }
    }, [selectedArea]);

    const fetchAreas = async () => {
        try {
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
                    return;
                }
            }

            const { data: areaData } = await areaQuery.order('name');
            setAreas(areaData || []);

            // Auto-select logic
            if (areaData?.length > 0) {
                if (session.assigned_area_id) {
                    // Force select assigned area
                    if (selectedArea?.id !== session.assigned_area_id) {
                        setSelectedArea(areaData[0]);
                    }
                } else if (!selectedArea) {
                    setSelectedArea(areaData[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching areas", error);
        }
    };

    const fetchHistory = async () => {
        try {
            const { data: logData } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('module', 'Baggage Module')
                .eq('branch_id', selectedBranch.id)
                .order('timestamp', { ascending: false })
                .limit(10);
            setBaggageHistory(logData || []);
        } catch (error) {
            console.error("Error fetching history", error);
        }
    }

    const fetchAreaDetails = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Slots (Baggage)
            const { data: baggageData } = await supabase
                .from('baggage')
                .select('*')
                .eq('area_id', selectedArea.id)
                .order('id');
            setSlots(baggageData || []);



        } catch (error) {
            console.error('Error fetching area details:', error);
            toast.error('Failed to load area data');
        } finally {
            setIsLoading(false);
        }
    };

    const processBaggageTransaction = async (patron) => {
        if (!selectedArea) return;
        setIsScanning(true);
        setScanResult(null);

        try {
            // Check existing baggage record for this patron
            const { data: existingBaggage } = await supabase
                .from('baggage')
                .select('*')
                .eq('patron_id', patron.patron_id)
                .single();

            if (existingBaggage) {
                // Determine logic: 
                // If checking out: release baggage.

                const { error: updateError } = await supabase
                    .from('baggage')
                    .update({
                        status: 'available',
                        patron_name: null,
                        patron_id: null,
                        check_in_time: null
                    })
                    .eq('id', existingBaggage.id);

                if (updateError) throw updateError;

                await supabase.from('audit_logs').insert({
                    user_name: session.name || 'Staff',
                    action: 'Baggage Check-Out',
                    module: 'Baggage Module',
                    details: `Released locker ${existingBaggage.id} for ${patron.patron_name}`,
                    timestamp: new Date().toISOString(),
                    branch_id: selectedBranch.id
                });

                setScanResult({
                    type: 'checkout',
                    message: `Baggage checked OUT`,
                    patron: { name: patron.patron_name, id: patron.patron_id },
                    slot: existingBaggage.id
                });
                toast.success('Baggage released');

            } else {
                // CHECK-IN
                // Find available slot in CURRENT Area
                const availableSlot = slots.find(s => s.status === 'available');

                if (!availableSlot) {
                    setScanResult({
                        type: 'error',
                        message: 'No available lockers in this area',
                        patron: { name: patron.patron_name, id: patron.patron_id }
                    });
                    toast.error('No lockers available');
                    return;
                }

                const { error: updateError } = await supabase
                    .from('baggage')
                    .update({
                        status: 'occupied',
                        patron_name: patron.patron_name,
                        patron_id: patron.patron_id,
                        check_in_time: new Date().toISOString()
                    })
                    .eq('id', availableSlot.id);

                if (updateError) throw updateError;

                await supabase.from('audit_logs').insert({
                    user_name: session.name || 'Staff',
                    action: 'Baggage Check-In',
                    module: 'Baggage Module',
                    details: `Assigned locker ${availableSlot.id} to ${patron.patron_name}`,
                    timestamp: new Date().toISOString(),
                    branch_id: selectedBranch.id
                });

                setScanResult({
                    type: 'checkin',
                    message: `Baggage checked IN`,
                    patron: { name: patron.patron_name, id: patron.patron_id },
                    slot: availableSlot.id
                });
                toast.success('Baggage assigned');
            }

            fetchAreaDetails();
            fetchHistory();

        } catch (error) {
            console.error('Baggage operation error:', error);
            toast.error('Failed to process baggage transaction');
        } finally {
            setIsScanning(false);
        }
    };

    const handleScan = async (detectedCodes) => {
        if (isScanning || !detectedCodes || detectedCodes.length === 0) return;

        const scannedValue = detectedCodes[0].rawValue;
        if (!scannedValue) return;

        setIsScanning(true);
        try {
            // Find patron by library_id or id
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

            // Adapt patron object for baggage logic
            const baggagePatron = {
                patron_id: patron.id,
                patron_name: `${patron.firstname} ${patron.surname}`
            };

            await processBaggageTransaction(baggagePatron);

        } catch (err) {
            console.error(err);
            toast.error('Error finding patron');
            setIsScanning(false);
        }
    };

    if (!session) return null;

    const availableCount = slots.filter(s => s.status === 'available').length;
    const occupiedCount = slots.filter(s => s.status === 'occupied').length;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="staff" />

            <div className="ml-64">
                <Topbar title="Baggage Module" subtitle="Manage locker storage" />

                <main className="p-8">
                    {/* Area Selection & Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                        {/* Area Selector */}
                        {/* Current Area Display */}
                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex flex-col justify-center h-full">
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-500 uppercase tracking-wider">
                                <MapPin className="w-4 h-4 text-blue-500" /> Current Area
                            </h3>
                            <p className="text-2xl font-bold text-gray-900">{selectedArea?.name || 'Loading...'}</p>
                            <span className="text-sm text-gray-400 mt-1">
                                {selectedArea?.floors?.label || (selectedArea ? `Floor ${selectedArea.floors?.floor_number}` : '')}
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <Grid3X3 className="w-5 h-5" style={{ color: '#56CBF9' }} />
                                <span className="text-sm text-gray-500">Total Lockers</span>
                            </div>
                            <p className="text-3xl font-bold" style={{ color: '#232323' }}>{slots.length}</p>
                            <p className="text-xs text-gray-400 mt-1">In {selectedArea?.name || '---'}</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                                <span className="text-sm text-gray-500">Available</span>
                            </div>
                            <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{availableCount}</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-100 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-2">
                                <Package className="w-5 h-5" style={{ color: '#F59E0B' }} />
                                <span className="text-sm text-gray-500">Occupied</span>
                            </div>
                            <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{occupiedCount}</p>
                        </div>
                    </div>

                    {selectedArea ? (
                        <>
                            {/* Scan Result */}
                            {scanResult && (
                                <div className={`mb-8 p-6 rounded-xl border-l-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 ${scanResult.type === 'error' ? 'bg-red-50 border-red-500' :
                                    scanResult.type === 'checkout' ? 'bg-blue-50 border-blue-500' : 'bg-green-50 border-green-500'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scanResult.type === 'error' ? 'bg-red-100 text-red-600' :
                                            scanResult.type === 'checkout' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {scanResult.type === 'error' ? <AlertCircle className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${scanResult.type === 'error' ? 'text-red-900' :
                                                scanResult.type === 'checkout' ? 'text-blue-900' : 'text-green-900'
                                                }`}>{scanResult.message}</h4>
                                            <p className="text-sm opacity-80">
                                                {scanResult.patron.name} • Locker: {scanResult.slot || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Scanner Section */}
                            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <Camera className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Scan Patron QR</h3>
                                            <p className="text-sm text-gray-500">Scan to assign or release baggage</p>
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

                            {/* Lockers Grid */}
                            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
                                <h3 className="font-semibold mb-4 text-gray-900">Locker Status Grid</h3>
                                {slots.length > 0 ? (
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                        {slots.map((slot) => (
                                            <div
                                                key={slot.id}
                                                className={`p-2 rounded-lg border text-center relative group ${slot.status === 'occupied'
                                                    ? 'border-amber-200 bg-amber-50'
                                                    : 'border-green-200 bg-green-50'
                                                    }`}
                                            >
                                                <p className="font-bold text-xs text-gray-700 truncate" title={slot.id}>{slot.id}</p>
                                                <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${slot.status === 'occupied' ? 'bg-amber-500' : 'bg-green-500'
                                                    }`} />

                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] bg-black text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 hidden md:block">
                                                    {slot.status === 'occupied' ? (
                                                        <>
                                                            <p>{slot.patron_name}</p>
                                                            <p className="opacity-75">{slot.patron_id}</p>
                                                        </>
                                                    ) : 'Available'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400">
                                        No lockers configured for this area.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <MapPin className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">Please select an area to view baggage lockers.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}