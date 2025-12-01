
import React, { useState, useEffect, useRef } from 'react';
import { TacticalCard } from '../components/TacticalCard';
import { ViewHeader } from '../components/ViewHeader';
import { 
  Orbit, RefreshCw, GitBranch, Zap, Sparkles, 
  Search, Code, Play, CheckCircle2, ShieldCheck, 
  Layers, ArrowRight, Bot, Activity, BrainCircuit,
  TrendingUp, History, Server, FileText, Pause,
  Sword, Trophy, Target, BarChart3
} from 'lucide-react';
import { EvolutionEvent, EvolutionPhase, DebatePhase } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { api } from '../services/api';
import { evolutionEngine, AgentCompetitor, ArbitrationResult } from '../services/realEvolution';

const INITIAL_HISTORY: EvolutionEvent[] = [
    { id: 'evo-442', version: 'v18.5.1', type: 'BUGFIX', description: 'Fixed ETL latency in customs_connector', timestamp: '10:15', status: 'SUCCESS', metrics_impact: 'Latency -12%' },
    { id: 'evo-441', version: 'v18.5.0', type: 'FEATURE', description: 'Implemented Groq LPU support for System Brain', timestamp: '09:30', status: 'SUCCESS', metrics_impact: 'Inference Speed +400%' },
];

const METRICS_DATA = [
    { time: '08:00', efficiency: 65 },
    { time: '09:00', efficiency: 68 },
    { time: '10:00', efficiency: 72 },
    { time: '11:00', efficiency: 85 },
    { time: '12:00', efficiency: 88 },
    { time: '13:00', efficiency: 92 },
];

const EvolutionView: React.FC = () => {
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [phase, setPhase] = useState<EvolutionPhase>('IDLE');
    const [debatePhase, setDebatePhase] = useState<DebatePhase>('IDLE');
    const [logs, setLogs] = useState<string[]>([]);
    const [history, setHistory] = useState<EvolutionEvent[]>([]);
    const [progress, setProgress] = useState(0);
    const [agents, setAgents] = useState<AgentCompetitor[]>([]);
    const [arbitrationResults, setArbitrationResults] = useState<ArbitrationResult[]>([]);
    const [currentDebate, setCurrentDebate] = useState<string>('');
    const logEndRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(false);
    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        isMounted.current = true;
        initializeEvolutionSystem();
        return () => { 
            isMounted.current = false; 
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    const initializeEvolutionSystem = async () => {
        try {
            const agentsData = evolutionEngine.getAgents();
            const historyData = evolutionEngine.getEvolutionHistory();
            const arbitrationData = evolutionEngine.getArbitrationResults();
            
            setAgents(agentsData);
            setHistory(historyData);
            setArbitrationResults(arbitrationData);
            
            setLogs(prev => [...prev, "[SYSTEM] Evolution Engine initialized with 4 AI agents"]);
        } catch (error) {
            console.error("Failed to initialize evolution system:", error);
            setLogs(prev => [...prev, "[ERROR] Failed to initialize evolution engine"]);
        }
    };

    // Auto-scroll logs
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Monitor debate phase changes
    useEffect(() => {
        const checkDebatePhase = () => {
            const currentPhase = evolutionEngine.getCurrentDebatePhase();
            if (currentPhase !== debatePhase) {
                setDebatePhase(currentPhase);
                updatePhaseFromDebate(currentPhase);
                
                // Update agents status
                const updatedAgents = evolutionEngine.getAgents();
                setAgents(updatedAgents);
                
                // Update history
                const updatedHistory = evolutionEngine.getEvolutionHistory();
                setHistory(updatedHistory);
                
                // Update arbitration results
                const updatedArbitration = evolutionEngine.getArbitrationResults();
                setArbitrationResults(updatedArbitration);
            }
        };

        const interval = setInterval(checkDebatePhase, 1000);
        return () => clearInterval(interval);
    }, [debatePhase]);

    const updatePhaseFromDebate = (currentDebate: DebatePhase) => {
        const phaseMapping: Record<DebatePhase, EvolutionPhase> = {
            'IDLE': 'IDLE',
            'PROPOSING': 'DETECTION',
            'CROSS_CRITIQUE': 'BRAIN_DEBATE',
            'ARBITRATION': 'NAS_CODING',
            'SYNTHESIS': 'VERIFICATION',
            'DEPLOYMENT': 'DEPLOYMENT'
        };
        
        setPhase(phaseMapping[currentDebate]);
        
        // Update progress based on phase
        const progressMapping: Record<DebatePhase, number> = {
            'IDLE': 0,
            'PROPOSING': 20,
            'CROSS_CRITIQUE': 40,
            'ARBITRATION': 60,
            'SYNTHESIS': 80,
            'DEPLOYMENT': 100
        };
        
        setProgress(progressMapping[currentDebate]);
        
        // Add phase-specific logs
        const phaseMessages: Record<DebatePhase, string> = {
            'IDLE': 'System ready for evolution cycle',
            'PROPOSING': 'Agents generating optimization proposals...',
            'CROSS_CRITIQUE': 'Cross-critique phase: Agents analyzing each other\'s proposals',
            'ARBITRATION': 'Arbitration in progress: Selecting optimal solution',
            'SYNTHESIS': 'Synthesizing winning proposal into deployable code',
            'DEPLOYMENT': 'Deploying evolution changes to production'
        };
        
        setLogs(prev => [...prev, `[${currentDebate}] ${phaseMessages[currentDebate]}`]);
    };

    const startPolling = () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        
        pollInterval.current = setInterval(async () => {
            if (!isMounted.current) return;
            try {
                const status = await api.getEvolutionStatus();
                setPhase(status.phase);
                setLogs(status.logs);
                setProgress(status.progress);
                
                if (!status.active && status.phase === 'COMPLETED') {
                    if (!isAutoMode) {
                        if (pollInterval.current) clearInterval(pollInterval.current);
                        pollInterval.current = null;
                    }
                }
            } catch (e) {
                console.error("Failed to poll NAS status", e);
            }
        }, 1000);
    };

    const runRealEvolutionCycle = async () => {
        try {
            setLogs(prev => [...prev, "[EVOLUTION] Starting real agent competition cycle..."]);
            setCurrentDebate('Optimize system performance and reduce API latency');
            
            await evolutionEngine.startEvolutionCycle('Optimize system performance and reduce API latency');
            
            setLogs(prev => [...prev, "[EVOLUTION] Agent competition completed successfully"]);
        } catch (error) {
            console.error("Real evolution cycle failed:", error);
            setLogs(prev => [...prev, "[ERROR] Evolution cycle failed, falling back to simulation"]);
            
            // Fallback to original simulation
            await runEvolutionCycle();
        }
    };

    const runEvolutionCycle = async () => {
        try {
            await api.startEvolutionCycle();
            startPolling();
        } catch (e) {
            setLogs(prev => [...prev, "[ERROR] Failed to start backend NAS cycle."]);
        }
    };

    const toggleAutoMode = () => {
        setIsAutoMode(!isAutoMode);
        if (!isAutoMode && (phase === 'IDLE' || phase === 'COMPLETED')) {
            runRealEvolutionCycle();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <ViewHeader 
                title="Auto-Evolution Dashboard (AIS Loop)"
                icon={<Orbit size={20} />}
                breadcrumbs={['INTELLIGENCE', 'AUTO-EVOLUTION']}
                stats={[
                    { label: 'Cycle Status', value: phase === 'IDLE' ? 'STANDBY' : 'RUNNING', icon: <Activity size={14}/>, color: phase === 'IDLE' ? 'default' : 'success', animate: phase !== 'IDLE' },
                    { label: 'Evolutions', value: String(history.length), icon: <GitBranch size={14}/>, color: 'primary' },
                    { label: 'System Efficiency', value: '92%', icon: <TrendingUp size={14}/>, color: 'purple' },
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: VISUALIZER */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Agent Competition Arena */}
                    <TacticalCard title="🤖 AI Agent Competition Arena" className="min-h-[300px]">
                        <div className="grid grid-cols-2 gap-4">
                            {agents.map((agent) => (
                                <div key={agent.id} className={`relative p-4 rounded-lg border transition-all ${
                                    agent.status === 'DEBATING' ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]' :
                                    agent.status === 'THINKING' ? 'border-blue-500 bg-blue-500/10' :
                                    'border-slate-700 bg-slate-900/50'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{agent.avatar}</span>
                                            <div>
                                                <div className="text-sm font-bold text-white">{agent.name}</div>
                                                <div className="text-xs text-slate-400">{agent.model}</div>
                                            </div>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full ${
                                            agent.status === 'IDLE' ? 'bg-slate-500' :
                                            agent.status === 'THINKING' ? 'bg-blue-500 animate-pulse' :
                                            agent.status === 'DEBATING' ? 'bg-yellow-500 animate-pulse' :
                                            'bg-green-500'
                                        }`}></div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Confidence:</span>
                                            <span className="text-white font-mono">{(agent.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Win Rate:</span>
                                            <span className="text-green-400 font-mono">
                                                {agent.performance.wins}/{agent.performance.wins + agent.performance.losses + agent.performance.draws}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Avg Score:</span>
                                            <span className="text-blue-400 font-mono">{(agent.performance.averageScore * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    
                                    {agent.status !== 'IDLE' && (
                                        <div className="mt-2 text-xs text-slate-300 italic">
                                            {agent.status === 'THINKING' ? 'Generating proposal...' :
                                             agent.status === 'DEBATING' ? 'Analyzing opponents...' :
                                             'Arbitrating...'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {currentDebate && (
                            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                <div className="text-xs text-slate-400 mb-1">Current Debate:</div>
                                <div className="text-sm text-white font-medium">{currentDebate}</div>
                            </div>
                        )}
                    </TacticalCard>

                    <TacticalCard title="Continuous Improvement Cycle (G-01 Protocol)" className="min-h-[400px] flex flex-col relative overflow-hidden" 
                        action={
                            <button 
                                onClick={toggleAutoMode}
                                className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 border transition-all ${
                                    isAutoMode ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-slate-900 text-slate-400 border-slate-700'
                                }`}
                            >
                                <RefreshCw size={14} className={isAutoMode ? "animate-spin" : ""} />
                                {isAutoMode ? 'AUTO-EVOLUTION: ON' : 'ENABLE AUTO-MODE'}
                            </button>
                        }
                    >
                        {/* Background */}
                        <div className="absolute inset-0 bg-slate-950/50"></div>
                        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8">
                            
                            {/* Cycle Container */}
                            <div className="relative w-[300px] h-[300px]">
                                {/* Connecting Ring */}
                                <div className="absolute inset-0 rounded-full border-2 border-slate-800"></div>
                                {phase !== 'IDLE' && (
                                    <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                                        <circle 
                                            cx="150" cy="150" r="148" 
                                            fill="transparent" 
                                            stroke="#3b82f6" 
                                            strokeWidth="4"
                                            strokeDasharray="930"
                                            strokeDashoffset={930 - (930 * progress / 100)}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-linear"
                                        />
                                    </svg>
                                )}

                                {/* NODES */}
                                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 ${phase === 'DETECTION' ? 'scale-110' : 'opacity-70'}`}>
                                    <div className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center ${phase === 'DETECTION' ? 'border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'border-slate-700 text-slate-500'}`}>
                                        <Search size={20} />
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 bg-slate-950 px-2 py-0.5 rounded border ${phase === 'DETECTION' ? 'text-yellow-500 border-yellow-500' : 'text-slate-500 border-slate-800'}`}>DETECTION</span>
                                </div>

                                <div className={`absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 ${phase === 'BRAIN_DEBATE' ? 'scale-110' : 'opacity-70'}`}>
                                    <div className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center ${phase === 'BRAIN_DEBATE' ? 'border-purple-500 text-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'border-slate-700 text-slate-500'}`}>
                                        <Sparkles size={20} />
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 bg-slate-950 px-2 py-0.5 rounded border ${phase === 'BRAIN_DEBATE' ? 'text-purple-500 border-purple-500' : 'text-slate-500 border-slate-800'}`}>BRAIN</span>
                                </div>

                                <div className={`absolute bottom-4 right-4 flex flex-col items-center transition-all duration-300 ${phase === 'NAS_CODING' ? 'scale-110' : 'opacity-70'}`}>
                                    <div className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center ${phase === 'NAS_CODING' ? 'border-blue-500 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-slate-700 text-slate-500'}`}>
                                        <Code size={20} />
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 bg-slate-950 px-2 py-0.5 rounded border ${phase === 'NAS_CODING' ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-slate-800'}`}>NAS</span>
                                </div>

                                <div className={`absolute bottom-4 left-4 flex flex-col items-center transition-all duration-300 ${phase === 'VERIFICATION' ? 'scale-110' : 'opacity-70'}`}>
                                    <div className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center ${phase === 'VERIFICATION' ? 'border-orange-500 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 'border-slate-700 text-slate-500'}`}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 bg-slate-950 px-2 py-0.5 rounded border ${phase === 'VERIFICATION' ? 'text-orange-500 border-orange-500' : 'text-slate-500 border-slate-800'}`}>VERIFY</span>
                                </div>

                                <div className={`absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 ${phase === 'DEPLOYMENT' ? 'scale-110' : 'opacity-70'}`}>
                                    <div className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center ${phase === 'DEPLOYMENT' ? 'border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 'border-slate-700 text-slate-500'}`}>
                                        <Server size={20} />
                                    </div>
                                    <span className={`text-[10px] font-bold mt-1 bg-slate-950 px-2 py-0.5 rounded border ${phase === 'DEPLOYMENT' ? 'text-green-500 border-green-500' : 'text-slate-500 border-slate-800'}`}>GITOPS</span>
                                </div>

                                {/* Center Status */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-3xl font-display font-bold text-slate-200">v18.6</div>
                                        <div className="text-xs text-slate-500 font-mono mt-1">REAL-TIME</div>
                                        {phase !== 'IDLE' && (
                                            <div className="mt-2 text-[10px] text-primary-400 font-bold animate-pulse uppercase tracking-wider">
                                                {phase.replace('_', ' ')}...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Log Stream */}
                        <div className="h-32 bg-black/50 border-t border-slate-800 p-3 font-mono text-[10px] overflow-y-auto custom-scrollbar">
                            {logs.length === 0 && <div className="text-slate-600 italic">System Idle. Waiting for triggers...</div>}
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1 text-slate-300 break-words animate-in slide-in-from-left-2">
                                    <span className="text-primary-500 mr-2">➜</span> {log}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </TacticalCard>

                    <TacticalCard title="Evolution Impact Metrics">
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={METRICS_DATA}>
                                    <defs>
                                        <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis domain={[50, 100]} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                                    <Area type="monotone" dataKey="efficiency" stroke="#10b981" fillOpacity={1} fill="url(#colorEff)" strokeWidth={2} name="System Efficiency Score" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </TacticalCard>
                </div>

                {/* RIGHT: HISTORY & ARBITRATION */}
                <div className="space-y-6">
                    {/* Arbitration Results */}
                    <TacticalCard title="⚖️ Arbitration Results" icon={<Sword size={16} />}>
                        <div className="h-[300px] overflow-y-auto custom-scrollbar space-y-3">
                            {arbitrationResults.length === 0 ? (
                                <div className="text-center text-slate-500 py-8">
                                    <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                                    <div className="text-sm">No arbitration results yet</div>
                                    <div className="text-xs mt-1">Start evolution to see results</div>
                                </div>
                            ) : (
                                arbitrationResults.slice(0, 5).map((result, idx) => (
                                    <div key={idx} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Trophy size={14} className="text-yellow-500" />
                                                <span className="text-sm font-bold text-white">Winner</span>
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {new Date().toLocaleTimeString()}
                                            </span>
                                        </div>
                                        
                                        <div className="text-xs text-white mb-2 font-medium">
                                            {agents.find(a => a.id === result.winner)?.name || result.winner}
                                        </div>
                                        
                                        <div className="text-xs text-slate-300 mb-2 line-clamp-2">
                                            {result.reasoning}
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <div className="text-xs text-slate-400">
                                                Confidence: <span className="text-green-400">{(result.confidence * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                Impact: <span className="text-blue-400">+{result.improvementScore}%</span>
                                            </div>
                                        </div>
                                        
                                        {result.codeChanges.length > 0 && (
                                            <div className="mt-2 text-xs text-slate-400">
                                                <div className="font-medium text-slate-300 mb-1">Code Changes:</div>
                                                {result.codeChanges.slice(0, 2).map((change, i) => (
                                                    <div key={i} className="text-slate-400">
                                                        • {change.file} ({change.type})
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </TacticalCard>

                    {/* Agent Performance Chart */}
                    <TacticalCard title="📊 Agent Performance" icon={<BarChart3 size={16} />}>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={agents.map(agent => ({
                                    name: agent.name.split(' ')[0],
                                    wins: agent.performance.wins,
                                    confidence: agent.confidence * 100,
                                    color: agent.color
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                                    <YAxis stroke="#475569" fontSize={10} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }}
                                        labelStyle={{ color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="wins" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TacticalCard>

                    <TacticalCard title="Evolution History (Versions)" action={
                        <button className="text-slate-500 hover:text-white" title="Export Log"><FileText size={14}/></button>
                    }>
                        <div className="h-[600px] overflow-y-auto custom-scrollbar p-1 space-y-4">
                            {history.map((event, idx) => (
                                <div key={event.id} className="relative pl-4 border-l-2 border-slate-800 hover:border-slate-600 transition-colors group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${
                                        idx === 0 ? 'bg-primary-500 shadow-[0_0_8px_currentColor]' : 'bg-slate-600'
                                    }`}></div>
                                    
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{event.version}</div>
                                        <div className="text-[10px] text-slate-500 font-mono">{event.timestamp}</div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                            event.type === 'BUGFIX' ? 'bg-orange-900/20 text-orange-500' :
                                            event.type === 'FEATURE' ? 'bg-blue-900/20 text-blue-500' :
                                            'bg-purple-900/20 text-purple-500'
                                        }`}>
                                            {event.type}
                                        </span>
                                        <span className="text-[9px] text-success-500 font-mono">{event.status}</span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed mb-2">{event.description}</p>
                                    
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono bg-slate-900/50 p-1.5 rounded">
                                        <Zap size={10} className="text-yellow-500" /> Impact: <span className="text-slate-300">{event.metrics_impact}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TacticalCard>
                </div>
            </div>
        </div>
    );
};

export default EvolutionView;
