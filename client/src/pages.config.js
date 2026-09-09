/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AuditLog from './pages/AuditLog';
import CustomerManagement from './pages/CustomerManagement';
import Dashboard from './pages/Dashboard';
import ExportCenter from './pages/ExportCenter';
import ImportData from './pages/ImportData';
import FinanceApproval from './pages/FinanceApproval';
import InputOrder from './pages/InputOrder';
import Inventori from './pages/Inventori';
import ManualBook from './pages/ManualBook';
import MasterData from './pages/MasterData';
import OrderDetail from './pages/OrderDetail';
import PrintResi from './pages/PrintResi';
import ResetData from './pages/ResetData';
import UploadResi from './pages/UploadResi';
import UserManagement from './pages/UserManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditLog": AuditLog,
    "CustomerManagement": CustomerManagement,
    "Dashboard": Dashboard,
    "ExportCenter": ExportCenter,
    "ImportData": ImportData,
    "FinanceApproval": FinanceApproval,
    "InputOrder": InputOrder,
    "Inventori": Inventori,
    "ManualBook": ManualBook,
    "MasterData": MasterData,
    "OrderDetail": OrderDetail,
    "PrintResi": PrintResi,
    "ResetData": ResetData,
    "UploadResi": UploadResi,
    "UserManagement": UserManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};