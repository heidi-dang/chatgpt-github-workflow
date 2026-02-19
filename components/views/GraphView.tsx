import React, { useState } from 'react';
import { CommitNode, CheckStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { GitCommit, GitBranch, GitMerge, CheckCircle2, XCircle, FileCode, Search, Filter, ArrowUp, ArrowDown, ExternalLink, Activity, Plus, Minus, FilePlus, FileMinus, FileDiff, Clock, PlayCircle, AlertOctagon } from 'lucide-react';

interface GraphViewProps {
  commits: CommitNode[];
}

type Scope = 'PR Only' | 'All History';
type SortOrder = 'Newest' | 'Oldest';

export const GraphView: React.FC<GraphViewProps> = ({ commits }) => {
  const [selectedSha, setSelectedSha] = useState<string | null>(commits[0]?.sha || null);
  const [scope, setScope] = useState<Scope>('PR Only');
  const [sortOrder, setSortOrder] = useState<SortOrder>('Newest');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCommit = commits.find(c => c.sha === selectedSha) || commits[0];

  const filteredCommits = commits
    .filter(c => c.message.toLowerCase().includes(searchQuery.toLowerCase()) || c.sha.includes(searchQuery))
    .sort((a, b) => {
        if (sortOrder === 'Newest') return 0; 
        return 1;
    });

  return (
    <div className="flex flex-col h-full bg-canvas">
      {/* Top Bar Controls */}
      <div className="flex-none p-3 border-b border-border bg-panel/30 flex flex-col md:flex-row gap-3 justify-between items-center">
         <div className="flex items-center gap-2 w-full md:w-auto">
             {/* Scope Toggle */}
             <div className="bg-canvas border border-border rounded-lg p-0.5 flex">
                {(['PR Only', 'All History'] as Scope[]).map(s => (
                    <button
                        key={s}
                        onClick={() => setScope(s)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            scope === s ? 'bg-panel text-text shadow-sm' : 'text-muted hover:text-text'
                        }`}
                    >
                        {s}
                    </button>
                ))}
             </div>
             
             <div className="h-6 w-px bg-border mx-2 hidden md:block"></div>

             {/* Sort Toggle */}
             <button 
                onClick={() => setSortOrder(sortOrder === 'Newest' ? 'Oldest' : 'Newest')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas border border-border rounded-md text-xs text-muted hover:text-text transition-colors"
             >
                {sortOrder === 'Newest' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                {sortOrder}
             </button>
         </div>

         {/* Search */}
         <div className="relative w-full md:w-64">
             <Search className="absolute left-2.5 top-1.5 w-4 h-4 text-muted" />
             <input 
                type="text" 
                placeholder="Search commits..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-canvas border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-text focus:border-accent outline-none focus:ring-1 focus:ring-accent"
             />
         </div>
      </div>

      {/* Main Layout: Two Pane */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Commit List (Virtualized appearance) */}
        <div className="flex-1 overflow-y-auto p-0 bg-canvas custom-scrollbar">
            <div className="relative min-h-full">
                {/* Vertical Graph Line (Mini DAG Lane) */}
                <div className="absolute left-[29px] top-0 bottom-0 w-0.5 bg-border z-0"></div>

                <div className="divide-y divide-border">
                    {filteredCommits.map((commit) => (
                        <div 
                            key={commit.sha} 
                            onClick={() => setSelectedSha(commit.sha)}
                            className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-panel/60
                                ${selectedSha === commit.sha ? 'bg-panel border-l-2 border-l-accent' : 'border-l-2 border-l-transparent'}
                            `}
                        >
                             {/* Mini DAG Node */}
                            <div 
                                className={`z-10 flex-none w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center bg-canvas transition-colors
                                    ${selectedSha === commit.sha ? 'border-accent scale-110' : 'border-muted'}
                                    ${commit.isMerge ? 'border-purple-500' : ''}
                                `}
                            >
                                {commit.isMerge && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>}
                            </div>

                            {/* Commit Row Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className={`text-sm font-medium truncate pr-2 ${selectedSha === commit.sha ? 'text-accent' : 'text-text'}`}>
                                        {commit.message}
                                    </h4>
                                    <span className="flex-none text-[10px] text-muted whitespace-nowrap">{commit.date}</span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-muted">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded-full bg-border flex items-center justify-center text-[9px] font-bold">
                                            {commit.author.charAt(0).toUpperCase()}
                                        </div>
                                        <span>{commit.author}</span>
                                    </div>
                                    
                                    <span className="font-mono bg-border/30 px-1.5 rounded text-[10px] text-muted border border-border/50">
                                        {commit.sha.substring(0, 7)}
                                    </span>

                                    {commit.branch && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-blue-900/20 text-blue-400 border border-blue-900/40 text-[10px] flex items-center gap-1">
                                            <GitBranch className="w-3 h-3" /> {commit.branch}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Status Icon (Right aligned) */}
                            <div className="flex-none pl-2">
                                {commit.status === CheckStatus.Success ? (
                                    <CheckCircle2 className="w-4 h-4 text-success" />
                                ) : commit.status === CheckStatus.Failure ? (
                                    <XCircle className="w-4 h-4 text-danger" />
                                ) : (
                                    <PlayCircle className="w-4 h-4 text-warning" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right Pane: Sidebar */}
        {selectedCommit && (
            <div className="w-80 border-l border-border bg-panel flex flex-col shadow-xl z-20 h-full">
                {/* Header: Commit Details */}
                <div className="p-5 border-b border-border bg-canvas/30">
                    <div className="flex items-center gap-2 text-xs text-muted mb-2 font-mono">
                        <GitCommit className="w-3.5 h-3.5" />
                        {selectedCommit.sha}
                    </div>
                    <h3 className="text-sm font-semibold text-text leading-snug mb-3 select-text">
                        {selectedCommit.message}
                    </h3>
                    <div className="flex items-center justify-between text-xs">
                         <div className="flex items-center gap-2">
                            <span className="font-medium text-text">{selectedCommit.author}</span>
                         </div>
                         <span className="text-muted">{selectedCommit.date}</span>
                    </div>
                </div>

                {/* Sidebar Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    
                    {/* Checks Summary */}
                    {selectedCommit.checksSummary && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" /> Checks Summary
                            </h4>
                            <div className="bg-canvas border border-border rounded-lg p-3 space-y-3">
                                {/* Counts Grid */}
                                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border">
                                    <div>
                                        <div className="text-lg font-bold text-success">{selectedCommit.checksSummary.passed}</div>
                                        <div className="text-[9px] uppercase text-muted">Passed</div>
                                    </div>
                                    <div>
                                        <div className={`text-lg font-bold ${selectedCommit.checksSummary.failed > 0 ? 'text-danger' : 'text-text'}`}>
                                            {selectedCommit.checksSummary.failed}
                                        </div>
                                        <div className="text-[9px] uppercase text-muted">Failed</div>
                                    </div>
                                    <div>
                                        <div className={`text-lg font-bold ${selectedCommit.checksSummary.running > 0 ? 'text-warning' : 'text-text'}`}>
                                            {selectedCommit.checksSummary.running}
                                        </div>
                                        <div className="text-[9px] uppercase text-muted">Running</div>
                                    </div>
                                </div>

                                {/* Failing Names List */}
                                {selectedCommit.checksSummary.failed > 0 && selectedCommit.checksSummary.failingNames && (
                                    <div className="pt-2 border-t border-border">
                                        <div className="text-[10px] text-muted mb-1.5">Failing:</div>
                                        <div className="space-y-1">
                                            {selectedCommit.checksSummary.failingNames.slice(0, 3).map((name, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 px-2 py-1 rounded">
                                                    <AlertOctagon className="w-3 h-3" />
                                                    <span className="truncate">{name}</span>
                                                </div>
                                            ))}
                                            {selectedCommit.checksSummary.failed > 3 && (
                                                <div className="text-[10px] text-muted text-center">+ {selectedCommit.checksSummary.failed - 3} more</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <button className="w-full text-xs text-accent hover:text-white transition-colors py-1">
                                    Open Checks Tab &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Files Changed */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] uppercase font-bold text-muted tracking-wider flex items-center gap-1.5">
                                <FileCode className="w-3.5 h-3.5" /> Files Changed
                            </h4>
                            {selectedCommit.stats && (
                                <span className="text-[10px] font-mono text-muted">
                                    <span className="text-success">+{selectedCommit.stats.additions}</span>
                                    <span className="mx-1">/</span>
                                    <span className="text-danger">-{selectedCommit.stats.deletions}</span>
                                </span>
                            )}
                        </div>
                        
                        <div className="space-y-1">
                            {selectedCommit.fileChanges?.map((file, idx) => (
                                <div key={idx} className="group flex items-center justify-between p-2 rounded hover:bg-canvas transition-colors border border-transparent hover:border-border text-xs">
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        {file.status === 'added' ? <FilePlus className="w-3.5 h-3.5 text-success flex-none" /> :
                                         file.status === 'deleted' ? <FileMinus className="w-3.5 h-3.5 text-danger flex-none" /> :
                                         <FileDiff className="w-3.5 h-3.5 text-yellow-500 flex-none" />}
                                        <span className="text-text truncate group-hover:text-accent transition-colors" title={file.path}>{file.path}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono flex-none opacity-60 group-hover:opacity-100">
                                        {file.additions > 0 && <span className="text-success">+{file.additions}</span>}
                                        {file.deletions > 0 && <span className="text-danger">-{file.deletions}</span>}
                                    </div>
                                </div>
                            ))}
                            {!selectedCommit.fileChanges && <p className="text-xs text-muted italic">No file changes recorded.</p>}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-border bg-canvas/30 mt-auto">
                    <button className="w-full flex items-center justify-center gap-2 py-2 bg-panel border border-border hover:border-accent hover:text-accent text-text text-xs font-medium rounded transition-colors shadow-sm">
                        View on GitHub <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};