

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { TacticalCard } from '../components/TacticalCard';
import { ViewHeader } from '../components/ViewHeader';
import { 
  Sparkles, BrainCircuit, Activity, MessageSquare, 
  Send, Scale, ShieldCheck, Zap, AlertTriangle, 
  CheckCircle2, GitMerge, ArrowRight, Play, RotateCcw,
  Cpu, GitPullRequest, Code, FileText
} from 'lucide-react';
import { BrainModel, DebateMessage, DebatePhase } from '../types';

// --- INITIAL CONFIG (6 Models + Arbiter) ---
const INITIAL_MODELS: BrainModel[] = [
    { id: 'm1', name: 'Gemini 2.0 Flash', provider: 'Google', avatar: 'G', status: 'IDLE', color: '#3b82f6' }, // Blue
    { id: 'm2', name: 'DeepSeek R1', provider: 'DeepSeek', avatar: 'D', status: 'IDLE', color: '#a855f7' }, // Purple
    { id: 'm3', name: 'Mistral Large', provider: 'Mistral AI', avatar: 'M', status: 'IDLE', color: '#eab308' }, // Yellow
    { id: 'm4', name: 'Qwen 2.5', provider: 'Alibaba', avatar: 'Q', status: 'IDLE', color: '#ef4444' }, // Red
    { id: 'm5', name: 'Llama 3 (Local)', provider: 'Meta/Local', avatar: 'L', status: 'IDLE', color: '#22c55e' }, // Green
    { id: 'm6', name: 'Groq LPU', provider: 'Groq', avatar: 'Gq', status: 'IDLE', color: '#f97316' }, // Orange (High Speed)
];

const ARBITER: BrainModel = {
    id: 'arbiter', name: 'Gemini 3 Ultra', provider: 'Google DeepMind', avatar: 'A', status: 'IDLE', color: '#ffffff'
};

const SystemBrainView: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [phase, setPhase] = useState<DebatePhase>('IDLE');
    const [models, setModels] = useState<BrainModel[]>(INITIAL_MODELS);
    const [arbiter, setArbiter] = useState<BrainModel>(ARBITER);
    const [messages, setMessages] = useState<DebateMessage[]>([]);
    const [progress, setProgress] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Removed auto-scroll useEffect

    const addMessage = (msg: DebateMessage) => {
        if (!isMounted.current) return;
        setMessages(prev => [...prev, msg]);
    };

    const updateModelStatus = (id: string, status: BrainModel['status'], thought?: string) => {
        if (!isMounted.current) return;
        if (id === 'arbiter') {
            setArbiter(prev => ({ ...prev, status, currentThought: thought }));
        } else {
            setModels(prev => prev.map(m => m.id === id ? { ...m, status, currentThought: thought } : m));
        }
    };

    // Map model ids to Tailwind color tokens so UI doesn't rely on inline styles
    const modelColorToken: Record<string, string> = {
        m1: 'blue-400',
        m2: 'purple-400',
        m3: 'yellow-400',
        m4: 'red-400',
        m5: 'green-400',
        m6: 'orange-400',
        arbiter: 'white'
    };

    const getModelTextClass = (id?: string) => {
        if (!id) return 'text-slate-400';
        const token = modelColorToken[id] ?? null;
        return token ? `text-${token}` : 'text-slate-400';
    };

    const getModelBorderClass = (id?: string, isActive?: boolean) => {
        if (!isActive) return 'border-slate-700';
        const token = id ? (modelColorToken[id] ?? null) : null;
        return token ? `border-${token}` : 'border-white';
    };

    const startDebate = async () => {
        if (!topic.trim()) return;

        // Reset state for a new live debate
        setPhase('PROPOSING');
        setMessages([]);
        setProgress(0);
        setModels(prev => prev.map(m => ({ ...m, status: 'IDLE', currentThought: undefined })));
        setArbiter({ ...ARBITER, status: 'IDLE', currentThought: undefined });

        try {
            // Ask backend to start an evolution/debate cycle; if network fails, the api layer falls back to mock
            await api.startEvolutionCycle();

            // Poll for evolution/debate status until returned active=false or phase back to IDLE
            const poll = setInterval(async () => {
                try {
                    const status = await api.getEvolutionStatus();
                    if (!status) return;

                    // status: { phase, logs, progress, active }
                    setPhase((status.phase || 'IDLE') as DebatePhase);
                    setProgress(status.progress || 0);

                    // Map logs into messages (append only new entries)
                    if (Array.isArray(status.logs) && status.logs.length) {
                        // Create messages from log lines — avoid duplicates
                        const existingIds = new Set(messages.map(m => m.id));
                        const newMsgs = status.logs
                            .filter((l: string) => !existingIds.has(l))
                            .map((l: string, idx: number) => ({ id: `evo-${Date.now()}-${idx}`, modelId: 'arbiter', modelName: 'Evolution', type: 'ARGUMENT' as const, content: l, timestamp: new Date() }));

                        if (newMsgs.length) setMessages(prev => [...prev, ...newMsgs]);
                    }

                    // If the backend reports the evolution as not active, stop polling
                    if (status.active === false || status.phase === 'IDLE') {
                        clearInterval(poll);
                        setPhase('DEPLOYMENT');
                    }
                } catch (e) {
                    // stop polling on repeated errors — fallback to client simulation
                    clearInterval(poll);
                    console.warn('Debate polling failed, falling back to client simulator', e);
                    runComplexDebateUA(topic);
                }
            }, 1000);

        } catch (e) {
            // If starting the evolution cycle fails, fall back to the local simulator
            console.warn('startEvolutionCycle failed, using local simulation', e);
            runComplexDebateUA(topic);
        }
    };

    const runComplexDebateUA = async (query: string) => {
        // 1. PROPOSING PHASE
        addMessage({ id: 'sys-1', modelId: 'SYSTEM', modelName: 'Orchestrator', type: 'ARGUMENT', content: `Ініціалізація багатомодельних дебатів: "${query}"`, timestamp: new Date() });
        
        const proposals = [
            { id: 'm6', text: "Groq LPU пропонує: Використати мікросервісну архітектуру з кешуванням на LPU для мінімальної затримки (<10мс). Інференс в реальному часі.", thought: "Оптимізація інференсу..." },
            { id: 'm1', text: "Gemini Flash аналізує: Потрібен гібридний підхід. TGN для часових рядів, але з валідацією через Knowledge Graph.", thought: "Побудова контекстного графа..." },
            { id: 'm2', text: "DeepSeek R1 заперечує: Швидкість Groq призведе до втрати точності в FP8. Пропоную повний ланцюжок міркувань (CoT) перед відповіддю.", thought: "Перевірка математичної логіки..." },
            { id: 'm3', text: "Mistral Large пропонує: Додати шар RAG з ElasticSearch для доменних знань (Митниця/Податки).", thought: "Індексація джерел..." },
            { id: 'm4', text: "Qwen 2.5: Необхідно врахувати українське законодавство (GDPR/КСЗІ). Шифрування даних на рівні полів обов'язкове.", thought: "Сканування нормативної бази..." },
            { id: 'm5', text: "Llama 3 (Local): Всі обчислення мають залишатися on-premise. Жодних хмар для чутливих даних.", thought: "Перевірка ресурсів GPU..." }
        ];

        for (let i = 0; i < proposals.length; i++) {
            if (!isMounted.current) return;
            const p = proposals[i];
            updateModelStatus(p.id, 'THINKING', p.thought);
            await new Promise(r => setTimeout(r, 900)); // Varied timing
            updateModelStatus(p.id, 'WAITING', 'Гіпотезу сформовано');
            addMessage({ id: `msg-${i}`, modelId: p.id, modelName: models.find(m => m.id === p.id)?.name || '', type: 'ARGUMENT', content: p.text, timestamp: new Date() });
            setProgress((i + 1) * 8);
        }

        // 2. CROSS-CRITIQUE PHASE (Перехресний допит)
        if (!isMounted.current) return;
        setPhase('CROSS_CRITIQUE');
        await new Promise(r => setTimeout(r, 1000));

        const critiques = [
            { source: 'm6', target: 'm2', text: "Критика: DeepSeek занадто повільний для HFT (High-Frequency Trading) задач. Користувач не чекатиме 5 секунд." },
            { source: 'm2', target: 'm6', text: "Відповідь: Швидкість без точності — це галюцинація. Фінансовий моніторинг вимагає 99.9% precision." },
            { source: 'm1', target: 'm5', text: "Критика: Llama 8B занадто слабка для складних юридичних контекстів. Потрібен API-фалбек." },
            { source: 'm4', target: 'm3', text: "Зауваження: RAG без семантичного ранжування дасть багато шуму." }
        ];

        for (let i = 0; i < critiques.length; i++) {
            if (!isMounted.current) return;
            const c = critiques[i];
            updateModelStatus(c.source, 'DEBATING', `Аналіз аргументів ${c.target}...`);
            await new Promise(r => setTimeout(r, 1500));
            updateModelStatus(c.source, 'WAITING');
            addMessage({ 
                id: `crit-${i}`, 
                modelId: c.source, 
                modelName: models.find(m => m.id === c.source)?.name || '', 
                type: 'CRITIQUE', 
                content: c.text, 
                timestamp: new Date(),
                targetModelId: c.target
            });
            setProgress(50 + (i * 8));
        }

        // 3. ARBITRATION PHASE (Складний Арбітраж)
        if (!isMounted.current) return;
        setPhase('ARBITRATION');
        updateModelStatus('arbiter', 'THINKING', 'Зважування векторів: Швидкість vs Точність...');
        await new Promise(r => setTimeout(r, 2000));

        addMessage({ 
            id: 'arb-1', 
            modelId: 'arbiter', 
            modelName: 'Gemini 3 Ultra', 
            type: 'FINAL_VERDICT', 
            content: "Аналіз консенсусу: Виявлено конфлікт між стратегією Groq (Latency) та DeepSeek (Accuracy).", 
            timestamp: new Date() 
        });

        // 4. SYNTHESIS & ACTION (Синтез)
        if (!isMounted.current) return;
        setPhase('SYNTHESIS');
        updateModelStatus('arbiter', 'FINALIZING', 'Генерація фінальної інструкції для NAS-агентів...');
        
        // Visual effect for synthesis
        setModels(prev => prev.map(m => ({ ...m, status: 'IDLE' })));
        
        await new Promise(r => setTimeout(r, 1800));

        const finalVerdict = "Фінальне Рішення (System Brain): \n1. Використовувати Groq LPU для первинної фільтрації трафіку (Pre-screening). \n2. Підозрілі транзакції передавати на DeepSeek R1 для глибокого аналізу (Deep Scan). \n3. Зберігати дані on-premise (Llama 3) згідно з протоколом G-01. \n\nІніціюю патч конфігурації...";
        
        addMessage({ 
            id: 'arb-2', 
            modelId: 'arbiter', 
            modelName: 'Gemini 3 Ultra', 
            type: 'CONSENSUS', 
            content: finalVerdict, 
            timestamp: new Date() 
        });
        
        setProgress(100);
        setPhase('DEPLOYMENT');
        updateModelStatus('arbiter', 'IDLE');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <ViewHeader 
                title="System Brain (Мозок Системи)"
                icon={<Sparkles size={20} />}
                breadcrumbs={['INTELLIGENCE', 'SYSTEM BRAIN', 'MULTIMODEL DEBATE']}
                stats={[
                    { label: 'Active Models', value: '6 + 1', icon: <Cpu size={14}/>, color: 'primary' },
                    { label: 'Arbiter', value: 'GEMINI 3', icon: <Scale size={14}/>, color: 'purple', animate: phase === 'ARBITRATION' || phase === 'SYNTHESIS' },
                    { label: 'Phase', value: phase, icon: <Activity size={14}/>, color: phase === 'IDLE' ? 'default' : 'warning' },
                ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: DEBATE ARENA */}
                <div className="lg:col-span-2 space-y-6">
                    <TacticalCard title="Багатомодельна Арена (Live Debate)" className="min-h-[500px] flex flex-col relative overflow-hidden">
                        
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 opacity-50"></div>
                        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

                        {/* Input Area */}
                        <div className="relative z-20 mb-8 flex gap-2">
                            <input 
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && startDebate()}
                                placeholder="Введіть тему для дебатів (напр. 'Баланс між швидкістю Groq та точністю DeepSeek')..."
                                className="flex-1 bg-slate-900/80 border border-slate-700 rounded p-3 text-sm text-slate-200 focus:border-primary-500 outline-none backdrop-blur-sm"
                                disabled={phase !== 'IDLE' && phase !== 'DEPLOYMENT'}
                            />
                            <button 
                                onClick={startDebate}
                                disabled={!topic || (phase !== 'IDLE' && phase !== 'DEPLOYMENT')}
                                className="px-6 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded shadow-lg flex items-center gap-2 transition-all"
                            >
                                <Zap size={18} /> {phase === 'IDLE' || phase === 'DEPLOYMENT' ? 'START DEBATE' : 'DEBATING...'}
                            </button>
                        </div>

                        {/* The Arena Visualization */}
                        <div className="flex-1 relative flex items-center justify-center py-10">
                            
                            {/* Central Arbiter */}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center bg-slate-900 shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all duration-500 ${
                                    phase === 'ARBITRATION' || phase === 'SYNTHESIS' 
                                    ? 'border-white scale-110 shadow-[0_0_60px_rgba(168,85,247,0.5)]' 
                                    : 'border-slate-700'
                                }`}>
                                    <div className="text-3xl font-display font-bold text-white">{arbiter.avatar}</div>
                                    {/* Pulse Ring */}
                                    {(phase === 'ARBITRATION' || phase === 'SYNTHESIS') && <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"></div>}
                                </div>
                                <div className="mt-3 text-center">
                                    <div className="text-xs font-bold text-white uppercase tracking-wider">{arbiter.name}</div>
                                    <div className="text-[9px] text-slate-500 font-mono">{arbiter.status}</div>
                                </div>
                                {/* Thought Bubble */}
                                {arbiter.currentThought && (
                                    <div className="absolute -top-16 bg-slate-800 text-slate-200 text-[10px] p-2 rounded border border-slate-600 max-w-[150px] text-center animate-in fade-in zoom-in">
                                        {arbiter.currentThought}
                                        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-b border-r border-slate-600 rotate-45"></div>
                                    </div>
                                )}
                            </div>

                            {/* Orbiting Models (Now 6) */}
                            {models.map((model, i) => {
                                const angle = (i * (360 / models.length)) - 90; // Start top
                                const radius = 160; // Distance from center
                                const x = Math.cos(angle * (Math.PI / 180)) * radius;
                                const y = Math.sin(angle * (Math.PI / 180)) * radius;
                                
                                const isActive = model.status !== 'IDLE' && model.status !== 'WAITING';

                                return (
                                    <div 
                                        key={model.id}
                                        className="absolute transition-all duration-500"
                                        style={{ transform: `translate(${x}px, ${y}px)` }}
                                    >
                                        <div className="flex flex-col items-center group cursor-pointer relative">
                                            {/* Connector Line to Center */}
                                            <div 
                                                className="absolute top-1/2 left-1/2 h-[2px] bg-gradient-to-r from-transparent via-slate-700 to-transparent -z-10 origin-left"
                                                style={{ 
                                                    width: `${radius}px`, 
                                                    transform: `rotate(${angle + 180}deg)`,
                                                    opacity: isActive ? 1 : 0.2
                                                }}
                                            >
                                                {(isActive || phase === 'SYNTHESIS') && <div className="absolute top-0 left-0 w-full h-full bg-primary-500/50 animate-[pulse_1s_infinite]"></div>}
                                            </div>

                                            <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center bg-slate-900 transition-all duration-300 ${isActive ? 'scale-110 shadow-[0_0_20px_currentColor]' : ''} ${getModelBorderClass(model.id, isActive)}`}>
                                                <span className="font-bold text-lg">{model.avatar}</span>
                                            </div>
                                            
                                            <div className="mt-2 text-center">
                                                <div className="text-[10px] font-bold text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">{model.name}</div>
                                            </div>

                                            {/* Model Thought Bubble */}
                                            {model.currentThought && (
                                                <div className="absolute -top-12 z-20 bg-slate-900/90 text-slate-300 text-[9px] p-2 rounded border border-slate-700 min-w-[120px] max-w-[160px] text-center animate-in fade-in zoom-in shadow-xl">
                                                    {model.currentThought}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                        </div>

                        {/* Phase Indicator */}
                            <div className="absolute bottom-4 left-4 flex items-center gap-4">
                                <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-full text-xs font-mono text-slate-400 flex items-center gap-2">
                                <Activity size={12} className={phase === 'IDLE' ? '' : 'text-primary-500 animate-pulse'} />
                                PHASE: <span className="text-white font-bold">{phase}</span>
                            </div>
                            {phase !== 'IDLE' && (
                                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <progress
                                        className="w-full h-full appearance-none"
                                        value={progress}
                                        max={100}
                                        aria-label="Debate progress"
                                    />
                                    <style>{`progress::-webkit-progress-value{background:#06b6d4}`}</style>
                                </div>
                            )}
                        </div>
                    </TacticalCard>
                </div>

                {/* RIGHT: TRANSCRIPT & LOGS */}
                <div className="space-y-6">
                    <TacticalCard title="Транскрипт Дебатів (Live Stream)" action={
                        <button className="text-slate-500 hover:text-white" onClick={() => setMessages([])} title="Clear Log"><RotateCcw size={14}/></button>
                    }>
                        <div 
                            ref={scrollRef}
                            className="h-[500px] overflow-y-auto custom-scrollbar p-3 space-y-3 bg-slate-950/50 rounded border border-slate-800/50"
                        >
                            {messages.length === 0 && (
                                <div className="text-center text-slate-600 italic mt-20 text-xs">
                                    Очікування початку дебатів...
                                </div>
                            )}
                            {messages.map((msg) => {
                                let msgTypeClass = 'bg-slate-900 border-slate-800';
                                if (msg.type === 'FINAL_VERDICT' || msg.type === 'CONSENSUS') msgTypeClass = 'bg-purple-900/10 border-purple-500/30';
                                else if (msg.type === 'CRITIQUE') msgTypeClass = 'bg-red-900/10 border-red-900/30';
                                return (
                                    <div key={msg.id} className={`flex flex-col gap-1 p-2 rounded border animate-in slide-in-from-right-2 ${msgTypeClass}`}>
                                        <div className="flex justify-between items-center">
                                        <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${msg.modelId === 'arbiter' ? 'text-white' : getModelTextClass(msg.modelId)}`}>
                                            {msg.modelId === 'arbiter' && <Scale size={10} />}
                                            {msg.modelName}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-mono">{msg.timestamp.toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                                        {msg.targetModelId && <span className="text-red-400 font-bold mr-1">@{models.find(m => m.id === msg.targetModelId)?.name}:</span>}
                                        {msg.content}
                                    </p>
                                </div>
                            )})}
                        </div>
                    </TacticalCard>

                    {/* Action Panel */}
                    {phase === 'DEPLOYMENT' && (
                        <div className="p-4 bg-success-900/10 border border-success-500/30 rounded animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle2 size={18} className="text-success-500" />
                                <h4 className="text-sm font-bold text-success-400">Рішення Прийнято</h4>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">Арбітр Gemini 3 сформував фінальну інструкцію для NAS агентів.</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded text-xs font-bold text-slate-300 transition-colors">
                                    <FileText size={12} /> View Report
                                </button>
                                <button className="flex items-center justify-center gap-2 py-2 bg-success-600 hover:bg-success-500 rounded text-xs font-bold text-white transition-colors">
                                    <GitMerge size={12} /> Auto-Implement
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemBrainView;
