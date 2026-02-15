import AdminDashboard from './pages/AdminDashboard';
import AdminIncidents from './pages/AdminIncidents';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminBaggageManagement from './pages/AdminBaggageManagement'; // Renamed
import AdminBaggageLogs from './pages/AdminBaggageLogs'; // Added
import AdminBranchManagement from './pages/AdminBranchManagement'; // Added for CRUD branches
import AdminAreaManagement from './pages/AdminAreaManagement'; // Renamed
import AdminActiveBaggage from './pages/AdminActiveBaggage'; // Added
import AdminReports from './pages/AdminReports';
import AdminAuditLogs from './pages/AdminAuditLogs';
import StaffDashboard from './pages/StaffDashboard';
import StaffQRScan from './pages/StaffQRScan';
import StaffBaggage from './pages/StaffBaggage';
import StaffActiveBaggage from './pages/StaffActiveBaggage';
import StaffIncidents from './pages/StaffIncidents';
import VolunteerDashboard from './pages/VolunteerDashboard';
import VolunteerQRScan from './pages/VolunteerQRScan';
import VolunteerBaggage from './pages/VolunteerBaggage';
import VolunteerActiveBaggage from './pages/VolunteerActiveBaggage';
import Home from './pages/Home';
import __Layout from './Layout.jsx';

export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminIncidents": AdminIncidents,
    "AdminUserManagement": AdminUserManagement,
    "AdminBaggageManagement": AdminBaggageManagement, // Renamed key
    "AdminBaggageLogs": AdminBaggageLogs, // Added
    "AdminBranchManagement": AdminBranchManagement, // Added
    "AdminAreaManagement": AdminAreaManagement, // Renamed key
    "AdminActiveBaggage": AdminActiveBaggage, // Added
    "AdminReports": AdminReports,
    "AdminAuditLogs": AdminAuditLogs,
    "StaffDashboard": StaffDashboard,
    "StaffQRScan": StaffQRScan,
    "StaffBaggage": StaffBaggage,
    "StaffActiveBaggage": StaffActiveBaggage,
    "StaffIncidents": StaffIncidents,
    "VolunteerDashboard": VolunteerDashboard,
    "VolunteerQRScan": VolunteerQRScan,
    "VolunteerBaggage": VolunteerBaggage,
    "VolunteerActiveBaggage": VolunteerActiveBaggage,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "AdminDashboard",
    Pages: PAGES,
    Layout: __Layout,
};