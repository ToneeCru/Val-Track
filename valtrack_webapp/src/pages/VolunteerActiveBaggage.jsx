import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import {
  Package,
  Search,
  Clock,
  Building2,
  MapPin,
  Filter
} from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function VolunteerActiveBaggage() {
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();
  const [session, setSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');

  const [areas, setAreas] = useState([]);
  const [activeBaggage, setActiveBaggage] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch Areas and Baggage when branch changes
  useEffect(() => {
    if (selectedBranch?.id) {
      fetchData();
    }
  }, [selectedBranch]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Areas for filtering and mapping
      const { data: floors } = await supabase.from('floors').select('id').eq('branch_id', selectedBranch.id);
      const floorIds = floors?.map(f => f.id) || [];

      let branchAreas = [];
      if (floorIds.length > 0) {
        const { data: areaData } = await supabase
          .from('areas')
          .select('*, floors(label, floor_number)')
          .in('floor_id', floorIds)
          .order('name');
        branchAreas = areaData || [];
      }
      setAreas(branchAreas);

      // 2. Fetch Active Baggage for ALL areas in branch
      const areaIds = branchAreas.map(a => a.id);
      if (areaIds.length > 0) {
        const { data: baggageData, error } = await supabase
          .from('baggage')
          .select('*')
          .in('area_id', areaIds)
          .eq('status', 'occupied')
          .order('check_in_time', { ascending: false });

        if (error) throw error;

        // Enrich data with area info
        const enriched = baggageData.map(b => {
          const area = branchAreas.find(a => a.id === b.area_id);
          return { ...b, area };
        });

        setActiveBaggage(enriched || []);
      } else {
        setActiveBaggage([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      // toast.error('Failed to load active baggage');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) return null;

  const filteredBaggage = activeBaggage.filter(item => {
    const matchesSearch =
      (item.patron_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.patron_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'all' || item.area_id === filterArea;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <Sidebar role="volunteer" />

      <div className="ml-64">
        <Topbar title="Active Baggage List" subtitle={`View stored items in ${selectedBranch?.name || '...'} (Read-Only)`} />

        <main className="p-8">
          {/* Read-Only Notice */}
          <div className="mb-6 p-4 rounded-xl border border-cyan-200 bg-cyan-50 flex items-center justify-between">
            <p className="text-sm text-cyan-800 font-medium">
              ℹ️ This is a read-only view. Use the Baggage Module to perform Check-in/Check-out operations.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <Package className="w-4 h-4 text-blue-500" />
                  Total Items
                </div>
                <p className="text-3xl font-bold text-gray-900">{activeBaggage.length}</p>
              </div>
            </div>
            {/* Could add per area stats if needed, or just keep simple */}
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search active baggage..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9] transition-all"
                />
              </div>

              <div className="relative">
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="appearance-none px-4 py-2 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56CBF9] bg-white cursor-pointer"
                >
                  <option value="all">All Areas</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
                <Filter className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Baggage Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Locker ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patron</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-In Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredBaggage.length > 0 ? (
                  filteredBaggage.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {item.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-bold">
                            {item.patron_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.patron_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{item.patron_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {item.area?.name || 'Unknown Area'}
                          </span>
                          <span className="text-xs text-gray-500 ml-4">
                            {item.area?.floors?.label || `Floor ${item.area?.floors?.floor_number}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {new Date(item.check_in_time).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                      No active baggage found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}