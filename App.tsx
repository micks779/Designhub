
import React, { useState, useEffect, useRef } from 'react';
import { Expense, LogEntry, ProjectState, View, DesignItem, ChatMessage, TimelineMilestone, UserSession } from './types';
import { ICONS, CATEGORIES } from './constants';
import BudgetOverview from './components/BudgetOverview';
import { getProjectInsights } from './services/geminiService';
import { getProject, updateProject, addExpense, deleteExpense, addLog, addMessage, uploadDesignImage, deleteDesign, addMilestone, updateMilestone, deleteMilestone, uploadVoiceNote, subscribeToExpenses, subscribeToLogs, subscribeToMessages, subscribeToDesigns, subscribeToTimeline } from './services/supabaseService';
import { verifyTeamPasskey } from './services/authService';
import { addToQueue, processQueue } from './services/offlineQueue';
import SyncIndicator from './components/SyncIndicator';
import Toast from './components/Toast';
import { isSupabaseConfigured } from './services/supabaseClient';

const STORAGE_KEY = 'design_budget_hub_shared_v5';
const SESSION_KEY = 'design_hub_active_session'; 

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : { name: '', isAuthenticated: false };
  });

  const [project, setProject] = useState<ProjectState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      projectName: 'Modern Loft Project',
      totalBudget: 50000,
      expenses: [],
      logs: [],
      designs: [],
      messages: [],
      timeline: []
    };
  });

  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState<Date | undefined>();
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // Load initial project data from Supabase
  useEffect(() => {
    if (session.isAuthenticated) {
      const loadProject = async () => {
        setIsLoading(true);
        try {
          if (isSupabaseConfigured()) {
            const projectData = await getProject();
            if (projectData) {
              setProject(projectData);
              // Cache locally for offline access
              localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
              setLastSynced(new Date());
            }
          } else {
            // Supabase not configured - use local storage only
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
              setProject(JSON.parse(cached));
            }
            setToast({ message: 'Supabase not configured. Using local storage only.', type: 'info' });
          }
        } catch (error) {
          console.error('Error loading project:', error);
          // Fallback to local cache if available
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            setProject(JSON.parse(cached));
          }
          setToast({ message: 'Error connecting to Supabase. Using local storage.', type: 'error' });
        } finally {
          setIsLoading(false);
        }
      };
      loadProject();
    }
  }, [session.isAuthenticated]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!session.isAuthenticated || !isSupabaseConfigured()) return;

    // Cleanup previous subscriptions
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    try {
      // Subscribe to expenses
      const expenseSub = subscribeToExpenses((expense) => {
        setProject(p => ({ ...p, expenses: [expense, ...p.expenses] }));
        setToast({ message: 'New expense added', type: 'success' });
      });
      subscriptionsRef.current.push(expenseSub);

      // Subscribe to logs
      const logSub = subscribeToLogs((log) => {
        setProject(p => ({ ...p, logs: [log, ...p.logs] }));
        setToast({ message: 'New log entry added', type: 'success' });
      });
      subscriptionsRef.current.push(logSub);

      // Subscribe to messages
      const messageSub = subscribeToMessages((message) => {
        setProject(p => ({ ...p, messages: [...p.messages, message] }));
      });
      subscriptionsRef.current.push(messageSub);

      // Subscribe to designs
      const designSub = subscribeToDesigns((design) => {
        setProject(p => ({ ...p, designs: [design, ...p.designs] }));
        setToast({ message: 'New moodboard item added', type: 'success' });
      });
      subscriptionsRef.current.push(designSub);

      // Subscribe to timeline
      const timelineSub = subscribeToTimeline((milestone) => {
        setProject(p => ({ ...p, timeline: [...p.timeline, milestone].sort((a, b) => a.startDate.localeCompare(b.startDate)) }));
        setToast({ message: 'New milestone added', type: 'success' });
      });
      subscriptionsRef.current.push(timelineSub);
    } catch (error) {
      console.error('Error setting up subscriptions:', error);
    }

    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    };
  }, [session.isAuthenticated]);

  // Offline/Online detection and queue processing
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        const result = await processQueue();
        if (result.success > 0) {
          setToast({ message: `Synced ${result.success} pending changes`, type: 'success' });
        }
        setLastSynced(new Date());
      } catch (error) {
        console.error('Error processing queue:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Process queue on mount if online
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Local cache sync (for offline resilience)
  useEffect(() => {
    if (session.isAuthenticated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    }
  }, [project, session.isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (currentView === View.CHAT) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [project.messages, currentView]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pass = fd.get('password') as string;
    const name = fd.get('username') as string;

    if (!name.trim()) {
      setToast({ message: 'Please enter your name', type: 'error' });
      return;
    }

    // If Supabase is not configured, use simple password check
    if (!isSupabaseConfigured()) {
      if (pass.toLowerCase() === 'team') {
        setSession({ name, isAuthenticated: true });
      } else {
        setToast({ message: 'Access Denied: Incorrect Team Password', type: 'error' });
      }
      return;
    }

    try {
      const isValid = await verifyTeamPasskey(pass);
      if (isValid) {
        setSession({ name, isAuthenticated: true });
      } else {
        setToast({ message: 'Access Denied: Incorrect Team Password', type: 'error' });
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to simple password check
      if (pass.toLowerCase() === 'team') {
        setSession({ name, isAuthenticated: true });
      } else {
        setToast({ message: 'Login failed. Please try again.', type: 'error' });
      }
    }
  };

  const fetchAiInsights = async () => {
    setLoadingAi(true);
    try {
      const insights = await getProjectInsights(project);
      setAiInsight(insights);
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      setAiInsight("The Design AI is taking a short break. Please try again later.");
    } finally {
      setLoadingAi(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const msgId = crypto.randomUUID();
        const msg: ChatMessage = {
          id: msgId,
          sender: session.name,
          audioUrl: '',
          type: 'audio',
          timestamp: new Date().toISOString()
        };

        // Optimistically add to UI
        setProject(p => ({ ...p, messages: [...p.messages, msg] }));

        // Upload to Supabase
        if (isOnline) {
          setIsSyncing(true);
          try {
            const audioUrl = await uploadVoiceNote(audioBlob, session.name, msgId);
            if (audioUrl) {
              const finalMsg: ChatMessage = { ...msg, audioUrl };
              setProject(p => ({ ...p, messages: p.messages.map(m => m.id === msgId ? finalMsg : m) }));
              setLastSynced(new Date());
            } else {
              throw new Error('Upload failed');
            }
          } catch (error) {
            console.error('Error uploading voice note:', error);
            addToQueue({ type: 'message', action: 'add', data: msg });
            setToast({ message: 'Voice note saved offline, will sync when online', type: 'info' });
          } finally {
            setIsSyncing(false);
          }
        } else {
          addToQueue({ type: 'message', action: 'add', data: msg });
          setToast({ message: 'Voice note saved offline', type: 'info' });
        }
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Mic permission needed for voice notes.");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const handleAddMilestone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nm: TimelineMilestone = {
      id: crypto.randomUUID(),
      title: fd.get('title') as string,
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string,
      status: 'planned',
      description: fd.get('description') as string,
    };

    // Optimistically update UI
    setProject(p => ({ ...p, timeline: [...p.timeline, nm].sort((a,b) => a.startDate.localeCompare(b.startDate)) }));
    e.currentTarget.reset();

    // Sync to Supabase
    if (isOnline) {
      setIsSyncing(true);
      try {
        await addMilestone(nm);
        setLastSynced(new Date());
        setToast({ message: 'Milestone added', type: 'success' });
      } catch (error) {
        console.error('Error adding milestone:', error);
        addToQueue({ type: 'milestone', action: 'add', data: nm });
        setToast({ message: 'Saved offline, will sync when online', type: 'info' });
      } finally {
        setIsSyncing(false);
      }
    } else {
      addToQueue({ type: 'milestone', action: 'add', data: nm });
      setToast({ message: 'Saved offline', type: 'info' });
    }
  };

  const handleAddDesignItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('image') as File;
    const caption = fd.get('caption') as string;
    
    if (file && file.size > 0) {
      e.currentTarget.reset();

      if (isOnline) {
        setIsSyncing(true);
        try {
          const imageUrl = await uploadDesignImage(file, caption || 'Untitled Inspiration', session.name);
          if (imageUrl) {
            const newItem: DesignItem = {
              id: crypto.randomUUID(),
              url: imageUrl,
              caption: caption || 'Untitled Inspiration',
              author: session.name,
              timestamp: new Date().toISOString()
            };
            setProject(prev => ({ ...prev, designs: [newItem, ...prev.designs] }));
            setLastSynced(new Date());
            setToast({ message: 'Image uploaded successfully', type: 'success' });
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          // Fallback to base64 for offline
          const reader = new FileReader();
          reader.onloadend = () => {
            const newItem: DesignItem = {
              id: crypto.randomUUID(),
              url: reader.result as string,
              caption: caption || 'Untitled Inspiration',
              author: session.name,
              timestamp: new Date().toISOString()
            };
            setProject(prev => ({ ...prev, designs: [newItem, ...prev.designs] }));
            setToast({ message: 'Image saved locally, will sync when online', type: 'info' });
          };
          reader.readAsDataURL(file);
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Offline: use base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const newItem: DesignItem = {
            id: crypto.randomUUID(),
            url: reader.result as string,
            caption: caption || 'Untitled Inspiration',
            author: session.name,
            timestamp: new Date().toISOString()
          };
          setProject(prev => ({ ...prev, designs: [newItem, ...prev.designs] }));
          setToast({ message: 'Image saved offline', type: 'info' });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAddLogEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const content = fd.get('content') as string;
    const type = fd.get('type') as LogEntry['type'];
    
    if (content.trim()) {
      const newLog: LogEntry = {
        id: crypto.randomUUID(),
        author: session.name,
        content,
        type,
        timestamp: new Date().toISOString()
      };

      // Optimistically update UI
      setProject(p => ({ ...p, logs: [newLog, ...p.logs] }));
      e.currentTarget.reset();

      // Sync to Supabase
      if (isOnline) {
        setIsSyncing(true);
        try {
          await addLog(newLog);
          setLastSynced(new Date());
          setToast({ message: 'Log entry added', type: 'success' });
        } catch (error) {
          console.error('Error adding log:', error);
          addToQueue({ type: 'log', action: 'add', data: newLog });
          setToast({ message: 'Saved offline, will sync when online', type: 'info' });
        } finally {
          setIsSyncing(false);
        }
      } else {
        addToQueue({ type: 'log', action: 'add', data: newLog });
        setToast({ message: 'Saved offline', type: 'info' });
      }
    }
  };

  if (!session.isAuthenticated) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border-8 border-white/20">
          <div className="flex flex-col items-center mb-8">
            <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner animate-bounce-slow">
              {ICONS.Lock}
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Team Gate</h1>
            <p className="text-gray-400 text-sm mt-2 font-medium">DesignBudget Hub Secure Access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Who's working today?</label>
              <input name="username" required placeholder="Name (e.g. Sarah - Lead)" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 ring-indigo-500/10 transition-all font-medium" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Team Passkey</label>
              <input name="password" type="password" required placeholder="••••" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 ring-indigo-500/10 transition-all font-bold text-lg" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] hover:bg-indigo-700 active:scale-[0.98] transition-all text-sm uppercase tracking-widest">
              Unlock Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalSpent = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const completedPhases = project.timeline.filter(m => m.status === 'completed').length;
  const progressPercent = project.timeline.length > 0 ? (completedPhases / project.timeline.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 p-8 sticky top-0 h-screen">
        <div className="flex items-center gap-4 mb-12">
          <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">{ICONS.Budget}</div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">DesignHub</h1>
        </div>
        <nav className="flex-1 space-y-2">
          {[
            { id: View.DASHBOARD, label: 'Overview', icon: ICONS.Dashboard },
            { id: View.TIMELINE, label: 'Timeline', icon: ICONS.Timeline },
            { id: View.EXPENSES, label: 'Finances', icon: ICONS.Expenses },
            { id: View.DESIGN, label: 'Moodboard', icon: ICONS.Design },
            { id: View.LOGS, label: 'Daily Logs', icon: ICONS.Logs },
            { id: View.CHAT, label: 'Team Chat', icon: ICONS.Chat }
          ].map(btn => (
            <button 
              key={btn.id}
              onClick={() => setCurrentView(btn.id)} 
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${currentView === btn.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 font-bold translate-x-1' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
            >
              {btn.icon} <span className="text-sm">{btn.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-8 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4">
             <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-600">{session.name.charAt(0)}</div>
             <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-gray-800 truncate">{session.name}</p>
                <p className="text-[10px] text-gray-400">Team Member</p>
             </div>
             <button onClick={() => setCurrentView(View.SETTINGS)} className="text-gray-400 hover:text-indigo-600">{ICONS.Settings}</button>
          </div>
          <button onClick={() => setSession({ name: '', isAuthenticated: false })} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors">Sign Out</button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-h-0 ${currentView === View.CHAT ? 'h-screen' : 'overflow-y-auto'}`}>
        {currentView !== View.CHAT && (
          <div className="p-6 md:p-12 pb-32">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{project.projectName}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {isSupabaseConfigured() ? (
                    <>
                      <SyncIndicator isSyncing={isSyncing} isOnline={isOnline} lastSynced={lastSynced} />
                      <span className="text-gray-400 text-sm font-medium">• Accessing as {session.name}</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-yellow-500 rounded-full"></span>
                      <p className="text-yellow-600 text-xs font-medium">Local Mode • Supabase not configured</p>
                      <span className="text-gray-400 text-sm font-medium">• Accessing as {session.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {currentView === View.DASHBOARD && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6 group hover:shadow-xl hover:shadow-indigo-50/50 transition-all">
                      <div className="p-4 bg-green-50 text-green-600 rounded-2xl transition-transform group-hover:scale-110">{ICONS.Spending}</div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Expenses</p>
                        <p className="text-2xl font-black text-gray-900">£{totalSpent.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6 cursor-pointer group hover:shadow-xl transition-all" onClick={() => setCurrentView(View.TIMELINE)}>
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">{ICONS.Timeline}</div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Phase</p>
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {project.timeline.find(m => m.status === 'in-progress')?.title || 'No Active Build'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-600 p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-45">{ICONS.AI}</div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/10 rounded-lg text-white">{ICONS.AI}</div>
                        <h3 className="font-black text-white text-xl">Project Pulse</h3>
                      </div>
                      {aiInsight ? (
                        <div className="text-indigo-50 font-medium leading-relaxed mb-8 prose prose-invert max-w-none">{aiInsight}</div>
                      ) : (
                        <p className="text-indigo-100/80 mb-8 font-medium italic">"Waiting for project data to provide architectural intelligence..."</p>
                      )}
                      <button onClick={fetchAiInsights} disabled={loadingAi} className="bg-white text-indigo-600 px-8 py-4 rounded-2xl text-sm font-black hover:bg-indigo-50 active:scale-95 transition-all shadow-lg">
                        {loadingAi ? 'Calculating Insights...' : 'Run Performance Audit'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <BudgetOverview project={project} />
                </div>
              </div>
            )}

            {currentView === View.TIMELINE && (
              <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">{ICONS.Plus}</div>
                    <h3 className="text-xl font-black text-gray-900">Add Project Milestone</h3>
                  </div>
                  <form onSubmit={handleAddMilestone} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phase Title</label>
                      <input name="title" required placeholder="e.g. Kitchen Cabinet Fitting" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 ring-indigo-500/5 transition-all font-semibold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start</label>
                      <input name="startDate" type="date" required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Estimated End</label>
                      <input name="endDate" type="date" required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-medium" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Scope Details</label>
                      <textarea name="description" placeholder="Technical notes for the contractor..." className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none h-24 font-medium resize-none" />
                    </div>
                    <button type="submit" className="md:col-span-2 bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all text-sm uppercase tracking-widest">
                      Commit to Schedule
                    </button>
                  </form>
                </div>

                <div className="relative timeline-line space-y-12 py-4">
                  {project.timeline.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center">
                      <div className="p-6 bg-gray-50 text-gray-300 rounded-full mb-4">{ICONS.Timeline}</div>
                      <p className="text-gray-400 font-medium italic">No milestones yet. Add your first project phase above!</p>
                    </div>
                  )}
                  {project.timeline.map((m) => (
                    <div key={m.id} className="relative pl-14">
                      <div className={`absolute left-0 top-2 h-10 w-10 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center z-10 transition-all ${
                        m.status === 'completed' ? 'bg-green-500' : 
                        m.status === 'in-progress' ? 'bg-indigo-600 ring-8 ring-indigo-50' : 
                        m.status === 'delayed' ? 'bg-red-500' : 'bg-gray-200'
                      }`}>
                         {m.status === 'completed' ? <span className="text-white text-xs font-black">✓</span> : <span className="h-1.5 w-1.5 bg-white rounded-full"></span>}
                      </div>
                      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                          <div>
                            <h4 className="text-xl font-black text-gray-900 tracking-tight">{m.title}</h4>
                            <div className="flex items-center gap-4 mt-2">
                               <p className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 uppercase tracking-widest">{ICONS.Date} {m.startDate} — {m.endDate}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select 
                              value={m.status} 
                              onChange={async (e) => {
                                const ns = e.target.value as TimelineMilestone['status'];
                                setProject(p => ({ ...p, timeline: p.timeline.map(item => item.id === m.id ? { ...item, status: ns } : item) }));
                                
                                // Sync to Supabase
                                if (isSupabaseConfigured() && isOnline) {
                                  try {
                                    await updateMilestone(m.id, ns);
                                    setLastSynced(new Date());
                                  } catch (error) {
                                    console.error('Error updating milestone:', error);
                                  }
                                }
                              }}
                              className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none appearance-none cursor-pointer border-none shadow-sm transition-colors ${
                                m.status === 'completed' ? 'bg-green-50 text-green-600' :
                                m.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600' :
                                m.status === 'delayed' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              <option value="planned">Planned</option>
                              <option value="in-progress">In Progress</option>
                              <option value="delayed">Delayed</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete "${m.title}"?`)) {
                                  setProject(p => ({ ...p, timeline: p.timeline.filter(item => item.id !== m.id) }));
                                  
                                  // Sync to Supabase
                                  if (isSupabaseConfigured() && isOnline) {
                                    try {
                                      await deleteMilestone(m.id);
                                      setLastSynced(new Date());
                                      setToast({ message: 'Milestone deleted', type: 'success' });
                                    } catch (error) {
                                      console.error('Error deleting milestone:', error);
                                      setToast({ message: 'Error deleting milestone', type: 'error' });
                                    }
                                  } else {
                                    setToast({ message: 'Milestone deleted locally', type: 'success' });
                                  }
                                }
                              }}
                              className="h-8 w-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                              title="Delete milestone"
                            >
                              {ICONS.Delete}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed font-medium bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-100">{m.description || 'No specific technical notes for this phase.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === View.EXPENSES && (
              <div className="space-y-10 animate-in fade-in">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black text-gray-900 mb-8">Log New Expense</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const ne: Expense = {
                      id: crypto.randomUUID(),
                      name: fd.get('name') as string,
                      amount: parseFloat(fd.get('amount') as string),
                      category: fd.get('category') as string,
                      date: new Date().toISOString(),
                      author: session.name
                    };

                    // Optimistically update UI
                    setProject(p => ({ ...p, expenses: [ne, ...p.expenses] }));
                    e.currentTarget.reset();

                    // Sync to Supabase
                    if (isSupabaseConfigured() && isOnline) {
                      setIsSyncing(true);
                      try {
                        await addExpense(ne);
                        setLastSynced(new Date());
                        setToast({ message: 'Expense recorded', type: 'success' });
                      } catch (error) {
                        console.error('Error adding expense:', error);
                        addToQueue({ type: 'expense', action: 'add', data: ne });
                        setToast({ message: 'Saved offline, will sync when online', type: 'info' });
                      } finally {
                        setIsSyncing(false);
                      }
                    } else if (isSupabaseConfigured()) {
                      addToQueue({ type: 'expense', action: 'add', data: ne });
                      setToast({ message: 'Saved offline', type: 'info' });
                    } else {
                      setToast({ message: 'Expense saved locally', type: 'success' });
                    }
                  }} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Purchased Item</label><input name="name" required placeholder="Luxury Quartz Slab" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 font-semibold" /></div>
                    <div className="md:col-span-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Value (£)</label><input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 font-black text-indigo-600" /></div>
                    <div className="md:col-span-1 space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label><select name="category" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 font-bold">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <button type="submit" className="bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-indigo-100">{ICONS.Plus} Record</button>
                  </form>
                </div>
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <tr><th className="px-8 py-6">Description</th><th className="px-8 py-6">Buyer</th><th className="px-8 py-6 text-right">Cost</th><th className="px-8 py-6"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {project.expenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-8 py-6">
                               <p className="font-bold text-gray-900">{exp.name}</p>
                               <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md uppercase">{exp.category}</span>
                            </td>
                            <td className="px-8 py-6 text-xs font-bold text-gray-400 italic">{exp.author}</td>
                            <td className="px-8 py-6 text-right font-black text-gray-800 text-lg">£{exp.amount.toLocaleString()}</td>
                            <td className="px-8 py-6 text-right"><button onClick={async () => {
                              setProject(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== exp.id) }));
                              if (isOnline) {
                                try {
                                  await deleteExpense(exp.id);
                                  setLastSynced(new Date());
                                } catch (error) {
                                  console.error('Error deleting expense:', error);
                                }
                              }
                            }} className="text-gray-200 hover:text-red-500 transition-colors">{ICONS.Delete}</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {currentView === View.DESIGN && (
              <div className="space-y-10 animate-in fade-in">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black text-gray-900 mb-8">Moodboard Inspiration</h3>
                  <form onSubmit={handleAddDesignItem} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inspiration Photo</label>
                      <input name="image" type="file" accept="image/*" required className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 font-medium text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Context / Caption</label>
                      <input name="caption" placeholder="Living room texture idea..." className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 font-semibold" />
                    </div>
                    <button type="submit" className="bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg">Post Inspiration</button>
                  </form>
                </div>
                
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
                  {project.designs.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center">
                      <div className="p-6 bg-gray-50 text-gray-300 rounded-full mb-4">{ICONS.Design}</div>
                      <p className="text-gray-400 font-medium italic">Your project moodboard is empty. Start posting inspiration!</p>
                    </div>
                  )}
                  {project.designs.map((item) => (
                    <div key={item.id} className="break-inside-avoid bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                      <div className="relative overflow-hidden">
                        <img src={item.url} alt={item.caption} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={async () => {
                            setProject(p => ({ ...p, designs: p.designs.filter(d => d.id !== item.id) }));
                            if (isOnline) {
                              try {
                                await deleteDesign(item.id, item.url);
                                setLastSynced(new Date());
                              } catch (error) {
                                console.error('Error deleting design:', error);
                              }
                            }
                          }} className="h-8 w-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 shadow-sm">
                            {ICONS.Delete}
                          </button>
                        </div>
                      </div>
                      <div className="p-6">
                        <p className="font-bold text-gray-800 leading-tight mb-4">{item.caption}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{item.author}</span>
                          <span className="text-[8px] font-bold text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === View.LOGS && (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black text-gray-900 mb-8">Site Report Log</h3>
                  <form onSubmit={handleAddLogEntry} className="space-y-6">
                    <div className="flex gap-4">
                      {['update', 'plan', 'issue'].map((type) => (
                        <label key={type} className="flex-1 cursor-pointer">
                          <input type="radio" name="type" value={type} defaultChecked={type === 'update'} className="hidden peer" />
                          <div className="py-3 text-center rounded-2xl border border-gray-100 bg-gray-50 peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 transition-all text-[10px] font-black uppercase tracking-widest">
                            {type}
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Today's Progress / Blockers</label>
                      <textarea name="content" required placeholder="Describe site activities, deliveries or issues..." className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 h-32 font-medium resize-none" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all text-sm uppercase tracking-widest">
                      Submit Daily Report
                    </button>
                  </form>
                </div>

                <div className="space-y-6">
                  {project.logs.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center">
                      <div className="p-6 bg-gray-50 text-gray-300 rounded-full mb-4">{ICONS.Logs}</div>
                      <p className="text-gray-400 font-medium italic">No site reports logged yet.</p>
                    </div>
                  )}
                  {project.logs.map((log) => (
                    <div key={log.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center font-black text-indigo-600">
                            {log.author.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm tracking-tight">{log.author}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          log.type === 'issue' ? 'bg-red-50 text-red-500' :
                          log.type === 'plan' ? 'bg-indigo-50 text-indigo-500' :
                          'bg-green-50 text-green-500'
                        }`}>
                          {log.type}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed font-medium whitespace-pre-wrap">{log.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === View.SETTINGS && (
              <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in">
                <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
                  <div className="h-24 w-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl font-black mb-6 shadow-inner">
                    {session.name.charAt(0)}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">{session.name}</h3>
                  <p className="text-indigo-500 text-xs font-black uppercase tracking-widest mb-10">Active Team Contributor</p>
                  
                  <div className="w-full space-y-8">
                    {/* Fulfill PID requirement: "Set a total budget" */}
                    <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 text-left">
                       <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Global Project Settings</h4>
                       <div className="space-y-4">
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Project Name</label>
                            <input 
                              value={project.projectName} 
                              onChange={(e) => setProject(p => ({ ...p, projectName: e.target.value }))}
                              onBlur={async () => {
                                if (isOnline) {
                                  try {
                                    await updateProject({ projectName: project.projectName });
                                    setLastSynced(new Date());
                                  } catch (error) {
                                    console.error('Error updating project:', error);
                                  }
                                }
                              }}
                              className="w-full px-5 py-3 mt-1 bg-white border border-gray-100 rounded-xl outline-none font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Total Project Budget (£)</label>
                            <input 
                              type="number"
                              value={project.totalBudget} 
                              onChange={(e) => setProject(p => ({ ...p, totalBudget: parseFloat(e.target.value) || 0 }))}
                              onBlur={async () => {
                                if (isOnline) {
                                  try {
                                    await updateProject({ totalBudget: project.totalBudget });
                                    setLastSynced(new Date());
                                  } catch (error) {
                                    console.error('Error updating project:', error);
                                  }
                                }
                              }}
                              className="w-full px-5 py-3 mt-1 bg-white border border-gray-100 rounded-xl outline-none font-black text-indigo-600"
                            />
                          </div>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => setSession({ name: '', isAuthenticated: false })}
                      className="w-full py-5 rounded-[1.5rem] bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-colors"
                    >
                      Sign Out and Clear Session
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === View.CHAT && (
          <div className="flex-1 flex flex-col bg-[#efeae2] relative h-full">
             <div className="bg-white text-gray-900 p-6 flex items-center justify-between shadow-sm sticky top-0 z-20 border-b border-gray-200/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-100">{session.name.charAt(0)}</div>
                  <div>
                    <h3 className="font-black text-gray-900 tracking-tight">Team Project Sync</h3>
                    <div className="flex items-center gap-1.5">
                       <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secured Cloud Channel</p>
                    </div>
                  </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {project.messages.map((msg) => {
                  const isMe = msg.sender === session.name;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[75%] rounded-[1.5rem] px-6 py-4 shadow-sm relative ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                          {!isMe && <p className="text-[9px] font-black text-indigo-500 mb-1.5 uppercase tracking-widest">{msg.sender}</p>}
                          
                          {msg.type === 'audio' ? (
                            <div className="flex items-center gap-3 min-w-[180px] py-1">
                               <div className={`h-10 w-10 ${isMe ? 'bg-white/10' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                                 {ICONS.Play}
                               </div>
                               <audio src={msg.audioUrl} controls className={`h-8 w-full ${isMe ? 'invert' : ''}`} />
                            </div>
                          ) : (
                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                          )}
                          
                          <p className={`text-[8px] font-black mt-2 text-right opacity-50`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
             </div>

             <div className="bg-white p-6 border-t border-gray-100 flex items-center gap-4 sticky bottom-0 z-20 pb-24 md:pb-6">
                <form onSubmit={async (e) => {
                   e.preventDefault();
                   const fd = new FormData(e.currentTarget);
                   const txt = fd.get('message') as string;
                   if (txt.trim()) {
                     const m: ChatMessage = { id: crypto.randomUUID(), sender: session.name, text: txt, type: 'text', timestamp: new Date().toISOString() };
                     
                     // Optimistically update UI
                     setProject(p => ({ ...p, messages: [...p.messages, m] }));
                     e.currentTarget.reset();

                     // Sync to Supabase
                     if (isOnline) {
                       try {
                         await addMessage(m);
                         setLastSynced(new Date());
                       } catch (error) {
                         console.error('Error adding message:', error);
                         addToQueue({ type: 'message', action: 'add', data: m });
                       }
                     } else {
                       addToQueue({ type: 'message', action: 'add', data: m });
                     }
                   }
                }} className="flex-1 flex items-center gap-3">
                   {isRecording ? (
                     <div className="flex-1 bg-red-50 rounded-2xl flex items-center justify-between px-6 py-4 border-2 border-red-500/20">
                        <div className="flex items-center gap-2">
                           <span className="h-2 w-2 bg-red-500 rounded-full animate-ping"></span>
                           <span className="text-red-500 font-black text-[10px] uppercase tracking-widest">Audio Recording...</span>
                        </div>
                        <button type="button" onClick={stopRecording} className="h-10 w-10 bg-red-500 text-white rounded-xl flex items-center justify-center">{ICONS.Stop}</button>
                     </div>
                   ) : (
                     <input name="message" autoComplete="off" placeholder="Update the team..." className="flex-1 bg-gray-50 px-6 py-4 rounded-2xl outline-none text-sm font-medium border border-gray-100 focus:bg-white focus:ring-4 ring-indigo-500/5 transition-all" />
                   )}
                   
                   {!isRecording && (
                     <button type="button" onClick={startRecording} className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm hover:bg-indigo-100 active:scale-90 transition-all">
                       {ICONS.Mic}
                     </button>
                   )}
                   <button type="submit" className="h-14 w-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all">
                     {ICONS.Send}
                   </button>
                </form>
             </div>
          </div>
        )}
      </main>

      {/* Mobile Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-8 flex justify-between items-center z-50">
        {[
          { id: View.DASHBOARD, label: 'Home', icon: ICONS.Dashboard },
          { id: View.TIMELINE, label: 'Timeline', icon: ICONS.Timeline },
          { id: View.EXPENSES, label: 'Finances', icon: ICONS.Expenses },
          { id: View.CHAT, label: 'Chat', icon: ICONS.Chat },
          { id: View.SETTINGS, label: 'Account', icon: ICONS.Settings }
        ].map(nav => (
          <button key={nav.id} onClick={() => setCurrentView(nav.id)} className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all ${currentView === nav.id ? 'text-indigo-600' : 'text-gray-300'}`}>
            <div className={`p-1.5 rounded-xl ${currentView === nav.id ? 'bg-indigo-50' : ''}`}>{nav.icon}</div>
            <span className="text-[8px] font-black uppercase tracking-widest">{nav.label}</span>
          </button>
        ))}
      </nav>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-bold">Loading project data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
