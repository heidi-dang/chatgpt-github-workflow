import React, { useState } from 'react';
import { CheckRun, CheckStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { ChevronRight, ChevronDown, Terminal, ExternalLink, Clock, PlayCircle, Filter } from 'lucide-react';

interface ChecksViewProps {
  checks: CheckRun[];
}

type FilterType = 'All' | 'Failing' | 'Running' | 'Success';

export const ChecksView: React.FC<ChecksViewProps> = ({ checks }) => {
  const [expandedCheckId, setExpandedCheckId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  const toggleExpand = (id: number) => {
    setExpandedCheckId(expandedCheckId === id ? null : id);
  };

  const filteredChecks = checks.filter(check => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Failing') return check.status === CheckStatus.Failure;
    if (activeFilter === 'Running') return check.status === CheckStatus.Running || check.status === CheckStatus.Queued;
    if (activeFilter === 'Success') return check.status === CheckStatus.Success;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted mr-2" />
        {(['All', 'Failing', 'Running', 'Success'] as FilterType[]).map(filter => (
            <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeFilter === filter 
                    ? 'bg-accent text-white' 
                    : 'bg-panel border border-border text-muted hover:text-text'
                }`}
            >
                {filter}
            </button>
        ))}
      </div>

      <div className="p-4 h-full overflow-y-auto">
        <div className="border border-border rounded-lg bg-panel overflow-hidden">
            <div className="bg-canvas/50 px-4 py-2 border-b border-border flex justify-between items-center text-xs text-muted font-medium">
                <span>WORKFLOW</span>
                <span>STATUS</span>
            </div>
            
            {filteredChecks.length === 0 && (
                <div className="p-8 text-center text-muted text-sm">
                    No checks matching "{activeFilter}"
                </div>
            )}

            {filteredChecks.map((check) => (
            <div key={check.id} className="border-b border-border last:border-0">
                <div 
                    className="flex items-center justify-between p-4 hover:bg-canvas transition-colors cursor-pointer"
                    onClick={() => toggleExpand(check.id)}
                >
                    <div className="flex items-center gap-3">
                        <button className="text-muted hover:text-text">
                            {expandedCheckId === check.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm text-text flex items-center gap-2">
                                {check.name}
                                <ExternalLink className="w-3 h-3 text-muted hover:text-accent" />
                            </span>
                            <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                <PlayCircle className="w-3 h-3" /> Started at {check.startedAt}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs text-muted flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3" /> {check.duration}
                            </div>
                        </div>
                        <Badge status={check.status} />
                    </div>
                </div>

                {/* Expanded Details */}
                {expandedCheckId === check.id && (
                    <div className="bg-canvas border-t border-border p-4 animate-in slide-in-from-top-1">
                        <h4 className="text-xs font-bold text-muted uppercase mb-3">Steps</h4>
                        <div className="space-y-1 mb-4">
                            {check.steps.map((step, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-panel group">
                                    <span className="text-text group-hover:text-accent transition-colors">{step.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge status={step.status} size="sm" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Log Excerpt if failed */}
                        {check.steps.find(s => s.status === CheckStatus.Failure)?.log && (
                            <div className="mt-4">
                                <h4 className="text-xs font-bold text-danger uppercase mb-2 flex items-center gap-2">
                                    <Terminal className="w-3 h-3" /> Error Log
                                </h4>
                                <div className="bg-black/50 border border-border rounded p-3 font-mono text-xs text-red-300 overflow-x-auto">
                                    <code>
                                        {check.steps.find(s => s.status === CheckStatus.Failure)?.log}
                                        <br/>
                                        at process.run (node_modules/runner/index.js:42:10)
                                        <br/>
                                        &gt; Process exited with code 1
                                    </code>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};