import React, { useState, useEffect } from 'react';
import { PRCard, PRStatus, CheckRun, CheckStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { GitPullRequest, GitCommit, ArrowRight, X, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface BoardViewProps {
  prs: PRCard[];
  setPrs: React.Dispatch<React.SetStateAction<PRCard[]>>;
  checks: CheckRun[];
}

const columns = [
  { title: 'Open', status: PRStatus.Open },
  { title: 'In Review', status: PRStatus.InReview },
  { title: 'Changes Req.', status: PRStatus.ChangesRequested },
  { title: 'CI Failing', status: PRStatus.CIFailing },
  { title: 'Mergeable', status: PRStatus.Mergeable },
];

export const BoardView: React.FC<BoardViewProps> = ({ prs, setPrs, checks }) => {
  const [selectedPR, setSelectedPR] = useState<PRCard | null>(null);
  const [enabled, setEnabled] = useState(false);

  // StrictMode workaround for dnd
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Find the dragged PR
    const prId = parseInt(draggableId);
    const prIndex = prs.findIndex(p => p.id === prId);
    if (prIndex === -1) return;

    const newPrs = [...prs];
    const [movedPr] = newPrs.splice(prIndex, 1);
    
    // Update status to new column
    movedPr.status = destination.droppableId as PRStatus;

    newPrs.splice(prIndex, 0, movedPr); 

    setPrs(newPrs);
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Board Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full min-w-max p-4 gap-4">
            {columns.map((col) => {
                const colPRs = prs.filter((pr) => pr.status === col.status);
                return (
                <div key={col.title} className="w-72 flex flex-col bg-panel/50 rounded-lg border border-border h-full">
                    <div className="p-3 border-b border-border bg-panel flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-semibold text-sm text-text">{col.title}</h3>
                        <span className="bg-border text-xs px-2 py-0.5 rounded-full text-muted">{colPRs.length}</span>
                    </div>
                    
                    <Droppable droppableId={col.status}>
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`p-2 flex-1 overflow-y-auto space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-border/20' : ''}`}
                            >
                            {colPRs.map((pr, index) => (
                                <Draggable key={pr.id} draggableId={pr.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            onClick={() => setSelectedPR(pr)}
                                            style={{ ...provided.draggableProps.style }}
                                            className={`p-3 rounded border bg-canvas hover:border-accent cursor-pointer transition-colors shadow-sm group
                                                ${selectedPR?.id === pr.id ? 'border-accent ring-1 ring-accent' : 'border-border'}
                                                ${snapshot.isDragging ? 'opacity-90 rotate-2 scale-105 shadow-lg z-50' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs text-muted font-mono">#{pr.id}</span>
                                                <Badge status={pr.ciStatus} size="sm" />
                                            </div>
                                            <h4 className="text-sm font-medium text-text mb-2 line-clamp-2 group-hover:text-accent transition-colors">{pr.title}</h4>
                                            
                                            <div className="flex items-center gap-1 text-xs text-muted mb-2">
                                                <span className="font-mono bg-border/50 px-1 rounded">{pr.headBranch}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span className="font-mono">{pr.baseBranch}</span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs text-muted border-t border-border pt-2 mt-2">
                                                <div className="flex items-center gap-1">
                                                    <GitCommit className="w-3 h-3" />
                                                    <span className="font-mono">{pr.sha.substring(0,6)}</span>
                                                </div>
                                                <span>{pr.lastUpdated}</span>
                                            </div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            {colPRs.length === 0 && !snapshot.isDraggingOver && (
                                <div className="text-center py-8 text-muted text-xs italic">No PRs</div>
                            )}
                            </div>
                        )}
                    </Droppable>
                </div>
                );
            })}
            </div>
        </div>
      </DragDropContext>

      {/* Details Drawer */}
      {selectedPR && (
        <div className="w-80 border-l border-border bg-panel h-full absolute right-0 top-0 shadow-2xl flex flex-col z-20 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border flex justify-between items-start bg-canvas/30">
                <div>
                    <h3 className="font-bold text-base text-text">PR Details</h3>
                    <span className="text-xs text-muted font-normal">#{selectedPR.id} by {selectedPR.author}</span>
                </div>
                <button onClick={() => setSelectedPR(null)} className="text-muted hover:text-text p-1 hover:bg-border rounded transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Title Section */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Title</label>
                    <p className="text-sm text-text font-medium leading-relaxed">{selectedPR.title}</p>
                </div>
                
                {/* CI Status Section */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted tracking-wider">CI Status</label>
                    <div className="flex">
                        <Badge status={selectedPR.ciStatus} />
                    </div>
                </div>

                {/* Checks List Section (New) */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Workflow Runs</label>
                    <div className="space-y-1.5">
                        {checks.map(check => (
                             <div key={check.id} className="flex items-center justify-between p-2 bg-canvas rounded border border-border text-xs">
                                <span className="text-text">{check.name}</span>
                                {check.status === CheckStatus.Failure ? (
                                    <AlertOctagon className="w-3.5 h-3.5 text-danger" />
                                ) : check.status === CheckStatus.Success ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                ) : (
                                    <span className="w-3.5 h-3.5 border-2 border-muted border-t-transparent rounded-full animate-spin"></span>
                                )}
                             </div>
                        ))}
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Recent Timeline</label>
                    <div className="border-l border-border ml-1 pl-5 py-1 space-y-5 relative">
                        {/* Item 1 */}
                        <div className="relative">
                            <div className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-panel"></div>
                            <p className="text-sm text-text font-medium">New commit pushed</p>
                            <p className="text-[11px] text-muted font-mono mt-0.5">10 mins ago</p>
                        </div>
                        {/* Item 2 */}
                        <div className="relative">
                            <div className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-panel"></div>
                            <p className="text-sm text-text">Review requested</p>
                            <p className="text-[11px] text-muted font-mono mt-0.5">1 hour ago</p>
                        </div>
                        {/* Item 3 */}
                         <div className="relative">
                            <div className="absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-panel"></div>
                            <p className="text-sm text-text">PR Created</p>
                            <p className="text-[11px] text-muted font-mono mt-0.5">2 hours ago</p>
                        </div>
                    </div>
                </div>

                {/* Artifacts Box */}
                <div className="bg-canvas border border-border rounded-md p-3">
                    <h4 className="text-[11px] font-bold text-muted mb-2">Heidi Artifacts</h4>
                    <ul className="space-y-1.5">
                        <li>
                             <a href="#" className="text-xs text-accent hover:underline flex items-center gap-1">
                                coverage-report.xml
                             </a>
                        </li>
                        <li>
                             <a href="#" className="text-xs text-accent hover:underline flex items-center gap-1">
                                bundle-analysis.json
                             </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};