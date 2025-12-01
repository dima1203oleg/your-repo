
import React, { useState, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import BootScreen from './components/BootScreen';
import LoginScreen from './components/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { TabView } from './types';
import { AgentProvider } from './context/AgentContext';
import { SuperIntelligenceProvider } from './context/SuperIntelligenceContext';
import { ToastProvider } from './context/ToastContext';

// Lazy load views for better initial load performance
const DashboardView = lazy(() => import('./views/DashboardView'));
const DatabasesView = lazy(() => import('./views/DatabasesView'));
const AgentsView = lazy(() => import('./views/AgentsView'));
const SecurityView = lazy(() => import('./views/SecurityView'));
const ParsersView = lazy(() => import('./views/ParsersView'));
const AnalyticsView = lazy(() => import('./views/AnalyticsView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const DeploymentView = lazy(() => import('./views/DeploymentView')); 
const MonitoringView = lazy(() => import('./views/MonitoringView'));
const LLMView = lazy(() => import('./views/LLMView'));
const IntegrationView = lazy(() => import('./views/IntegrationView'));
const UserView = lazy(() => import('./views/UserView'));
const SuperIntelligenceView = lazy(() => import('./views/SuperIntelligenceView'));
const InfraView = lazy(() => import('./views/InfraView'));

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500 gap-4">
    <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
    <div className="font-mono text-sm animate-pulse">ЗАВАНТАЖЕННЯ МОДУЛЯ...</div>
  </div>
);

type AppState = 'BOOTING' | 'LOGIN' | 'RUNNING' | 'LOCKED';

function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    const isAuth = sessionStorage.getItem('predator_auth');
    return isAuth === 'true' ? 'RUNNING' : 'BOOTING';
  });
  
  const [activeTab, setActiveTab] = useState<TabView>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && (Object.values(TabView) as string[]).includes(tab)) return tab as TabView;
    } catch (e) {
      // ignore, fallback to default
    }
    return TabView.DASHBOARD;
  });

  const handleBootComplete = () => {
    setAppState('LOGIN');
  };

  const handleLogin = () => {
    sessionStorage.setItem('predator_auth', 'true');
    setAppState('RUNNING');
  };

  const handleLock = () => {
    setAppState('LOCKED');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('predator_auth');
    setAppState('LOGIN');
  };

  const handleReboot = () => {
    setAppState('BOOTING');
    sessionStorage.removeItem('predator_auth');
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabView.DASHBOARD: return <DashboardView />;
      case TabView.DATA: return <DatabasesView />;
      case TabView.AGENTS: return <AgentsView />;
      case TabView.SECURITY: return <SecurityView />;
      case TabView.ETL: return <ParsersView />;
      case TabView.ANALYTICS: return <AnalyticsView />;
      case TabView.SETTINGS: return <SettingsView />;
      case TabView.DEVOPS: return <DeploymentView />; // Reverted to DeploymentView as main entry
      case TabView.INFRA: return <InfraView />;
      case TabView.MONITORING: return <MonitoringView />;
      case TabView.LLM: return <LLMView />;
      case TabView.INTEGRATION: return <IntegrationView />;
      case TabView.USER_PORTAL: return <UserView />;
      case TabView.SUPER_INTELLIGENCE: return <SuperIntelligenceView />;
      default: return <DashboardView />;
    }
  };

  if (appState === 'BOOTING') {
    return <BootScreen onComplete={handleBootComplete} />;
  }

  if (appState === 'LOGIN' || appState === 'LOCKED') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AgentProvider>
          <SuperIntelligenceProvider>
            <Layout 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              onLock={handleLock}
              onLogout={handleLogout}
              onReboot={handleReboot}
            >
              <ErrorBoundary fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-slate-400">Помилка завантаження модуля</div>
                  </div>
                </div>
              }>
                <Suspense fallback={<LoadingSpinner />}>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
            </Layout>
          </SuperIntelligenceProvider>
        </AgentProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
