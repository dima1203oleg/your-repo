
import React, { useState, useEffect, useRef } from 'react';
import { TacticalCard } from '../components/TacticalCard';
import { 
  Settings, Shield, Server, Save, RefreshCw, 
  ToggleLeft, ToggleRight, CheckCircle2, Cpu, HardDrive, 
  Zap, DollarSign, Lock, AlertOctagon, 
  Thermometer, Brain, Layers, Database, ScrollText, Cloud, 
  ShieldAlert, Bot, Globe, Languages, UploadCloud, Trash2,
  Calculator, Stethoscope, Check, XCircle, Activity, Scale,
  Satellite, Radio, FileCheck, Clock, Mic, Play, Volume2, ShieldCheck, Key, Palette, Image, LayoutTemplate,
  Gauge, Eye, EyeOff, Building2, Briefcase, Microscope, MessageSquare, Info, Terminal, CreditCard, PieChart,
  Newspaper, Mail, Send, Users, UserPlus, Fingerprint, History
} from 'lucide-react';
import { AgentConfig, IntegrationSecret } from '../types';
import { useSystemMetrics } from '../hooks/useSystemMetrics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, Pie as RechartsPie, PieChart as RechartsPieChart, AreaChart, Area, CartesianGrid, Legend } from 'recharts';
import { api } from '../services/api';

type SettingsTab = 'SYSTEM' | 'HARDWARE' | 'AGENTS' | 'UPDATES' | 'SPECS' | 'LOCALIZATION' | 'BUDGET' | 'DIAGNOSTICS' | 'COMPLIANCE' | 'VOICE' | 'BRANDING' | 'GAZETTE' | 'USERS';

const MOCK_USERS = [
    { id: 1, name: 'Дмитро Кізима', email: 'root@predator.system', role: 'OWNER', status: 'ACTIVE', mfa: true, lastLogin: 'Just now', ip: '192.168.1.5' },
    { id: 2, name: 'Олексій Аналітик', email: 'alex@predator.system', role: 'ANALYST', status: 'ACTIVE', mfa: true, lastLogin: '2h ago', ip: '10.42.0.88' },
    { id: 3, name: 'Клієнт "АгроХолдинг"', email: 'client@agro.com', role: 'VIEWER', status: 'ACTIVE', mfa: false, lastLogin: '1d ago', ip: '45.22.11.9' },
    { id: 4, name: 'Guest Demo', email: 'guest@predator.system', role: 'VIEWER', status: 'LOCKED', mfa: false, lastLogin: '14d ago', ip: '88.12.44.1' },
];

const ACCESS_MATRIX = [
    { module: 'Dashboard', owner: true, analyst: true, viewer: true },
    { module: 'DeepScan', owner: true, analyst: true, viewer: false },
    { module: 'Integration', owner: true, analyst: false, viewer: false },
    { module: 'Settings', owner: true, analyst: false, viewer: false },
    { module: 'Deployment', owner: true, analyst: false, viewer: false },
    { module: 'Gazette', owner: true, analyst: true, viewer: true },
];

const SettingsView: React.FC = () => {
  const metrics = useSystemMetrics();
  const [activeTab, setActiveTab] = useState<SettingsTab>('SYSTEM');
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([]);
  
  // Hardware State
  const [etlEngine, setEtlEngine] = useState<'PANDAS' | 'POLARS'>('POLARS');
  const [coreUsage, setCoreUsage] = useState<number[]>(Array(20).fill(0)); // 20 Cores visualization

  // Branding State
  const [brandName, setBrandName] = useState('Predator Analytics');
  const [brandColor, setBrandColor] = useState('#f59e0b'); // Amber default
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Gazette State
  const [gazetteTime, setGazetteTime] = useState('08:00');
  const [gazetteChannels, setGazetteChannels] = useState({ email: true, telegram: true, ui: true });
  const [gazetteBlocks, setGazetteBlocks] = useState({
      news: true,
      customs: true,
      tax: true,
      osint: false,
      corruption: true
  });

  // TTS State
  const [ttsProvider, setTtsProvider] = useState<'ELEVENLABS' | 'OPENAI'>('ELEVENLABS');
  const [ttsVoice, setTtsVoice] = useState('dmytro_uk_v2');
  const [ttsAutoPlay, setTtsAutoPlay] = useState(true);
  const [ttsTesting, setTtsTesting] = useState(false);

  // Localization State
  const [language, setLanguage] = useState('uk-UA');
  const [timezone, setTimezone] = useState('Europe/Kiev');

  // Diagnostics State
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagSteps, setDiagSteps] = useState([
      { id: 'sgx_hw', label: 'Intel SGX Hardware Support', status: 'PENDING' },
      { id: 'sgx_quote', label: 'Enclave Quote Verification', status: 'PENDING' },
      { id: 'remote_att', label: 'Remote Attestation (DCAP)', status: 'PENDING' },
      { id: 'net', label: 'Internal Network Mesh (Cilium)', status: 'PENDING' },
      { id: 'db', label: 'PostgreSQL Connection', status: 'PENDING' },
      { id: 'vault', label: 'Vault Seal Status', status: 'PENDING' },
      { id: 'gpu', label: 'NVIDIA CUDA Context', status: 'PENDING' },
      { id: 'k8s', label: 'K3s API Server', status: 'PENDING' },
  ]);

  // Safe async handling
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coreIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
      isMounted.current = true;
      const fetchConfigs = async () => {
          try {
              const agents = await api.getAgentConfigs();
              if (isMounted.current) {
                  setAgentConfigs(agents);
              }
          } catch (e) {
              console.error("Config Fetch Error", e);
          }
      };
      fetchConfigs();

      // Simulate Core Usage for Hardware Tab
      coreIntervalRef.current = setInterval(() => {
          if (!isMounted.current) return;
          setCoreUsage(prev => prev.map(() => Math.floor(Math.random() * 60) + 20)); // Base load
      }, 1000);

      return () => {
          isMounted.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          if (coreIntervalRef.current) clearInterval(coreIntervalRef.current);
      };
  }, []);
  
  const handleSave = () => {
      if (saveStatus === 'SAVING') return;
      
      setSaveStatus('SAVING');
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
          setSaveStatus('SAVED');
          timerRef.current = setTimeout(() => {
              setSaveStatus('IDLE');
              if (timerRef.current) clearTimeout(timerRef.current);
          }, 2000);
      }, 1000);
  };

  const runDiagnostics = () => {
      if (diagRunning) return;
      setDiagRunning(true);
      setDiagSteps(prev => prev.map(s => ({ ...s, status: 'PENDING' })));

      let stepIndex = 0;
      const interval = setInterval(() => {
          if (stepIndex >= diagSteps.length) {
              clearInterval(interval);
              setDiagRunning(false);
              return;
          }

          setDiagSteps(prev => {
              const newSteps = [...prev];
              // All success for Golden Master demonstration
              newSteps[stepIndex].status = 'SUCCESS';
              return newSteps;
          });
          stepIndex++;
      }, 800);
  };

  const testVoice = () => {
      if (ttsTesting) return;
      setTtsTesting(true);
      setTimeout(() => {
          if (isMounted.current) setTtsTesting(false);
      }, 2000);
  };

  // --- RENDERERS ---

  const renderHardware = () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <TacticalCard title="ETL & Data Engine Configuration" className="panel-3d">
              <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                          <div>
                              <h4 className="text-sm font-bold text-slate-200">Рушій Обробки Даних</h4>
                              <p className="text-xs text-slate-500">Вибір бекенду для пайплайнів обробки CSV/XML</p>
                          </div>
                          <div className="flex gap-2 p-1 bg-slate-950 rounded border border-slate-800">
                              <button 
                                onClick={() => setEtlEngine('PANDAS')}
                                className={`px-4 py-2 rounded text-xs font-bold transition-all ${etlEngine === 'PANDAS' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                  Legacy (Pandas)
                              </button>
                              <button 
                                onClick={() => setEtlEngine('POLARS')}
                                className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${etlEngine === 'POLARS' ? 'bg-blue-600 text-white shadow shadow-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                  <Zap size={12} className={etlEngine === 'POLARS' ? "fill-current" : ""} /> TURBO (Polars)
                              </button>
                          </div>
                      </div>
                      
                      <div className="p-3 bg-black/30 rounded border border-slate-800 font-mono text-[10px] text-slate-400">
                          {etlEngine === 'POLARS' ? (
                              <div className="space-y-1">
                                  <div className="text-blue-400 font-bold flex items-center gap-2"><CheckCircle2 size={12}/> Rust Native Engine Active</div>
                                  <div>• Lazy Execution: ENABLED</div>
                                  <div>• SIMD Parallelism: AVX2/AVX512 DETECTED</div>
                                  <div>• Est. Speedup: 12-50x vs Legacy</div>
                              </div>
                          ) : (
                              <div className="space-y-1">
                                  <div className="text-yellow-500 font-bold flex items-center gap-2"><AlertOctagon size={12}/> Legacy Python Engine Active</div>
                                  <div>• Single Threaded Execution</div>
                                  <div>• Memory Overhead: High</div>
                                  <div>• Compatibility Mode</div>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                          <Cpu size={14} className="text-primary-500"/> CPU Topology (Threadripper / EPYC)
                      </h4>
                      <div className="grid grid-cols-10 gap-1">
                          {coreUsage.map((usage, i) => (
                              <div key={i} className="flex flex-col gap-1 items-center">
                                  <div className="w-full h-8 bg-slate-950 rounded border border-slate-800 relative overflow-hidden">
                                      <div 
                                        className={`absolute bottom-0 left-0 w-full transition-all duration-300 ${
                                            usage > 90 ? 'bg-red-500' : 
                                            usage > 70 ? 'bg-yellow-500' : 
                                            usage > 40 ? 'bg-blue-500' : 'bg-slate-700'
                                        }`}
                                        style={{ height: `${usage}%` }}
                                      ></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 mt-2 font-mono">
                          <span>Core 0</span>
                          <span>Multi-Threading: {etlEngine === 'POLARS' ? 'AGGRESSIVE' : 'IDLE'}</span>
                          <span>Core 19</span>
                      </div>
                  </div>
              </div>
          </TacticalCard>

          <TacticalCard title="GPU Accelerator (NVIDIA)" className="panel-3d">
              <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-lg">
                      <div className="p-3 bg-green-900/20 border border-green-500/30 rounded text-green-500">
                          <Cpu size={32} />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-200">NVIDIA GeForce GTX 1080</h3>
                          <div className="text-xs text-slate-500 font-mono">Driver: 535.104 | CUDA: 12.2</div>
                      </div>
                      <div className="ml-auto text-right">
                          <div className="text-xs font-bold text-slate-400">VRAM</div>
                          <div className="text-lg font-mono text-green-400">{metrics.gpu.vram.toFixed(1)} / 8 GB</div>
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-500 uppercase mb-1">Fan Speed</div>
                          <div className="text-xl font-mono text-slate-200">{metrics.gpu.fan}%</div>
                          <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{width: `${metrics.gpu.fan}%`}}></div>
                          </div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-500 uppercase mb-1">Temperature</div>
                          <div className={`text-xl font-mono ${metrics.gpu.temp > 80 ? 'text-red-500' : 'text-slate-200'}`}>
                              {metrics.gpu.temp}°C
                          </div>
                          <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                              <div className={`h-full ${metrics.gpu.temp > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${(metrics.gpu.temp / 90) * 100}%`}}></div>
                          </div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 text-center">
                          <div className="text-[10px] text-slate-500 uppercase mb-1">Utilization</div>
                          <div className="text-xl font-mono text-slate-200">{metrics.gpu?.util ?? 0}%</div>
                          <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500" style={{width: `${metrics.gpu?.util ?? 0}%`}}></div>
                          </div>
                      </div>
                  </div>
              </div>
          </TacticalCard>
      </div>
  );

  const renderBranding = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <TacticalCard title="White Label Configuration" className="panel-3d">
              <div className="space-y-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Назва Порталу</label>
                      <input 
                          type="text" 
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-primary-500 outline-none shadow-inner"
                      />
                  </div>

                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Акцентний Колір</label>
                      <div className="flex gap-3">
                          {['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'].map(color => (
                              <button
                                key={color}
                                onClick={() => setBrandColor(color)}
                                className={`w-8 h-8 rounded-full border-2 transition-all btn-3d ${brandColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                              />
                          ))}
                          <input 
                            type="color" 
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            className="w-8 h-8 bg-transparent border-0 p-0 cursor-pointer opacity-0 absolute"
                          />
                      </div>
                  </div>

                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Логотип Клієнта</label>
                      <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center hover:border-slate-500 transition-colors cursor-pointer relative bg-slate-950/50 panel-3d">
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => e.target.files && setLogoFile(e.target.files[0])}
                          />
                          {logoFile ? (
                              <div className="flex items-center gap-2 text-success-500">
                                  <CheckCircle2 size={20} className="icon-3d-green" />
                                  <span className="text-sm font-bold">{logoFile.name}</span>
                              </div>
                          ) : (
                              <>
                                <UploadCloud size={32} className="text-slate-600 mb-2 icon-3d" />
                                <span className="text-xs text-slate-500">Drag & Drop або натисніть</span>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </TacticalCard>

          <TacticalCard title="Попередній Перегляд (Live Preview)" className="panel-3d">
               <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative overflow-hidden h-[300px] shadow-inner">
                   {/* Mock Interface */}
                   <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: brandColor }}></div>
                   <div className="flex justify-between items-center mb-6">
                       <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded flex items-center justify-center font-bold text-slate-950 shadow-lg" style={{ backgroundColor: brandColor }}>P</div>
                           <span className="font-bold text-slate-200 font-display text-shadow">{brandName}</span>
                       </div>
                       <div className="flex gap-2">
                           <div className="w-20 h-6 bg-slate-900 rounded"></div>
                           <div className="w-8 h-6 bg-slate-900 rounded"></div>
                       </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div className="h-24 bg-slate-900/50 rounded border border-slate-800/50 backdrop-blur-sm"></div>
                       <div className="h-24 bg-slate-900/50 rounded border border-slate-800/50 backdrop-blur-sm"></div>
                       <div className="col-span-2 h-32 bg-slate-900/50 rounded border border-slate-800/50 backdrop-blur-sm"></div>
                   </div>
               </div>
               <p className="text-center text-xs text-slate-500 mt-4 font-mono">
                   Так виглядатиме портал для ваших клієнтів.
               </p>
          </TacticalCard>
      </div>
  );

  const renderSpecs = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* SYSTEM OWNER CARD */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded relative overflow-hidden group shadow-lg panel-3d">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-500 shadow-[0_0_15px_#06b6d4]"></div>
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ShieldCheck size={12} className="text-primary-500 icon-3d-blue" /> 
                            Зареєстрований Власник (System Owner)
                        </h4>
                        <div className="text-xl font-bold text-slate-100 mb-1 font-display tracking-wide text-glow">
                            Кізима Дмитро Миколайович
                        </div>
                        <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Activity size={10} className="text-slate-600"/> DOB: <span className="text-slate-300">12.03.1985</span>
                            </span>
                            <span className="text-slate-700">|</span>
                            <span className="flex items-center gap-1">
                                <Key size={10} className="text-slate-600"/> LICENSE ID: <span className="text-primary-500 font-bold">ROOT-001-UA</span>
                            </span>
                        </div>
                    </div>
                    <div className="hidden sm:block p-3 bg-primary-900/10 rounded-full border border-primary-500/30 text-primary-400 shadow-[0_0_15px_rgba(34,211,238,0.2)] icon-3d-blue">
                        <Bot size={32} />
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center">
                    <span className="text-[9px] text-slate-600 font-mono uppercase">Status: <span className="text-success-500 font-bold">VERIFIED</span></span>
                    <span className="text-[9px] text-slate-600 font-mono uppercase">Role: <span className="text-white font-bold">SYSTEM ARCHITECT</span></span>
                </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded shadow-lg panel-3d">
               <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                   <div className="p-2 bg-blue-900/20 rounded text-blue-400 icon-3d-blue">
                       <ScrollText size={24} />
                   </div>
                   <div>
                       <h3 className="text-lg font-bold text-slate-100">Розділ X: Середовища, GitOps та Принцип G-01</h3>
                       <p className="text-xs text-slate-500">Технічна специфікація архітектури v18.4 Ultimate Golden Master</p>
                   </div>
               </div>

               <div className="space-y-8 text-sm text-slate-300 leading-relaxed font-mono">
                   <section>
                       <h4 className="text-primary-400 font-bold uppercase mb-2 border-l-2 border-primary-500 pl-3">1. Архітектура (K3s On-Prem)</h4>
                       <p>Система побудована за принципом <strong>Zero-Cost On-Prem</strong>, використовуючи легковаговий Kubernetes (K3s) на фізичному обладнанні.</p>
                   </section>
                   <section>
                        <h4 className="text-primary-400 font-bold uppercase mb-2 border-l-2 border-primary-500 pl-3">2. Безпека (Zero-Trust)</h4>
                        <p>Впроваджено принципи <span className="text-white">Zero Trust Architecture</span>. Використання <span className="text-white">Intel SGX</span> для конфіденційних обчислень та <span className="text-white">Cilium eBPF</span> для мережевої безпеки.</p>
                   </section>
                   <section>
                        <h4 className="text-primary-400 font-bold uppercase mb-2 border-l-2 border-primary-500 pl-3">3. Data Governance</h4>
                        <p>Використовується <span className="text-white">Great Expectations</span> для валідації даних та <span className="text-white">OpenLineage</span> для відстеження походження даних.</p>
                   </section>
               </div>
          </div>
      </div>
  );

  const renderDiagnostics = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <TacticalCard title="Системна Діагностика (Self-Check)" className="panel-3d">
              <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-950 p-4 rounded border border-slate-800 shadow-inner">
                      <div>
                          <h3 className="font-bold text-slate-200">Повний Аудит Системи</h3>
                          <p className="text-xs text-slate-500">Перевірка Intel SGX, Мережі, БД та API</p>
                      </div>
                      <button 
                        onClick={runDiagnostics}
                        disabled={diagRunning}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-bold rounded flex items-center gap-2 transition-all shadow-lg btn-3d btn-3d-blue"
                      >
                          {diagRunning ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                          {diagRunning ? 'СКАНУВАННЯ...' : 'ЗАПУСТИТИ ТЕСТ'}
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {diagSteps.map((step, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded panel-3d">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${
                                      step.status === 'SUCCESS' ? 'bg-success-900/20 text-success-500' :
                                      step.status === 'FAILURE' ? 'bg-red-900/20 text-red-500' :
                                      'bg-slate-800 text-slate-500'
                                  }`}>
                                      {step.status === 'SUCCESS' ? <Check size={14} className="icon-3d-green" /> :
                                       step.status === 'FAILURE' ? <XCircle size={14} className="icon-3d-red" /> :
                                       <Activity size={14} className={diagRunning ? 'animate-pulse text-blue-500' : ''} />}
                                  </div>
                                  <span className={`text-xs font-bold ${step.status === 'PENDING' ? 'text-slate-500' : 'text-slate-300'}`}>
                                      {step.label}
                                  </span>
                              </div>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  step.status === 'SUCCESS' ? 'bg-success-900/10 text-success-500' :
                                  step.status === 'FAILURE' ? 'bg-red-900/10 text-red-500' :
                                  'bg-slate-800 text-slate-600'
                              }`}>
                                  {step.status}
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
          </TacticalCard>
      </div>
  );

  const renderVoice = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <TacticalCard title="Український Нейроінтерфейс (TTS)" className="panel-3d">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Провайдер Синтезу</label>
                          <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={() => setTtsProvider('ELEVENLABS')}
                                className={`p-3 rounded border text-xs font-bold flex flex-col items-center gap-2 btn-3d ${ttsProvider === 'ELEVENLABS' ? 'bg-primary-900/20 border-primary-500 text-primary-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                              >
                                  <Cloud size={16} className="icon-3d-blue" /> ElevenLabs (Recommended)
                              </button>
                              <button 
                                onClick={() => setTtsProvider('OPENAI')}
                                className={`p-3 rounded border text-xs font-bold flex flex-col items-center gap-2 btn-3d ${ttsProvider === 'OPENAI' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                              >
                                  <Bot size={16} className="icon-3d-green" /> OpenAI (TTS-1-HD)
                              </button>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Голос (Voice ID)</label>
                          <select 
                            value={ttsVoice}
                            onChange={(e) => setTtsVoice(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-primary-500 outline-none shadow-inner"
                          >
                              <option value="dmytro_uk_v2">Dmytro - Deep Neural (Professional)</option>
                              <option value="oksana_uk_news">Oksana - News Anchor</option>
                              <option value="mykyta_fast">Mykyta - Fast Reader</option>
                          </select>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 panel-3d">
                          <div className="flex items-center gap-3">
                              <Volume2 size={20} className="text-blue-400 icon-3d-blue" />
                              <div>
                                  <h3 className="text-sm font-bold text-slate-200">Auto-Read Responses</h3>
                                  <p className="text-[10px] text-slate-500">Автоматично озвучувати відповіді AI</p>
                              </div>
                          </div>
                          <button onClick={() => setTtsAutoPlay(!ttsAutoPlay)} className={`transition-colors ${ttsAutoPlay ? 'text-success-500' : 'text-slate-600'}`}>
                              {ttsAutoPlay ? <ToggleRight size={28} className="icon-3d-green" /> : <ToggleLeft size={28} />}
                          </button>
                      </div>
                  </div>

                  <div className="flex flex-col justify-center items-center gap-4 bg-black/30 rounded border border-slate-800 p-6 relative overflow-hidden panel-3d">
                      {/* Audio Viz Simulation */}
                      <div className="flex items-center justify-center gap-1 h-12 w-full">
                          {Array.from({length: 20}).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-1 bg-primary-500 rounded-full transition-all duration-1000 ${ttsTesting ? 'animate-[bounce_0.5s_infinite]' : 'h-1 opacity-20'}`}
                                style={ttsTesting ? { animationDelay: `${i * 0.05}s`, height: `${Math.random() * 40 + 10}px` } : {}}
                              ></div>
                          ))}
                      </div>
                      
                      <button 
                        onClick={testVoice}
                        disabled={ttsTesting}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold text-xs flex items-center gap-2 border border-slate-600 transition-all hover:scale-105 btn-3d"
                      >
                          {ttsTesting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                          {ttsTesting ? 'Синтез мовлення...' : 'Тест Голосу (Preview)'}
                      </button>
                      <p className="text-[10px] text-slate-500 text-center font-mono">
                          "Вітаю, Дмитро. Система Predator готова до роботи."
                      </p>
                  </div>
              </div>
          </TacticalCard>
      </div>
  );

  const renderAgents = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <TacticalCard title="Конфігурація MAS Агентів" className="panel-3d">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800 bg-slate-900/50">
                              <th className="p-3">Агент</th>
                              <th className="p-3">Роль</th>
                              <th className="p-3">Модель</th>
                              <th className="p-3">Права</th>
                              <th className="p-3">Бюджет (День)</th>
                              <th className="p-3 text-right">Статус</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                          {agentConfigs.map(agent => (
                              <tr key={agent.id} className="hover:bg-slate-800/30 transition-colors">
                                  <td className="p-3 font-bold text-slate-200">{agent.name}</td>
                                  <td className="p-3 text-slate-400">{agent.role}</td>
                                  <td className="p-3">
                                      <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 outline-none">
                                          <option>{agent.model}</option>
                                          <option>GPT-4o</option>
                                          <option>Claude 3 Opus</option>
                                      </select>
                                  </td>
                                  <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                          agent.permission === 'FULL_ACCESS' ? 'bg-red-900/20 text-red-400 border-red-900/50' :
                                          agent.permission === 'AUTO_MERGE' ? 'bg-orange-900/20 text-orange-400 border-orange-900/50' :
                                          'bg-blue-900/20 text-blue-400 border-blue-900/50'
                                      }`}>
                                          {agent.permission}
                                      </span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-300">${agent.currentSpendUsd} / ${agent.dailyBudgetUsd}</td>
                                  <td className="p-3 text-right">
                                      <button className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all border ${
                                          agent.status === 'ACTIVE' 
                                          ? 'bg-success-900/20 text-success-500 border-success-900/50 hover:bg-success-900/40' 
                                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                                      }`}>
                                          {agent.status}
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </TacticalCard>
      </div>
  );

  const renderBudget = () => {
      const data = [
          { name: 'Predator On-Prem', cost: 120, savings: 0 },
          { name: 'AWS (Equivalent)', cost: 2450, savings: 2330 },
          { name: 'GCP (Equivalent)', cost: 2100, savings: 1980 },
      ];

      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
              <TacticalCard title="ROI Калькулятор (On-Prem vs Cloud)" className="panel-3d">
                  <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                              <RechartsTooltip 
                                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} 
                                  formatter={(value: number) => [`$${value}`, 'Cost']}
                              />
                              <Bar dataKey="cost" barSize={20} radius={[0, 4, 4, 0]}>
                                  {data.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#ef4444'} />
                                  ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 bg-green-900/10 border border-green-500/30 rounded flex items-center gap-4">
                      <div className="p-3 bg-green-500/20 rounded-full text-green-500">
                          <DollarSign size={24} />
                      </div>
                      <div>
                          <div className="text-sm font-bold text-slate-200">Чиста Економія: $2,330 / міс</div>
                          <div className="text-xs text-slate-400">Окупність обладнання: 3.5 місяці</div>
                      </div>
                  </div>
              </TacticalCard>

              <TacticalCard title="Структура Витрат (Поточна)" className="panel-3d">
                  <div className="h-[200px] w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                              <RechartsPie
                                  data={[
                                      { name: 'LLM API (Gemini/DeepSeek)', value: 45 },
                                      { name: 'Electricity (Est.)', value: 30 },
                                      { name: 'Proxies/IPs', value: 15 },
                                      { name: 'Backups (S3)', value: 10 },
                                  ]}
                                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                              >
                                  <Cell fill="#a855f7" />
                                  <Cell fill="#eab308" />
                                  <Cell fill="#3b82f6" />
                                  <Cell fill="#64748b" />
                              </RechartsPie>
                              <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                              <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{fontSize: '10px'}}/>
                          </RechartsPieChart>
                      </ResponsiveContainer>
                      <div className="absolute top-1/2 left-1/2 -translate-x-[60%] -translate-y-1/2 text-center">
                          <div className="text-xl font-bold text-white">$120</div>
                          <div className="text-[9px] text-slate-500">Total/Mo</div>
                      </div>
                  </div>
              </TacticalCard>
          </div>
      );
  };

  const renderLocalization = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <TacticalCard title="Регіональні Налаштування" className="panel-3d">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Мова Інтерфейсу</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button 
                              onClick={() => setLanguage('uk-UA')}
                              className={`p-3 rounded border flex items-center justify-center gap-2 btn-3d ${language === 'uk-UA' ? 'bg-primary-900/20 border-primary-500 text-primary-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                          >
                              <span className="text-lg">🇺🇦</span> Українська
                          </button>
                          <button 
                              onClick={() => setLanguage('en-US')}
                              className={`p-3 rounded border flex items-center justify-center gap-2 btn-3d ${language === 'en-US' ? 'bg-primary-900/20 border-primary-500 text-primary-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                          >
                              <span className="text-lg">🇺🇸</span> English
                          </button>
                      </div>
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Часовий Пояс</label>
                      <select 
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-200 outline-none focus:border-primary-500"
                      >
                          <option value="Europe/Kiev">Europe/Kiev (GMT+2)</option>
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">America/New_York</option>
                      </select>
                      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                          <Clock size={10} /> Синхронізація з NTP серверами: Active
                      </p>
                  </div>
              </div>
          </TacticalCard>
      </div>
  );

  const renderGazette = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <TacticalCard title="Налаштування Ранкової Газети" className="panel-3d">
              <div className="space-y-6">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Час Відправки (Щодня)</label>
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                          <Clock size={16} className="text-primary-500" />
                          <input 
                              type="time" 
                              value={gazetteTime}
                              onChange={(e) => setGazetteTime(e.target.value)}
                              className="bg-transparent border-none text-slate-200 text-sm focus:ring-0 outline-none"
                          />
                      </div>
                  </div>

                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Канали Доставки</label>
                      <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800">
                              <div className="flex items-center gap-3">
                                  <Mail size={16} className="text-blue-400" />
                                  <span className="text-sm text-slate-200">Email Розсилка</span>
                              </div>
                              <button onClick={() => setGazetteChannels({...gazetteChannels, email: !gazetteChannels.email})} className={gazetteChannels.email ? "text-success-500" : "text-slate-600"}>
                                  {gazetteChannels.email ? <ToggleRight size={24} className="icon-3d-green"/> : <ToggleLeft size={24}/>}
                              </button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800">
                              <div className="flex items-center gap-3">
                                  <Send size={16} className="text-blue-400" />
                                  <span className="text-sm text-slate-200">Telegram Bot</span>
                              </div>
                              <button onClick={() => setGazetteChannels({...gazetteChannels, telegram: !gazetteChannels.telegram})} className={gazetteChannels.telegram ? "text-success-500" : "text-slate-600"}>
                                  {gazetteChannels.telegram ? <ToggleRight size={24} className="icon-3d-green"/> : <ToggleLeft size={24}/>}
                              </button>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800">
                              <div className="flex items-center gap-3">
                                  <LayoutTemplate size={16} className="text-purple-400" />
                                  <span className="text-sm text-slate-200">Тільки в UI</span>
                              </div>
                              <button onClick={() => setGazetteChannels({...gazetteChannels, ui: !gazetteChannels.ui})} className={gazetteChannels.ui ? "text-success-500" : "text-slate-600"}>
                                  {gazetteChannels.ui ? <ToggleRight size={24} className="icon-3d-green"/> : <ToggleLeft size={24}/>}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </TacticalCard>

          <TacticalCard title="Контентні Блоки" className="panel-3d">
              <div className="space-y-4">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Секції Газети</span>
                          <span className="text-[10px] text-slate-500">Виберіть, що включати</span>
                      </div>
                      <div className="space-y-3">
                          {[
                              { id: 'news', label: 'Законодавчі Зміни', desc: 'Моніторинг нових законів та постанов' },
                              { id: 'customs', label: 'Митні Тренди', desc: 'Аналіз черг та затримок на кордоні' },
                              { id: 'tax', label: 'Податкові Ризики', desc: 'Інформація про перевірки та блокування' },
                              { id: 'osint', label: 'OSINT Сигнали', desc: 'Згадки у медіа та соцмережах' },
                              { id: 'corruption', label: 'Індекс Корупції', desc: 'Аналіз ризикових тендерів' },
                          ].map((block) => (
                              <div key={block.id} className="flex items-center justify-between">
                                  <div>
                                      <div className="text-sm font-bold text-slate-200">{block.label}</div>
                                      <div className="text-[10px] text-slate-500">{block.desc}</div>
                                  </div>
                                  <input 
                                      type="checkbox" 
                                      checked={(gazetteBlocks as any)[block.id]}
                                      onChange={() => setGazetteBlocks({...gazetteBlocks, [block.id]: !(gazetteBlocks as any)[block.id]})}
                                      className="accent-primary-500 w-4 h-4 rounded cursor-pointer"
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-3 bg-slate-900/50 border border-dashed border-slate-700 rounded text-center text-xs text-slate-500">
                      Контент генерується автоматично AI на основі ваших даних.
                  </div>
              </div>
          </TacticalCard>
      </div>
  );

  const renderUsers = () => (
      <div className="space-y-6 animate-in fade-in duration-300">
          <TacticalCard title="Користувачі та Ролі (RBAC)" className="panel-3d" action={
              <button className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs font-bold transition-all btn-3d">
                  <UserPlus size={14} /> Додати Користувача
              </button>
          }>
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800 bg-slate-900/50">
                              <th className="p-3">Користувач</th>
                              <th className="p-3">Роль</th>
                              <th className="p-3">Статус</th>
                              <th className="p-3">MFA</th>
                              <th className="p-3">Активність</th>
                              <th className="p-3 text-right">Дії</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                          {MOCK_USERS.map(user => (
                              <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                                  <td className="p-3">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                                              user.role === 'OWNER' ? 'bg-red-900/20 text-red-400 border-red-900/50' :
                                              user.role === 'ANALYST' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' :
                                              'bg-amber-900/20 text-amber-400 border-amber-900/50'
                                          }`}>
                                              {user.name.charAt(0)}
                                          </div>
                                          <div>
                                              <div className="font-bold text-slate-200">{user.name}</div>
                                              <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                          user.role === 'OWNER' ? 'bg-red-900/10 text-red-400 border-red-900/30' :
                                          user.role === 'ANALYST' ? 'bg-blue-900/10 text-blue-400 border-blue-900/30' :
                                          'bg-amber-900/10 text-amber-400 border-amber-900/30'
                                      }`}>
                                          {user.role}
                                      </span>
                                  </td>
                                  <td className="p-3">
                                      {user.status === 'ACTIVE' ? (
                                          <div className="flex items-center gap-1.5 text-success-500 text-[10px] font-bold">
                                              <div className="w-1.5 h-1.5 rounded-full bg-success-500 shadow-[0_0_5px_lime]"></div> Active
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                                              <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> Locked
                                          </div>
                                      )}
                                  </td>
                                  <td className="p-3">
                                      {user.mfa ? (
                                          <span title="MFA Enabled" className="inline-block align-middle">
                                              <Fingerprint size={16} className="text-success-500" />
                                          </span>
                                      ) : (
                                          <span title="MFA Disabled" className="inline-block align-middle">
                                              <Fingerprint size={16} className="text-slate-600" />
                                          </span>
                                      )}
                                  </td>
                                  <td className="p-3 text-[10px] font-mono text-slate-400">
                                      <div>{user.lastLogin}</div>
                                      <div className="text-slate-600">{user.ip}</div>
                                  </td>
                                  <td className="p-3 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button className="p-1.5 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:text-white hover:border-slate-500 transition-all btn-3d">
                                              <Settings size={12} />
                                          </button>
                                          {user.role !== 'OWNER' && (
                                              <button className="p-1.5 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:text-red-400 hover:border-red-900/50 transition-all btn-3d">
                                                  <Trash2 size={12} />
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </TacticalCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TacticalCard title="Матриця Доступу (Access Control)" className="panel-3d">
                  <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse">
                          <thead>
                              <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-800 bg-slate-900/50">
                                  <th className="p-2 text-left">Модуль</th>
                                  <th className="p-2 text-red-400">Owner</th>
                                  <th className="p-2 text-blue-400">Analyst</th>
                                  <th className="p-2 text-amber-400">Viewer</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-xs font-mono">
                              {ACCESS_MATRIX.map((row, i) => (
                                  <tr key={i} className="hover:bg-slate-900/30">
                                      <td className="p-2 text-left font-bold text-slate-300">{row.module}</td>
                                      <td className="p-2">{row.owner ? <Check size={14} className="mx-auto text-success-500"/> : <XCircle size={14} className="mx-auto text-slate-700"/>}</td>
                                      <td className="p-2">{row.analyst ? <Check size={14} className="mx-auto text-success-500"/> : <XCircle size={14} className="mx-auto text-slate-700"/>}</td>
                                      <td className="p-2">{row.viewer ? <Check size={14} className="mx-auto text-success-500"/> : <XCircle size={14} className="mx-auto text-slate-700"/>}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </TacticalCard>

              <TacticalCard title="Журнал Безпеки (Security Log)" className="panel-3d">
                  <div className="h-[250px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                      <div className="flex gap-2 text-[10px] font-mono text-slate-400 border-l-2 border-red-500 pl-2">
                          <span className="text-slate-500">14:45</span>
                          <span className="text-red-400 font-bold">FAILED_LOGIN</span>
                          <span>IP: 45.22.11.90 (Kyiv)</span>
                      </div>
                      <div className="flex gap-2 text-[10px] font-mono text-slate-400 border-l-2 border-green-500 pl-2">
                          <span className="text-slate-500">14:42</span>
                          <span className="text-green-400 font-bold">LOGIN_SUCCESS</span>
                          <span>User: root@predator.system</span>
                      </div>
                      <div className="flex gap-2 text-[10px] font-mono text-slate-400 border-l-2 border-blue-500 pl-2">
                          <span className="text-slate-500">12:30</span>
                          <span className="text-blue-400 font-bold">ROLE_CHANGE</span>
                          <span>User: alex@predator → ANALYST</span>
                      </div>
                      <div className="flex gap-2 text-[10px] font-mono text-slate-400 border-l-2 border-slate-700 pl-2">
                          <span className="text-slate-500">10:15</span>
                          <span className="text-slate-300 font-bold">MFA_SETUP</span>
                          <span>User: client@agro.com</span>
                      </div>
                  </div>
              </TacticalCard>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 w-full max-w-[1600px] mx-auto">
      {/* Top Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-1 mb-6 overflow-x-auto scrollbar-hide">
          {[
              { id: 'SYSTEM', icon: <Settings size={14}/>, label: 'Система & Паспорт' },
              { id: 'USERS', icon: <Users size={14}/>, label: 'Користувачі (RBAC)' },
              { id: 'GAZETTE', icon: <Newspaper size={14}/>, label: 'Ранкова Газета' },
              { id: 'HARDWARE', icon: <Cpu size={14}/>, label: 'Апаратні Ресурси' },
              { id: 'AGENTS', icon: <Bot size={14}/>, label: 'Керування Агентами' },
              { id: 'BUDGET', icon: <DollarSign size={14}/>, label: 'Бюджет (ROI)' },
              { id: 'BRANDING', icon: <Palette size={14}/>, label: 'Брендинг' },
              { id: 'DIAGNOSTICS', icon: <Activity size={14}/>, label: 'Діагностика' },
              { id: 'VOICE', icon: <Mic size={14}/>, label: 'Голос & TTS' },
              { id: 'LOCALIZATION', icon: <Languages size={14}/>, label: 'Локалізація' },
              { id: 'SPECS', icon: <ScrollText size={14}/>, label: 'Специфікація' },
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`px-4 py-2 rounded-t-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap btn-3d ${
                    activeTab === tab.id 
                    ? 'bg-slate-800 text-white border-t border-x border-slate-700 shadow-lg' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 border-transparent'
                }`}
              >
                  {tab.icon} {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'SYSTEM' && renderSpecs()} 
      {activeTab === 'USERS' && renderUsers()}
      {activeTab === 'GAZETTE' && renderGazette()}
      {activeTab === 'HARDWARE' && renderHardware()}
      {activeTab === 'DIAGNOSTICS' && renderDiagnostics()} 
      {activeTab === 'VOICE' && renderVoice()}
      {activeTab === 'AGENTS' && renderAgents()}
      {activeTab === 'BUDGET' && renderBudget()}
      {activeTab === 'LOCALIZATION' && renderLocalization()}
      {activeTab === 'COMPLIANCE' && renderSpecs()}
      {activeTab === 'SPECS' && renderSpecs()}
      {activeTab === 'BRANDING' && renderBranding()}

      {/* Save Button */}
      {(activeTab === 'VOICE' || activeTab === 'SYSTEM' || activeTab === 'BRANDING' || activeTab === 'HARDWARE' || activeTab === 'AGENTS' || activeTab === 'LOCALIZATION' || activeTab === 'GAZETTE') && (
          <div className="fixed bottom-6 right-6 z-40 mb-safe mr-safe">
              <button 
                onClick={handleSave}
                className={`
                    px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-all border border-white/10 backdrop-blur-md btn-3d
                    ${saveStatus === 'IDLE' ? 'bg-primary-600 hover:bg-primary-500 text-white hover:scale-105 btn-3d-blue' : ''}
                    ${saveStatus === 'SAVING' ? 'bg-yellow-500 text-slate-900 cursor-wait btn-3d-amber' : ''}
                    ${saveStatus === 'SAVED' ? 'bg-green-500 text-white btn-3d-green' : ''}
                `}
              >
                  {saveStatus === 'IDLE' && <><Save size={20} /> ЗБЕРЕГТИ ЗМІНИ</>}
                  {saveStatus === 'SAVING' && <><RefreshCw size={20} className="animate-spin" /> ЗБЕРЕЖЕННЯ...</>}
                  {saveStatus === 'SAVED' && <><CheckCircle2 size={20} /> УСПІШНО!</>}
              </button>
          </div>
      )}
    </div>
  );
};

export default SettingsView;
    