'use client';

import React, { useRef, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useVideoStore, Clip } from '@/store/useVideoStore';

const PX_PER_SECOND = 80;
const TRACK_HEIGHT = 56;

function SortableClip({ clip }: { clip: Clip }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: clip.id });
  const selectClip = useVideoStore((s) => s.selectClip);
  const selectedClipId = useVideoStore((s) => s.selectedClipId);
  const isSelected = selectedClipId === clip.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    left: `${clip.start * PX_PER_SECOND}px`,
    width: `${Math.max((clip.end - clip.start) * PX_PER_SECOND, 20)}px`,
  };

  const bgMap = {
    video: 'bg-blue-600/40 border-blue-400',
    audio: 'bg-green-600/30 border-green-400',
    image: 'bg-amber-600/30 border-amber-400',
  };

  const textMap = {
    video: 'text-blue-100',
    audio: 'text-green-100',
    image: 'text-amber-100',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => selectClip(clip.id)}
      className={`absolute h-[42px] mt-1 rounded flex items-center px-3 border backdrop-blur-sm shadow-inner cursor-grab active:cursor-grabbing transition-all ${bgMap[clip.type]} ${isSelected ? 'ring-2 ring-purple-400 border-purple-400' : ''}`}
    >
      <span className={`text-xs truncate font-medium ${textMap[clip.type]}`}>{clip.name}</span>
    </div>
  );
}

export function Timeline() {
  const clips = useVideoStore((s) => s.clips);
  const operations = useVideoStore((s) => s.operations);
  const currentTime = useVideoStore((s) => s.currentTime);
  const duration = useVideoStore((s) => s.duration);
  const setCurrentTime = useVideoStore((s) => s.setCurrentTime);
  const moveClip = useVideoStore((s) => s.moveClip);
  const removeClip = useVideoStore((s) => s.removeClip);
  const removeOperation = useVideoStore((s) => s.removeOperation);

  const timelineRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const clipIds = clips.map((c) => c.id);
    const oldIndex = clipIds.indexOf(active.id as string);
    const newIndex = clipIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(clips, oldIndex, newIndex);
      reordered.forEach((c, i) => moveClip(c.id, c.start, i));
    }
  }, [clips, moveClip]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / PX_PER_SECOND;
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  };

  const maxTrack = Math.max(...clips.map((c) => c.track), 2);
  const totalWidth = Math.max(duration * PX_PER_SECOND, 800);

  return (
    <div className="flex flex-col w-full h-full select-none">
      <div className="flex bg-neutral-900 border-b border-neutral-800 h-6 relative text-[10px] text-neutral-500 items-end pb-1 shrink-0" style={{ width: totalWidth }}>
        {Array.from({ length: Math.ceil(duration / 5) + 1 }, (_, i) => (
          <div key={i} className="absolute" style={{ left: `${i * 5 * PX_PER_SECOND}px` }}>
            {`${Math.floor(i * 5 / 60)}:${String((i * 5) % 60).padStart(2, '0')}`}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative" style={{ minHeight: `${(maxTrack + 1) * TRACK_HEIGHT}px` }}>
        <div
          ref={timelineRef}
          className="relative"
          style={{ width: totalWidth, height: `${(maxTrack + 1) * TRACK_HEIGHT}px` }}
          onClick={handleTimelineClick}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={clips.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {clips.map((clip) => (
                <div key={clip.id} className="absolute w-full" style={{ top: `${clip.track * TRACK_HEIGHT}px`, height: `${TRACK_HEIGHT}px` }}>
                  <SortableClip clip={clip} />
                </div>
              ))}
            </SortableContext>
          </DndContext>

          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none shadow-lg shadow-red-500/50" style={{ left: `${currentTime * PX_PER_SECOND}px` }} />
        </div>
      </div>

      {operations.length > 0 && (
        <div className="border-t border-neutral-800 bg-neutral-900/50 p-2 shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {operations.map((op) => (
              <div key={op.id} className="group flex items-center gap-1.5 bg-neutral-800 rounded-lg px-2.5 py-1 text-xs border border-neutral-700">
                <span className="text-purple-400 font-medium">{op.type}</span>
                <button onClick={() => removeOperation(op.id)} className="text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  ×
                </button>
              </div>
            ))}
            <span className="text-xs text-neutral-600 self-center ml-1">{operations.length} operation{operations.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-1 shrink-0">
        <button onClick={() => clips.length > 0 && removeClip(clips[clips.length - 1].id)} className="text-xs text-neutral-500 hover:text-red-400 px-2 py-1 rounded bg-neutral-800/50 transition-colors">
          Remove Last Clip
        </button>
      </div>
    </div>
  );
}
