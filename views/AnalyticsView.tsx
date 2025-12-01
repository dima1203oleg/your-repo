


import React, { useState, useEffect, useRef } from 'react';
import { TacticalCard } from '../components/TacticalCard';
import { ViewHeader } from '../components/ViewHeader';
import Modal from '../components/Modal';
import { Search, Sparkles, FileDown, Activity, Check, Scan, BrainCircuit, AlertTriangle, AlertOctagon, Share2, Layers, Info, FileText, Lock, PenTool, Send, Briefcase, Stethoscope, Leaf, Building2, Radio, Network, Play, Pause, Rewind, FastForward, Clock } from 'lucide-react';
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { api } from '../services/api';
import { RiskForecast } from '../types';

type SectorType = 'GOV' | 'BIZ' | 'MED' | 'SCI';

// UI Configuration Only - Data comes from API
const SECTOR_UI_CONFIG = {
    GOV: {
        label: 'Уряд & Право',
        icon: <Building2 size={16} className="icon-3d-blue"/>,
        color: 'text-blue-400',
        deepScanPlaceholder: "Наприклад: Проаналізуй зв'язки ТОВ 'МегаБуд' з офшорами...",
        risks: "Корупційні Ризики",
        script: [
            { msg: "Parsing natural language query...", node: null, conf: 20 },
            { msg: "Extracting entities: 'МегаБуд' (EDRPOU 334455)", node: 'A', conf: 35 },
            { msg: "Initializing TGN (Temporal Graph Network) for anomaly detection...", node: null, conf: 45 },
            { msg: "Querying Tax Debt Registry (ua_tax_debt)...", node: 'A', conf: 55 },
            { msg: "Analyzing Ultimate Beneficial Owners (UBO)...", node: 'A', conf: 60 },
            { msg: "Cross-referencing PEP database...", node: 'D', conf: 70 },
            { msg: "Detecting hidden links to 'ТОВ Прокладка'...", node: 'B', conf: 85 },
            { msg: "Synthesizing final corruption risk assessment...", node: null, conf: 99 }
        ]
    },
    BIZ: {
        label: 'Бізнес & Фінанси',
        icon: <Briefcase size={16} className="icon-3d-amber"/>,
        color: 'text-yellow-400',
        deepScanPlaceholder: "Наприклад: Прогноз попиту на агропродукцію Q4 2024...",
        risks: "Фінансові Ризики",
        script: [
            { msg: "Analyzing market trends Q3-Q4...", node: null, conf: 20 },
            { msg: "Initializing TGN (Temporal Graph Network) for volatility...", node: null, conf: 30 },
            { msg: "Connecting to Bloomberg Terminal API...", node: 'A', conf: 40 },
            { msg: "Evaluating Supply Chain latency...", node: 'B', conf: 55 },
            { msg: "Checking competitor pricing models...", node: 'C', conf: 70 },
            { msg: "Forecasting EBITDA impact...", node: 'A', conf: 85 },
            { msg: "Generating investment recommendation...", node: null, conf: 99 }
        ]
    },
    MED: {
        label: 'Медицина',
        icon: <Stethoscope size={16} className="icon-3d-red"/>,
        color: 'text-red-400',
        deepScanPlaceholder: "Наприклад: Аналіз епідеміологічних кластерів грипу...",
        risks: "Епідеміологічна Загроза",
        script: [
            { msg: "Ingesting anonymized patient records...", node: null, conf: 15 },
            { msg: "Initializing TGN (Temporal Graph Network) for disease spread...", node: null, conf: 25 },
            { msg: "Sequencing viral genome markers...", node: 'C', conf: 45 },
            { msg: "Mapping transmission vectors...", node: 'B', conf: 65 },
            { msg: "Comparing with WHO databases...", node: 'D', conf: 80 },
            { msg: "Calculating R0 reproduction rate...", node: 'B', conf: 90 },
            { msg: "Finalizing containment protocol...", node: null, conf: 99 }
        ]
    },
    SCI: {
        label: 'Наука & Екологія',
        icon: <Leaf size={16} className="icon-3d-green"/>,
        color: 'text-green-400',
        deepScanPlaceholder: "Наприклад: Моніторинг якості повітря в промзоні...",
        risks: "Екологічна Небезпека",
        script: [
            { msg: "Connecting to IoT Sensor Grid...", node: null, conf: 10 },
            { msg: "Aggregating PM2.5 particulate data...", node: 'A', conf: 30 },
            { msg: "Initializing TGN (Temporal Graph Network) for diffusion modeling...", node: null, conf: 40 },
            { msg: "Correlating with wind direction models...", node: 'C', conf: 60 },
            { msg: "Identifying emission source signature...", node: 'B', conf: 75 },
            { msg: "Predicting dispersion radius...", node: 'D', conf: 85 },
            { msg: "Generating environmental alert...", node: null, conf: 99 }
        ]
    }
};

const IntelligenceTicker = ({ items }: { items: string[] }) => {
    return (
        <div className="w-full bg-slate-950/80 border-y border-slate-800 h-8 overflow-hidden flex items-center relative select-none panel-3d backdrop-blur-sm">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10"></div>
            
            <div className="flex items-center gap-2 px-3 shrink-0 bg-slate-900 h-full border-r border-slate-800 z-20">
                <Radio size={12} className="text-red-500 animate-pulse icon-3d-red" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Live Intel</span>
            </div>

            <div className="flex items-center gap-8 animate-[marquee_20s_linear_infinite] whitespace-nowrap pl-4">
                {items && [...items, ...items, ...items].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span className="text-primary-500">::</span>
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
};

const GeoMap = ({ isActive, sector }: { isActive: boolean, sector: SectorType }) => {
    const [pings, setPings] = useState<{id: number, x: number, y: number, color: string}[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (pings.length > 5) setPings(prev => prev.slice(1));
            
            let color = 'blue';
            if (sector === 'MED') color = 'red';
            if (sector === 'SCI') color = 'green';
            if (sector === 'BIZ') color = 'yellow';

            const newPing = {
                id: Date.now(),
                x: Math.random() * 800 + 100,
                y: Math.random() * 300 + 100,
                color: Math.random() > 0.8 ? 'red' : color
            };
            setPings(prev => [...prev, newPing]);
        }, 800);
        return () => clearInterval(interval);
    }, [pings.length, sector]);

    return (
        <div className="relative w-full h-[300px] bg-slate-950 rounded border border-slate-800 overflow-hidden group panel-3d">
            <div className={`absolute inset-0 opacity-20 transition-all duration-1000 ${isActive ? 'opacity-40' : ''}`}>
                 <svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice" className={`w-full h-full stroke-slate-600 transition-colors duration-1000 ${isActive ? 'fill-blue-900/10' : 'fill-slate-700'}`}>
                    <path d="M50,150 Q150,50 250,150 T450,150 T650,150 T850,150" fill="none" strokeWidth="2" opacity="0.5"/> 
                    <rect x="100" y="100" width="150" height="100" rx="10" />
                    <rect x="300" y="80" width="100" height="120" rx="10" />
                    <rect x="450" y="120" width="200" height="150" rx="10" />
                    <rect x="700" y="100" width="150" height="100" rx="10" />
                 </svg>
            </div>
            
            {pings.map(ping => (
                <div 
                    key={ping.id}
                    className={`absolute w-2 h-2 rounded-full animate-ping ${
                        ping.color === 'red' ? 'bg-red-500' : 
                        ping.color === 'green' ? 'bg-green-500' :
                        ping.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-blue-500'
                    }`}
                    style={{ left: ping.x, top: ping.y }}
                ></div>
            ))}
            
            {/* Sector Specific Overlay */}
            {sector === 'SCI' && <div className="absolute top-[20%] left-[40%] w-24 h-24 bg-green-500/10 rounded-full blur-xl"></div>}
            
            {isActive && (
                <>
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary-500/50 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="absolute inset-0 border-2 border-primary-500/20 animate-pulse rounded"></div>
                </>
            )}

            <div className="absolute bottom-4 left-4 p-2 bg-slate-900/80 backdrop-blur rounded border border-slate-700 text-[10px] text-slate-300 font-mono shadow-lg">
                <div className="flex items-center gap-2 font-bold uppercase mb-1 text-slate-500">{SECTOR_UI_CONFIG[sector].label} MODE</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Critical Events</div>
                <div className="flex items-center gap-2 mt-1"><div className={`w-2 h-2 rounded-full ${sector === 'MED' ? 'bg-red-400' : 'bg-blue-500'}`}></div> Active Monitoring</div>
            </div>
        </div>
    );
}

const SectorGraph = ({ isScanning, focusedNode, sector, nodes }: { isScanning: boolean, focusedNode: string | null, sector: SectorType, nodes: any }) => {
    const [selectedGraphNode, setSelectedGraphNode] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(100); // 0 to 100 percentage
    const [isPlaying, setIsPlaying] = useState(false);

    // Fallback if nodes are not yet loaded
    const safeNodes = nodes || { A: 'N/A', B: 'N/A', C: 'N/A', D: 'N/A' };

    // TGN Playback Loop
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= 100) {
                        setIsPlaying(false);
                        return 100;
                    }
                    return prev + 1;
                });
            }, 50);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    // Mapping 'company'/'link'/'pep' from script to Node IDs 'A'/'B'/'C'/'D' for visual pulse
    const getPulseNode = (type: string | null) => {
        if (!type) return null;
        if (type === 'company' || type === 'A') return 'A';
        if (type === 'link' || type === 'B') return 'B';
        if (type === 'pep' || type === 'D') return 'D';
        if (type === 'C') return 'C';
        return null;
    };

    const pulseTarget = getPulseNode(focusedNode);

    const pulseA = isScanning && (pulseTarget === 'A' || !pulseTarget);
    const pulseB = isScanning && (pulseTarget === 'B' || !pulseTarget);
    const pulseC = isScanning && (pulseTarget === 'C' || !pulseTarget);
    const pulseD = isScanning && (pulseTarget === 'D' || !pulseTarget);

    const handleNodeClick = (nodeName: string) => {
        setSelectedGraphNode(selectedGraphNode === nodeName ? null : nodeName);
    };

    // Temporal Visibility Logic
    const isVisible = (threshold: number) => currentTime >= threshold;

    return (
        <div className="relative w-full h-[320px] bg-slate-950 rounded border border-slate-800 overflow-hidden flex flex-col bg-black/40 panel-3d">
             
             {/* TGN Indicator */}
             <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                 <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[9px] font-mono text-slate-400 flex items-center gap-1">
                     <Network size={10} className={isScanning ? "text-purple-500 animate-pulse" : "text-slate-600"} />
                     TGN: {isScanning ? <span className="text-purple-400 font-bold">LIVE SCAN</span> : "PLAYBACK"}
                 </div>
                 <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[9px] font-mono text-slate-400 flex items-center gap-1">
                     <Clock size={10} /> t={currentTime}%
                 </div>
             </div>

             <div className="flex-1 relative flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="z-10">
                    {/* Edges with temporal fade-in */}
                    <line x1="100" y1="100" x2="200" y2="50" stroke={pulseA ? "#3b82f6" : "#475569"} strokeWidth={pulseA ? 2 : 1} className="transition-all duration-300" opacity={isVisible(20) ? 1 : 0.1} />
                    <line x1="100" y1="100" x2="200" y2="150" stroke="#475569" strokeWidth={1} opacity={isVisible(40) ? 1 : 0.1} />
                    
                    <line x1="200" y1="50" x2="300" y2="100" stroke={pulseB ? "#ef4444" : "#475569"} strokeWidth={pulseB ? 3 : 1} strokeDasharray="4" className={pulseB ? "animate-pulse" : ""} opacity={isVisible(60) ? 1 : 0.1} />
                    
                    <line x1="200" y1="150" x2="300" y2="100" stroke="#475569" strokeWidth={1} opacity={isVisible(80) ? 1 : 0.1} />
                    
                    {/* Node A */}
                    <g onClick={() => handleNodeClick(safeNodes.A)} className="cursor-pointer hover:opacity-80 transition-opacity duration-500" style={{opacity: isVisible(10) ? 1 : 0}}>
                        <circle 
                            cx="100" cy="100" r="18" 
                            fill={pulseA ? "#3b82f6" : "#1e293b"} 
                            fillOpacity={pulseA ? 0.4 : 0.2}
                            stroke="#3b82f6" 
                            strokeWidth={pulseA ? 2 : 1}
                            className={pulseA ? "animate-ping" : ""} 
                            style={{animationDuration: '2s'}} 
                        />
                        <circle cx="100" cy="100" r="18" fill="transparent" stroke={pulseA ? "#3b82f6" : "#334155"} />
                        <text x="100" y="128" textAnchor="middle" fontSize="9" fill={pulseA ? "#60a5fa" : "#94a3b8"} fontWeight="bold">{safeNodes.A}</text>
                    </g>
                    
                    {/* Node B */}
                    <g onClick={() => handleNodeClick(safeNodes.B)} className="transition-opacity duration-500" style={{opacity: isVisible(30) ? 1 : 0}}>
                        <circle cx="200" cy="50" r="14" fill="#0f172a" stroke="#94a3b8" className="cursor-pointer hover:stroke-white transition-colors" />
                        <text x="200" y="30" textAnchor="middle" fontSize="8" fill="#94a3b8">{safeNodes.B}</text>
                    </g>
                    
                    {/* Node C */}
                    <g onClick={() => handleNodeClick(safeNodes.C)} className="transition-opacity duration-500" style={{opacity: isVisible(50) ? 1 : 0}}>
                        <circle cx="200" cy="150" r="14" fill="#0f172a" stroke="#94a3b8" className="cursor-pointer hover:stroke-white transition-colors"/>
                        <text x="200" y="175" textAnchor="middle" fontSize="8" fill="#94a3b8">{safeNodes.C}</text>
                    </g>

                    {/* Node D */}
                    <g onClick={() => handleNodeClick(safeNodes.D)} className="cursor-pointer hover:opacity-80 transition-opacity duration-500" style={{opacity: isVisible(70) ? 1 : 0}}>
                        <circle 
                            cx="300" cy="100" r="20" 
                            fill={pulseD ? "#ef4444" : "#1e293b"} 
                            fillOpacity={pulseD ? 0.3 : 0.1} 
                            stroke={pulseD ? "#ef4444" : "#475569"}
                            strokeWidth={pulseD ? 2 : 1} 
                            className={pulseD ? "animate-bounce" : ""} 
                        />
                        <text x="300" y="130" textAnchor="middle" fontSize="10" fill={pulseD ? "#f87171" : "#94a3b8"} fontWeight="bold">{safeNodes.D}</text>
                    </g>
                </svg>
             </div>
             
             {/* Node Details Overlay */}
             {selectedGraphNode && (
                 <div className="absolute bottom-12 left-2 z-20 bg-slate-900/90 border border-slate-700 p-3 rounded shadow-xl w-64 animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex justify-between items-start mb-2">
                         <div className="font-bold text-xs text-white">{selectedGraphNode}</div>
                         <button onClick={() => setSelectedGraphNode(null)} className="text-slate-500 hover:text-white"><Info size={12}/></button>
                     </div>
                     <div className="space-y-1 text-[10px] text-slate-400 font-mono">
                         <div className="flex justify-between"><span>Context:</span> <span className="text-blue-400">{sector}</span></div>
                         <div className="flex justify-between"><span>Risk Score:</span> <span className="text-red-400 font-bold">0.85</span></div>
                         <div className="mt-2 text-slate-500 leading-tight">
                             DeepScan detected anomalies linked to this entity in {sector === 'GOV' ? 'public registers' : 'sensor logs'}.
                         </div>
                     </div>
                 </div>
             )}

             {/* Timeline Controls */}
             <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-4 z-20">
                 <button 
                    onClick={() => { setIsPlaying(!isPlaying); if(currentTime>=100) setCurrentTime(0); }}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors btn-3d"
                 >
                     {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                 </button>
                 <div className="flex-1 relative group">
                     <input 
                        type="range" 
                        min="0" max="100" 
                        value={currentTime} 
                        onChange={(e) => setCurrentTime(Number(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                     />
                     <div className="text-[9px] text-slate-500 flex justify-between mt-1 font-mono">
                         <span>Start</span>
                         <span>Anomaly Detected</span>
                         <span>Present</span>
                     </div>
                 </div>
                 <button onClick={() => { setCurrentTime(0); setIsPlaying(true); }} className="text-slate-500 hover:text-white btn-3d" title="Replay Attack">
                     <Rewind size={14} />
                 </button>
             </div>
        </div>
    )
}

const AnalyticsView: React.FC = () => {
  const [currentSector, setCurrentSector] = useState<SectorType>('GOV');
  const [forecastData, setForecastData] = useState<RiskForecast[]>([]);
  const [sectorData, setSectorData] = useState<any>(null); // Fetched from API
  
  // Report Generation State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportStep, setReportStep] = useState(0);
  const [reportStatus, setReportStatus] = useState<'IDLE' | 'GENERATING' | 'READY'>('IDLE');

  // --- DeepScan State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<any>(null);
  const [thinkingBudget, setThinkingBudget] = useState(0);
  const [focusedGraphNode, setFocusedGraphNode] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  // Async safety
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchData = async () => {
        try {
            // Parallel fetch for Forecast and Sector Specific Data
            const [forecasts, secData] = await Promise.all([
                api.getRiskForecast(),
                api.getSectorData(currentSector)
            ]);
            
            if (isMounted.current) {
                setForecastData(forecasts);
                setSectorData(secData);
            }
        } catch (e) {
            console.error("Analytics fetch error", e);
        }
    };
    
    fetchData();
    
    return () => { isMounted.current = false; };
  }, [currentSector]);

  const handleOpenReportModal = () => {
      setIsReportModalOpen(true);
      setReportStatus('GENERATING');
      setReportProgress(0);
      setReportStep(0);
      
      const steps = [
          { duration: 800, progress: 25 },
          { duration: 1200, progress: 50 },
          { duration: 1000, progress: 75 },
          { duration: 800, progress: 100 }
      ];

      let currentStep = 0;
      
      const runStep = () => {
          if (currentStep >= steps.length) {
              setReportStatus('READY');
              return;
          }
          
          setTimeout(() => {
              if (isMounted.current) {
                  setReportProgress(steps[currentStep].progress);
                  setReportStep(currentStep + 1);
                  currentStep++;
                  runStep();
              }
          }, steps[currentStep].duration);
      };
      
      runStep();
  };

  const handleDeepScan = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;

      setIsThinking(true);
      setThoughts([]);
      setScanResult(null);
      setThinkingBudget(0);
      setFocusedGraphNode(null);
      setConfidence(0);

      // Dynamic script based on sector
      const steps = [
          { msg: `Initializing DeepScan Protocol for ${currentSector}...`, node: null, conf: 10 },
          ...SECTOR_UI_CONFIG[currentSector].script
      ];

      for (let i = 0; i < steps.length; i++) {
          if (!isMounted.current) return;

          setThoughts(prev => [...prev, steps[i].msg]);
          setFocusedGraphNode(steps[i].node);
          setConfidence(steps[i].conf);
          
          const stepTime = Math.random() * 600 + 400;
          const tokenBurst = Math.floor(Math.random() * 1200) + 800;
          
          const tick = 10;
          for (let t = 0; t < tick; t++) {
              await new Promise(r => setTimeout(r, stepTime / tick));
              if (!isMounted.current) return;
              setThinkingBudget(prev => Math.min(32768, prev + (tokenBurst / tick)));
          }
      }

      if (!isMounted.current) return;
      setFocusedGraphNode(null);
      
      try {
          // Pass currentSector to the API
          const result = await api.runDeepAnalysis(searchQuery, currentSector); 
          if (isMounted.current) setScanResult(result);
      } catch (err) {
          console.error(err);
      } finally {
          if (isMounted.current) setIsThinking(false);
      }
  };

  const reportSteps = [
      { id: 1, label: 'Вилучення сутностей (NER)', icon: <Scan size={14}/> },
      { id: 2, label: 'Генерація графіків (D3.js)', icon: <Activity size={14}/> },
      { id: 3, label: 'Оцінка ризиків (AI)', icon: <AlertOctagon size={14}/> },
      { id: 4, label: 'Підпис ЕЦП (КЕП)', icon: <PenTool size={14}/> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-24 w-full max-w-[1600px] mx-auto">
       
       <Modal
         isOpen={isReportModalOpen}
         onClose={() => setIsReportModalOpen(false)}
         title="Генерація Аналітичного Звіту"
         icon={<FileText size={20} className="text-primary-400 icon-3d-blue" />}
         size="md"
       >
           <div className="p-4 space-y-6">
               {reportStatus === 'GENERATING' ? (
                   <div className="space-y-6 text-center py-8">
                       <div className="relative w-20 h-20 mx-auto">
                           <div className="absolute inset-0 border-4 border-primary-500/20 rounded-full"></div>
                           <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                           <div className="absolute inset-0 flex items-center justify-center font-bold text-primary-400">
                               {reportProgress}%
                           </div>
                       </div>
                       
                       <div className="space-y-3 max-w-xs mx-auto text-left">
                           {reportSteps.map((step, idx) => (
                               <div key={step.id} className={`flex items-center gap-3 text-sm transition-colors ${idx < reportStep ? 'text-success-500' : idx === reportStep ? 'text-white font-bold' : 'text-slate-600'}`}>
                                   <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${idx < reportStep ? 'bg-success-500 border-success-500 text-slate-950' : idx === reportStep ? 'bg-primary-900/20 border-primary-500 text-primary-400 animate-pulse' : 'border-slate-700 bg-slate-900'}`}>
                                       {idx < reportStep ? <Check size={10} strokeWidth={3} /> : <span className="text-[10px]">{step.id}</span>}
                                   </div>
                                   <span>{step.label}</span>
                               </div>
                           ))}
                       </div>
                   </div>
               ) : (
                   <div className="py-6 space-y-6">
                       <div className="bg-success-900/10 border border-success-500/30 p-4 rounded-lg flex items-center gap-4 panel-3d">
                           <div className="p-3 bg-success-500/20 rounded-full text-success-500 icon-3d-green">
                               <FileText size={24} />
                           </div>
                           <div>
                               <h3 className="font-bold text-slate-200">Звіт Успішно Сформовано</h3>
                               <p className="text-xs text-slate-400">ID: REP-2023-10-27-0042 • Підписано КЕП</p>
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3">
                           <button className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors gap-2 group btn-3d">
                               <FileDown size={24} className="text-primary-400 group-hover:scale-110 transition-transform icon-3d-blue" />
                               <span className="text-xs font-bold text-slate-300">Завантажити PDF</span>
                           </button>
                           <button className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors gap-2 group btn-3d">
                               <Send size={24} className="text-blue-400 group-hover:scale-110 transition-transform icon-3d-blue" />
                               <span className="text-xs font-bold text-slate-300">Telegram Bot</span>
                           </button>
                       </div>
                       
                       <div className="text-center">
                           <button onClick={() => setIsReportModalOpen(false)} className="text-xs text-slate-500 hover:text-white underline">
                               Закрити вікно
                           </button>
                       </div>
                   </div>
               )}
           </div>
       </Modal>

       <ViewHeader 
            title="DeepScan Аналітика"
            icon={<BrainCircuit size={20} className="icon-3d-purple"/>}
            breadcrumbs={['INTELLIGENCE', 'DEEP SCAN', SECTOR_UI_CONFIG[currentSector].label]}
            stats={[
                { label: 'Sector Mode', value: currentSector, icon: SECTOR_UI_CONFIG[currentSector].icon, color: 'primary' },
                { label: 'Reasoning Model', value: 'GEMINI 2.5', icon: <Sparkles size={14}/>, color: 'purple', animate: isThinking },
            ]}
            actions={
                <button 
                    onClick={handleOpenReportModal}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50 hover:text-white btn-3d"
                    disabled={isThinking}
                >
                    <FileDown size={14} />
                    Експорт Звіту
                </button>
            }
       />

        {/* SECTOR SWITCHER */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 rounded-t overflow-x-auto scrollbar-hide">
            {(Object.keys(SECTOR_UI_CONFIG) as SectorType[]).map(sector => (
                <button 
                    key={sector}
                    onClick={() => setCurrentSector(sector)}
                    className={`flex-1 min-w-[120px] py-3 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${
                        currentSector === sector 
                        ? `border-primary-500 text-white bg-slate-800/30` 
                        : 'border-transparent text-slate-500 hover:bg-slate-800/30 hover:text-slate-300'
                    }`}
                >
                    {SECTOR_UI_CONFIG[sector].icon} {SECTOR_UI_CONFIG[sector].label}
                </button>
            ))}
        </div>

        {/* LIVE INTELLIGENCE TICKER */}
        <IntelligenceTicker items={sectorData?.ticker || []} />

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Left Column: DeepScan & Results */}
           <TacticalCard title={`Аналітичний Запит (${SECTOR_UI_CONFIG[currentSector].label})`} className="lg:col-span-2 panel-3d">
                <div className="space-y-6">
                    <form onSubmit={handleDeepScan} className="p-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded border border-slate-800 relative group focus-within:border-purple-500/50 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.05)]">
                        <div className="absolute top-0 right-0 p-2 bg-slate-900 rounded-bl border-b border-l border-slate-800 text-[10px] text-purple-400 font-bold tracking-wider flex items-center gap-1 font-mono">
                            <Sparkles size={10} /> 32k CONTEXT
                        </div>
                        <div className="p-4 bg-slate-950 rounded-sm">
                             <label className="text-xs font-bold text-slate-500 block mb-3 uppercase tracking-wider">
                                 {SECTOR_UI_CONFIG[currentSector].label} Intelligent Query
                             </label>
                             <div className="flex gap-2 flex-col sm:flex-row">
                                 <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-slate-200 text-base md:text-sm focus:ring-0 placeholder-slate-600 font-medium min-w-0"
                                    placeholder={SECTOR_UI_CONFIG[currentSector].deepScanPlaceholder}
                                 />
                                 <button 
                                    type="submit"
                                    disabled={isThinking || !searchQuery}
                                    className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white transition-colors shadow-lg shadow-purple-900/20 shrink-0 flex items-center justify-center gap-2 font-bold px-6 w-full sm:w-auto mt-2 sm:mt-0 btn-3d btn-3d-purple"
                                 >
                                    {isThinking ? <Activity size={18} className="animate-spin" /> : <Scan size={18} />}
                                    {isThinking ? 'Reasoning...' : 'Scan'}
                                 </button>
                            </div>
                        </div>
                    </form>

                    {/* Thinking Process Visualization */}
                    {(isThinking || thoughts.length > 0) && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                             <div className="bg-slate-950 border border-purple-500/30 rounded-lg p-4 relative overflow-hidden panel-3d">
                                 {isThinking && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-[shimmer_2s_infinite]"></div>}
                                 
                                 <div className="flex justify-between items-center mb-4">
                                     <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                                         <BrainCircuit size={14} className={isThinking ? "animate-pulse" : ""} /> Ланцюжок Думок (Chain of Thought)
                                     </div>
                                     <div className="flex items-center gap-3">
                                         {isThinking && (
                                             <div className="text-[10px] font-mono text-blue-400 animate-pulse hidden sm:block">
                                                 Confidence: {confidence.toFixed(0)}%
                                             </div>
                                         )}
                                         <div className="font-mono text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                             Tokens: <span className="text-purple-400 font-bold">{thinkingBudget.toFixed(0)}</span> / 32k
                                         </div>
                                     </div>
                                 </div>

                                 <div className="space-y-2 font-mono text-xs max-h-[180px] overflow-y-auto custom-scrollbar flex flex-col-reverse">
                                      {thoughts.map((t, i) => (
                                          <div key={i} className={`flex items-start gap-3 p-2 rounded ${i === thoughts.length - 1 && isThinking ? 'bg-purple-900/10 text-slate-200 border border-purple-900/20' : 'text-slate-500'}`}>
                                              <span className="text-purple-500 mt-0.5">➜</span>
                                              <span className={i === thoughts.length - 1 && isThinking ? "animate-pulse" : ""}>{t}</span>
                                          </div>
                                      ))}
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* Analysis Results */}
                    {scanResult && !isThinking && (
                         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* Score Card */}
                             <div className="p-5 bg-slate-950 rounded border border-slate-800 relative flex flex-col justify-between panel-3d">
                                 <div className="flex justify-between items-start">
                                     <div className="text-xs text-slate-500 uppercase font-bold">Оцінка Ризику</div>
                                     <AlertOctagon size={20} className="text-danger-500 icon-3d-red" />
                                 </div>
                                 <div className="text-center my-4">
                                     <span className="text-5xl font-mono font-bold text-danger-500 text-glow-red">{scanResult.riskScore}</span>
                                     <span className="text-sm text-slate-500 block mt-1">CRITICAL</span>
                                 </div>
                                 <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800">
                                     <div className="bg-gradient-to-r from-orange-500 to-danger-600 h-full transition-all duration-1000" style={{ width: `${scanResult.riskScore * 100}%` }}></div>
                                 </div>
                             </div>
                             
                             {/* Findings List */}
                             <div className="p-4 bg-slate-950 rounded border border-slate-800 flex flex-col h-full panel-3d">
                                 <div className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                                     <Layers size={14} /> Ключові Висновки
                                 </div>
                                 <ul className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-2 max-h-[200px]">
                                     {scanResult.findings.map((f: string, i: number) => (
                                         <li key={i} className="text-xs text-slate-300 flex items-start gap-2 p-2 rounded bg-slate-900/50 hover:bg-slate-900 transition-colors">
                                             <AlertTriangle size={12} className="text-yellow-500 mt-0.5 shrink-0 icon-3d-amber" />
                                             {f}
                                         </li>
                                     ))}
                                 </ul>
                                 <button onClick={handleOpenReportModal} className="mt-3 w-full py-2 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded transition-colors border border-slate-800 btn-3d">
                                     <Share2 size={12} /> Зберегти Звіт
                                 </button>
                             </div>
                         </div>
                    )}
                </div>
           </TacticalCard>

           {/* Right Column: Visualizations */}
           <div className="space-y-6">
               <TacticalCard title={`Граф Зв'язків (TGN Time-Travel)`} className="panel-3d">
                    <SectorGraph isScanning={isThinking} focusedNode={focusedGraphNode} sector={currentSector} nodes={sectorData?.graphNodes} />
                    <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-900/20 rounded-full text-red-500 animate-pulse">
                                <AlertTriangle size={16} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-300">{SECTOR_UI_CONFIG[currentSector].risks}</div>
                                <div className="text-[10px] text-slate-500">Виявлено критичні аномалії</div>
                            </div>
                        </div>
                        <button className="text-[10px] bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 px-3 py-1.5 rounded border border-blue-900/50 font-bold transition-colors btn-3d">
                            ДЕТАЛІ
                        </button>
                    </div>
               </TacticalCard>

               <TacticalCard title="Глобальна Карта (GEOINT)" className="panel-3d">
                    <GeoMap isActive={isThinking} sector={currentSector} />
               </TacticalCard>

               <TacticalCard title="Прогноз Ризиків (AI Prediction)" className="panel-3d">
                    <div className="h-[150px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={forecastData}>
                                <defs>
                                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '12px' }} 
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="url(#colorRisk)" name="Рівень Ризику" strokeWidth={2} />
                                <Line type="monotone" dataKey="confidence" stroke="#10b981" strokeWidth={2} dot={false} name="Впевненість AI" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
               </TacticalCard>
           </div>
       </div>
    </div>
  );
};

export default AnalyticsView;
