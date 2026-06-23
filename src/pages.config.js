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
import Account from './pages/Account';
import Home from './pages/Home';
import Hints from './pages/Hints';
import Matches from './pages/Matches';
import Onboarding from './pages/Onboarding';
import Pinpoint from './pages/Pinpoint';
import Login from './pages/Login';
import Games from './pages/Games';
import CardGame from './pages/CardGame';
import NumberGame from './pages/NumberGame';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Account": Account,
    "Home": Home,
    "Hints": Hints,
    "Matches": Matches,
    "Onboarding": Onboarding,
    "Pinpoint": Pinpoint,
    "Login": Login,
    "Games": Games,
    "CardGame": CardGame,
    "NumberGame": NumberGame,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};