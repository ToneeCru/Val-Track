import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBranchesAndUser = async () => {
            setLoading(true);
            try {
                // 1. Fetch all branches
                const { data: branchData, error: branchError } = await supabase
                    .from('branches')
                    .select('*')
                    .order('name');
                if (branchError) throw branchError;
                setBranches(branchData);

                // 2. Check User Role & Assignment
                const sessionData = localStorage.getItem('valtrack_session');
                let assignedBranchId = null;
                let userRole = null;

                if (sessionData) {
                    const parsed = JSON.parse(sessionData);
                    userRole = parsed.role;

                    if (userRole === 'staff' || userRole === 'volunteer') {
                        // Fetch assigned branch from profile
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('assigned_branch_id')
                            .eq('id', parsed.id)
                            .single();

                        if (profile && profile.assigned_branch_id) {
                            assignedBranchId = profile.assigned_branch_id;
                        }
                    }
                }

                // 3. Determine Selected Branch
                // Priority:
                // a) Assigned Branch (for non-admins)
                // b) Saved selection in localStorage (for admins)
                // c) First available branch

                if ((userRole === 'staff' || userRole === 'volunteer') && assignedBranchId) {
                    const assigned = branchData.find(b => b.id === assignedBranchId);
                    if (assigned) {
                        setSelectedBranch(assigned);
                        setBranches([assigned]); // Restrict list to only assigned branch
                    } else {
                        // Assigned branch not found (deleted?) - Fallback
                        // If strict, maybe empty list? But for now default behavior.
                        // Ideally, we should warn or handle this case.
                        console.warn('Assigned branch not found in active branches list.');
                        // If they are staff but have no valid branch, maybe show nothing or let them see all?
                        // Safety: don't show all.
                        setBranches([]);
                        setSelectedBranch(null);
                    }
                } else {
                    // Admin: Default to 'All Branches' (null) unless one was previously selected and saved
                    const savedBranchId = localStorage.getItem('selectedBranchId');
                    if (savedBranchId) {
                        const found = branchData.find(b => b.id === savedBranchId);
                        if (found) {
                            setSelectedBranch(found);
                        } else {
                            // Saved branch invalid/deleted, default to All
                            setSelectedBranch(null);
                            localStorage.removeItem('selectedBranchId');
                        }
                    } else {
                        // Default to All
                        setSelectedBranch(null);
                    }
                }

            } catch (err) {
                console.error('Error initializing BranchContext:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBranchesAndUser();
    }, []);

    const changeBranch = (branchId) => {
        if (!branchId) {
            setSelectedBranch(null);
            localStorage.removeItem('selectedBranchId');
            return;
        }
        const branch = branches.find(b => b.id === branchId);
        if (branch) {
            setSelectedBranch(branch);
            localStorage.setItem('selectedBranchId', branch.id);
        }
    };

    return (
        <BranchContext.Provider value={{ selectedBranch, branches, changeBranch, loading }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => useContext(BranchContext);
