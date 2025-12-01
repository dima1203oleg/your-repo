import React, { useState, useEffect, useRef } from 'react';
import { TacticalCard } from '../components/TacticalCard';
import { ViewHeader } from '../components/ViewHeader';
import { TabView } from '../types';

const MonitoringView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TEMPO' | 'SAGA'>('OVERVIEW');

  const renderOverview = () => (
    <div className="space-y-6">
      <TacticalCard title="System Overview" className="panel-3d">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/50 rounded border border-slate-800">
            <div className="text-sm text-slate-400">CPU Usage</div>
            <div className="text-2xl font-bold text-green-400">45%</div>
          </div>
          <div className="p-4 bg-slate-900/50 rounded border border-slate-800">
            <div className="text-sm text-slate-400">Memory</div>
            <div className="text-2xl font-bold text-blue-400">2.1GB</div>
          </div>
          <div className="p-4 bg-slate-900/50 rounded border border-slate-800">
            <div className="text-sm text-slate-400">Network</div>
            <div className="text-2xl font-bold text-purple-400">125MB/s</div>
          </div>
        </div>
      </TacticalCard>
    </div>
  );

  const renderTempoViz = () => (
    <div className="space-y-6">
      <TacticalCard title="Tempo: Розподілений Трейсинг (Trace ID: a1b2c3d4)" className="panel-3d">
        <div className="relative h-[450px] bg-slate-950 border border-slate-800 rounded p-4 overflow-hidden flex flex-col">
          <div className="absolute top-2 right-2 flex gap-2">
            <div className="text-[10px] text-slate-500 font-mono">Duration: 245ms</div>
            <div className="text-[10px] text-green-500 font-bold font-mono text-glow-green">STATUS: OK</div>
          </div>
          
          <div className="mt-6 flex-1 space-y-3 relative">
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="w-px bg-slate-700"></div>
              ))}
            </div>
            
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="relative">
                <div className="flex items-center gap-4">
                  <div className="text-[10px] text-slate-500 font-mono w-16">
                    {`${i * 100}ms`}
                  </div>
                  <div className="flex-1 h-8 bg-slate-800/50 rounded flex items-center px-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <div className="text-xs text-slate-300">Service {i + 1} - Request processed</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TacticalCard>
    </div>
  );

  const renderSagaViz = () => (
    <div className="space-y-6">
      <TacticalCard title="Saga Pattern Visualization" className="panel-3d">
        <div className="p-4 bg-slate-900/50 rounded border border-slate-800">
          <div className="text-sm text-slate-400">Saga transactions and compensation patterns</div>
        </div>
      </TacticalCard>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 w-full max-w-[1600px] mx-auto">
      <ViewHeader 
        title="Monitoring & Observability"
        icon={<span className="text-primary-400">📊</span>}
        breadcrumbs={['MONITORING', 'REAL-TIME']}
        stats={[
          { label: 'System Health', value: 'OPTIMAL', color: 'success' },
          { label: 'Active Traces', value: '1,247', color: 'primary' },
          { label: 'Alerts', value: '3', color: 'warning' }
        ]}
      />

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'OVERVIEW' 
              ? 'bg-primary-600 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('TEMPO')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'TEMPO' 
              ? 'bg-primary-600 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Tempo Tracing
        </button>
        <button
          onClick={() => setActiveTab('SAGA')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            activeTab === 'SAGA' 
              ? 'bg-primary-600 text-white' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Saga Patterns
        </button>
      </div>

      {activeTab === 'OVERVIEW' && renderOverview()}
      {activeTab === 'TEMPO' && renderTempoViz()}
      {activeTab === 'SAGA' && renderSagaViz()}
    </div>
  );
};

export default MonitoringView;
