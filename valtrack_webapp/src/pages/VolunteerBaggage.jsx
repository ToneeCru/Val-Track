import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
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

import { supabase } from '../lib/supabase';
import { useBranch } from '../context/BranchContext';
import { toast } from 'sonner';

export default function VolunteerBaggage() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();
    const [session, setSession] = useState(null);

    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState(null);

    // Baggage & Patrons State

    const [allBaggage, setAllBaggage] = useState([]); // Baggage items in current area

    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [baggageHistory, setBaggageHistory] = useState([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    useEffect(() => {
        const sessionData = localStorage.getItem('valtrack_session');
        if (!sessionData) {
            navigate('/Home');
            return;
        }
        const parsed = JSON.parse(sessionData);
        if (parsed.role !== 'volunteer') {
            navigate('/Home');
            return;
        }
        setSession(parsed);
    }, [navigate]);

    // Fetch Areas when branch changes
    useEffect(() => {
        if (selectedBranch?.id && session) {
            fetchAreas();
        }
    }, [selectedBranch, session]);

    // Fetch Baggage Data when selectedArea changes
    useEffect(() => {
        if (selectedArea) {
            fetchBaggageData();
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
            const fetchedAreas = areaData || [];
            setAreas(fetchedAreas);

            if (fetchedAreas.length > 0) {
                if (session.assigned_area_id) {
                    if (selectedArea?.id !== session.assigned_area_id) {
                        setSelectedArea(fetchedAreas[0]);
                    }
                } else if (!selectedArea) {
                    setSelectedArea(fetchedAreas[0]);
                }
            }
        } catch (error) {
            console.error("Error fetching areas", error);
        }
    };

    const fetchBaggageData = async () => {
        setIsLoading(true);
        try {
            // Fetch Baggage in this Area
            // Note: In new schema, 'baggage' table replaces 'slots'. 
            // 'baggage' table stores *items*, not fixed slots usually. 
            // Or if it mimics slots, it has `status`.
            // Let's assume `baggage` table has `area_id`.

            const { data: baggageData, error: baggageError } = await supabase
                .from('baggage')
                .select('*')
                .eq('area_id', selectedArea.id)
                .order('check_in_time', { ascending: false }); // Show active items

            if (baggageError) throw baggageError;
            setAllBaggage(baggageData || []);



            // Fetch Recent Baggage Logs (Global or Branch)
            const { data: logData } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('module', 'Baggage Module')
                .eq('branch_id', selectedBranch.id)
                .order('timestamp', { ascending: false })
                .limit(10);
            setBaggageHistory(logData || []);

        } catch (error) {
            console.error('Error fetching baggage data:', error);
            // toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    // ID Generator for new baggage
    const generateBaggageId = () => {
        const prefix = 'LKR';
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${randomNum}`;
    };

    const processBaggageTransaction = async (patron) => {
        if (!selectedArea) return;

        setIsScanning(true);
        setScanResult(null);

        try {
            // Check if patron already has baggage in this area
            const existingBaggage = allBaggage.find(b => b.patron_id === patron.patron_id && b.status === 'occupied');

            if (existingBaggage) {
                // CHECK-OUT
                const { error: updateError } = await supabase
                    .from('baggage')
                    .update({
                        status: 'returned',
                        check_out_time: new Date().toISOString()
                    })
                    .eq('id', existingBaggage.id);

                if (updateError) throw updateError;

                await supabase.from('audit_logs').insert({
                    user_name: session.name || 'Volunteer',
                    action: 'Baggage Check-Out',
                    module: 'Baggage Module',
                    details: `Returned item ${existingBaggage.id} to ${patron.patron_name} in ${selectedArea.name}`,
                    timestamp: new Date().toISOString(),
                    branch_id: selectedBranch.id
                });

                setScanResult({
                    type: 'checkout',
                    message: `Baggage returned to ${patron.patron_name}`,
                    patron: { name: patron.patron_name, id: patron.patron_id },
                    slot: existingBaggage.id
                });
                toast.success('Baggage checked out');
            } else {
                // CHECK-IN
                const newId = generateBaggageId();

                const { error: insertError } = await supabase
                    .from('baggage')
                    .insert({
                        id: newId,
                        area_id: selectedArea.id,
                        patron_name: patron.patron_name,
                        patron_id: patron.patron_id,
                        status: 'occupied',
                        check_in_time: new Date().toISOString(),
                        branch_id: selectedBranch.id
                    });

                if (insertError) throw insertError;

                await supabase.from('audit_logs').insert({
                    user_name: session.name || 'Volunteer',
                    action: 'Baggage Check-In',
                    module: 'Baggage Module',
                    details: `Stored item ${newId} for ${patron.patron_name} in ${selectedArea.name}`,
                    timestamp: new Date().toISOString(),
                    branch_id: selectedBranch.id
                });

                setScanResult({
                    type: 'checkin',
                    message: `Baggage stored for ${patron.patron_name}`,
                    patron: { name: patron.patron_name, id: patron.patron_id },
                    slot: newId
                });
                toast.success('Baggage checked in');
            }

            fetchBaggageData(); // Refresh
        } catch (error) {
            console.error('Baggage operation error:', error);
            toast.error('Failed to process baggage');
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

    const activeBaggageCount = allBaggage.filter(b => b.status === 'occupied').length;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
            <Sidebar role="volunteer" />

            <div className="ml-64">
                <Topbar title="Baggage Module" subtitle="Volunteer Access" />

                <main className="p-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Area Selection & Stats */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-white rounded-xl p-6 border border-gray-100 lg:col-span-2 flex flex-col justify-center">
                                    <h3 className="font-semibold mb-2 text-gray-900 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-blue-600" /> Current Area
                                    </h3>
                                    <div className="flex flex-col">
                                        <p className="text-xl font-bold text-gray-900">{selectedArea?.name || 'Loading...'}</p>
                                        <p className="text-sm text-gray-500">
                                            {selectedArea?.floors?.label || (selectedArea ? `Floor ${selectedArea.floors?.floor_number}` : '')}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center justify-between col-span-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Package className="w-5 h-5 text-amber-500" />
                                            <span className="text-sm text-gray-500 font-medium">Stored Items</span>
                                        </div>
                                        <p className="text-4xl font-bold text-gray-900">{activeBaggageCount}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                                        <Package className="w-6 h-6 text-amber-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Scan Result */}
                            {scanResult && (
                                <div
                                    className={`mb-6 p-6 rounded-xl border-l-4 shadow-sm animate-in fade-in slide-in-from-top-4 ${scanResult.type === 'error' ? 'bg-red-50 border-red-500' :
                                        scanResult.type === 'checkin' ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center ${scanResult.type === 'error' ? 'bg-red-100 text-red-600' :
                                                scanResult.type === 'checkin' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                }`}
                                        >
                                            {scanResult.type === 'error'
                                                ? <AlertCircle className="w-6 h-6" />
                                                : <Package className="w-6 h-6" />
                                            }
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${scanResult.type === 'error' ? 'text-red-900' :
                                                scanResult.type === 'checkin' ? 'text-green-900' : 'text-blue-900'
                                                }`}>
                                                {scanResult.message}
                                            </h4>
                                            <p className="text-sm opacity-80">
                                                {scanResult.patron.name} ({scanResult.patron.id})
                                                {scanResult.slot && ` • Locker: ${scanResult.slot}`}
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

                            {/* Baggage List / History */}
                            <div className="bg-white rounded-xl border border-gray-100">
                                <div className="p-6 border-b border-gray-100">
                                    <h3 className="font-semibold text-gray-900">Recent Baggage Activity</h3>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {baggageHistory.length > 0 ? baggageHistory.map((item) => {
                                        const isCheckIn = item.action === 'Baggage Check-In';
                                        return (
                                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCheckIn ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{item.details}</p>
                                                        <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="p-8 text-center text-gray-400 italic">No history available</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}