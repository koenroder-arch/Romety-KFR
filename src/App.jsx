import React from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { LanguageProvider } from '@/lib/LanguageContext';
import { ThemeProvider } from '@/lib/ThemeContext';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => {
  if (currentPageName === 'Login') return <>{children}</>;
  return Layout ?
    <Layout currentPageName={currentPageName}>{children}</Layout>
    : <>{children}</>;
};

const OnboardingGate = ({ children }) => {
  const { user } = useAuth();
  const [checking, setChecking] = React.useState(true);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    // Fetch profile and check onboarding status
    base44.entities.UserProfile.filter({ user_email: user.email }).then((profiles) => {
      const done = profiles?.[0]?.onboarding_complete === true;
      setNeedsOnboarding(!done);
      setChecking(false);
    }).catch(() => {
      // If error, assume needs onboarding
      setNeedsOnboarding(true);
      setChecking(false);
    });
  }, [user?.email]);

  if (checking) {
    return null;
  }

  // If needs onboarding, redirect to onboarding page
  if (needsOnboarding) {
    window.location.replace('/Onboarding');
    return null;
  }

  return children;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, user } = useAuth();
  const isLoginPage = window.location.pathname.toLowerCase().startsWith('/login');

  console.log(`[App] AuthenticatedApp render: isLoadingAuth=${isLoadingAuth} user=${user ? user.email : 'null'} isLoginPage=${isLoginPage} path=${window.location.pathname}`);

  // Show loading while auth is being checked
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#08090E]">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user && !isLoginPage) {
    console.log('[App] User is null and not on login page, redirecting to login...');
    base44.auth.redirectToLogin(window.location.href);
    return null;
  }

  return (
    <Routes>
      {Object.entries(Pages).map(([path, Page]) => {
        const isLogin = path === 'Login';
        const isOnboarding = path === 'Onboarding';
        
        let element = (
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        );

        // If it is not Login or Onboarding, wrap in OnboardingGate
        if (!isLogin && !isOnboarding) {
          element = <OnboardingGate>{element}</OnboardingGate>;
        }

        return (
          <Route
            key={path}
            path={`/${path}`}
            element={element}
          />
        );
      })}

      {/* Main landing page */}
      <Route path="/" element={
        <OnboardingGate>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </OnboardingGate>
      } />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


import SplashScreen from '@/components/welove/SplashScreen';

const MainAppContent = () => {
  const [showSplash, setShowSplash] = React.useState(() => {
    return !sessionStorage.getItem('romety_splash_shown');
  });

  const handleSplashDone = () => {
    sessionStorage.setItem('romety_splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        {showSplash ? (
          <SplashScreen onDone={handleSplashDone} />
        ) : (
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
        )}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainAppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App