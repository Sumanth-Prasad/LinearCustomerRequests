"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface KanbanState {
  id: string;
  name: string;
  color?: string;
}

interface KanbanIssue {
  id: string;
  title: string;
  priority?: number;
  labels?: { name: string; color: string }[];
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  state: {
    id: string;
    name: string;
    color?: string;
  };
}

interface DraggableKanbanBoardProps {
  workflowStates: KanbanState[];
  issuesByState: Record<string, KanbanIssue[]>;
}

export function DraggableKanbanBoard({ 
  workflowStates, 
  issuesByState
}: DraggableKanbanBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isCursorGrabbing, setIsCursorGrabbing] = useState(false);

  // Mouse events for desktop dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!boardRef.current) return;
    
    setIsDragging(true);
    setIsCursorGrabbing(true);
    setStartX(e.pageX - boardRef.current.offsetLeft);
    setScrollLeft(boardRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsCursorGrabbing(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !boardRef.current) return;
    
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    boardRef.current.scrollLeft = scrollLeft - walk;
  };

  // Handle clicks within draggable area
  const handleClickDuringDrag = (e: React.MouseEvent) => {
    // If we were dragging, prevent clicks
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!boardRef.current || e.touches.length !== 1) return;
    
    setIsDragging(true);
    const touch = e.touches[0];
    setStartX(touch.pageX - boardRef.current.offsetLeft);
    setScrollLeft(boardRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !boardRef.current || e.touches.length !== 1) return;
    e.preventDefault(); // Prevent page scrolling
    
    const touch = e.touches[0];
    const x = touch.pageX - boardRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    boardRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add event listeners for window-level mouse up (in case mouse up happens outside the board)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setIsCursorGrabbing(false);
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Render the issue card directly in the client component
  const renderIssueCard = (issue: KanbanIssue) => (
    <div 
      style={{ width: '350px' }}
      className="bg-card rounded-md shadow border border-border hover:shadow-md transition-shadow h-[120px] relative"
    >
      <Link href={`/issue/${issue.id}`} className="block p-4 h-full w-full flex flex-col">
        <div className="flex justify-between items-start w-full mb-3">
          <div className="flex-1 overflow-hidden">
            <h3 className="font-medium text-base text-foreground line-clamp-2 pr-3">
              {issue.title}
            </h3>
          </div>
          
          <div className="pl-6 flex-shrink-0">
            {[1,2,3,4].includes(issue.priority ?? -1) && (
              <span className="text-xs font-semibold text-white whitespace-nowrap inline-block"
              style={{
                backgroundColor: issue.priority === 1 ? "#ef4444" :
                  issue.priority === 2 ? "#f97316" :
                  issue.priority === 3 ? "#eab308" :
                  issue.priority === 4 ? "#6b7280" : "#d1d5db",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem"
              }}>
                {issue.priority === 1 ? "Urgent" : 
                 issue.priority === 2 ? "High" :
                 issue.priority === 3 ? "Medium" : 
                 issue.priority === 4 ? "Low" : ""}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-end mt-auto">
          {/* Labels section */}
          <div className="flex-1 overflow-hidden">
            {issue.labels && issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {issue.labels.map((label, index) => (
                  <span 
                    key={index}
                    className="text-xs font-medium px-2 py-0.5 rounded-full truncate"
                    style={{ 
                      backgroundColor: label.color || '#6b7280',
                      color: 'white'
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Assignee section - moved back to bottom right */}
          {issue.assignee && (
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-primary-foreground flex items-center justify-center text-xs overflow-hidden">
                {issue.assignee.avatarUrl ? (
                  <img 
                    src={issue.assignee.avatarUrl} 
                    alt={issue.assignee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{issue.assignee.name.charAt(0)}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground max-w-[80px] truncate">
                {issue.assignee.name}
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );

  return (
    <div
      ref={boardRef}
      className={`flex gap-6 overflow-x-auto pb-6 ${isCursorGrabbing ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ 
        scrollBehavior: isDragging ? "auto" : "smooth",
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none" // IE/Edge
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onClick={handleClickDuringDrag}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hide scrollbar for Chrome/Safari/Opera */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {workflowStates.map((state) => (
        <div 
          key={state.id} 
          style={{ 
            width: '350px', 
            minWidth: '350px', 
            maxWidth: '350px',
            flexShrink: 0,
            flexGrow: 0
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ 
                backgroundColor: state.color,
                opacity: 1
              }}
            />
            <h2 className="text-lg font-bold text-foreground">{state.name}</h2>
            <span className="ml-auto text-sm text-muted-foreground">
              {issuesByState[state.id]?.length || 0}
            </span>
          </div>
          
          <div className="space-y-4 min-h-[400px]" style={{ width: '350px' }}>
            {issuesByState[state.id]?.map((issue) => (
              <div key={issue.id}>
                {renderIssueCard(issue)}
              </div>
            ))}
            
            {(!issuesByState[state.id] || issuesByState[state.id].length === 0) && (
              <div 
                style={{ width: '350px' }}
                className="h-[120px] p-4 flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-md"
              >
                No issues
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 