import React, { useState, useEffect } from 'react';
import { Tab, PRCard, CommitNode, CheckRun, TeamMember } from './types';
import { generatePRs, generateCommits, generateChecks, generateTeam } from './services/mockData';
import { BoardView } from './components/views/BoardView';
import { GraphView } from './components/views/GraphView';
import { ChecksView } from './components/views/ChecksView';
import { TeamView } from './components/views/TeamView';
import { SettingsView } from './components/views/SettingsView';
import { ChatGptUiView } from './components/views/ChatGptUiView'; // Import new view
import { RefreshCw, Maximize2, GitPullRequest } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<Tab>(Tab.ChatGptUi); // Default to new tab for demo
  const [repo, setRepo] = useState('owner/repo');
  const [prId, setPrId] = useState('50');
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data State
  const [prs, setPrs] = useState<PRCard[]>([]);
  const [commits, setCommits] = useState<CommitNode[]>([]);
  const [checks, setChecks] = useState<CheckRun[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  // Simulate Data Fetch
  const fetchData = () => {
    setIsRefreshing(true);
    // Simulate network delay
    setTimeout(() => {
        setPrs(generatePRs());
        setCommits(generateCommits());
        setChecks(generateChecks());
        setTeam(generateTeam());
        
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString());
        setIsRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    fetchData();
    // Auto refresh every 30s mocked
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Board: return <BoardView prs={prs} setPrs={setPrs} checks={checks} />;
      case Tab.Graph: return <GraphView commits={commits} />;
      case Tab.Checks: return <ChecksView checks={checks} />;
      case Tab.Team: return <TeamView members={team} />;
      case Tab.Settings: return <SettingsView />;
      case Tab.ChatGptUi: return (
        <ChatGptUiView 
            prs={prs} 
            commits={commits} 
            checks={checks} 
            repo={repo}
            lastUpdated={lastUpdated}
            onRefresh={fetchData}
            isRefreshing={isRefreshing}
        />
      );
      default: return <div className="p-4 text-muted">Select a tab</div>;
    }
  };

  // Specialized Layout for ChatGPT UI Tab (Hides standard header to use its own optimized one)
  if (activeTab === Tab.ChatGptUi) {
      return (
        <div className="flex flex-col h-screen bg-canvas text-text font-sans">
             <div className="flex-none bg-panel border-b border-border px-3 py-1 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
                        <GitPullRequest className="text-white w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-text">Workflow Monitor</span>
                </div>
                <nav className="flex items-center gap-3">
                    {Object.values(Tab).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${
                                activeTab === tab 
                                ? 'text-accent' 
                                : 'text-muted hover:text-text'
                            }`}
                        >
                            {tab === Tab.ChatGptUi ? 'Chat UI' : tab}
                        </button>
                    ))}
                </nav>
             </div>
             <main className="flex-1 overflow-hidden relative">
                {renderContent()}
             </main>
        </div>
      );
  }

  // Standard Layout
  return (
    <div className="flex flex-col h-screen bg-canvas text-text font-sans">
      {/* Widget Header Bar */}
      <header className="bg-panel border-b border-border p-3 flex-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Branding & Repo Select */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <GitPullRequest className="text-white w-5 h-5" />
            </div>
            <div>
                 <h1 className="text-sm font-bold text-text leading-tight">Workflow Monitor</h1>
                 <div className="flex items-center gap-2 mt-0.5">
                    <input 
                        type="text" 
                        value={repo} 
                        onChange={(e) => setRepo(e.target.value)}
                        className="bg-canvas border border-border rounded px-1.5 py-0.5 text-xs text-muted focus:text-text focus:border-accent outline-none w-24 md:w-32 transition-colors"
                    />
                    <span className="text-muted text-xs">/</span>
                    <div className="relative">
                        <span className="absolute left-1.5 top-0.5 text-muted text-xs">#</span>
                        <input 
                            type="text" 
                            value={prId} 
                            onChange={(e) => setPrId(e.target.value)}
                            className="bg-canvas border border-border rounded pl-4 pr-1.5 py-0.5 text-xs text-muted focus:text-text focus:border-accent outline-none w-14 transition-colors"
                        />
                    </div>
                 </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3 justify-between md:justify-end">
             <div className="text-[10px] text-muted text-right hidden sm:block">
                 <p>Last updated: {lastUpdated}</p>
                 <p className="flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                    Auto-refresh ON
                 </p>
             </div>
             
             <div className="flex items-center gap-1">
                 <button 
                    onClick={fetchData}
                    disabled={isRefreshing}
                    className="p-1.5 hover:bg-border rounded text-muted hover:text-text transition-colors disabled:opacity-50"
                    title="Refresh Data"
                 >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                 </button>
                 <button className="p-1.5 hover:bg-border rounded text-muted hover:text-text transition-colors" title="Expand">
                    <Maximize2 className="w-4 h-4" />
                 </button>
             </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex items-center gap-6 mt-3 px-1">
            {Object.values(Tab).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-xs font-medium pb-2 border-b-2 transition-colors ${
                        activeTab === tab 
                        ? 'border-accent text-accent' 
                        : 'border-transparent text-muted hover:text-text hover:border-border'
                    }`}
                >
                    {tab === Tab.ChatGptUi ? 'Chat UI' : tab}
                </button>
            ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
      </main>
      
      {/* Mobile Footer Spacing (optional safe area) */}
      <div className="h-0 md:hidden"></div>
    </div>
  );
};

export default App;