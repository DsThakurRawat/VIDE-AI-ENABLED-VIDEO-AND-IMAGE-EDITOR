import { create } from 'zustand';

export interface Clip {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  src: string;
  start: number;
  end: number;
  duration: number;
  track: number;
}

export interface Operation {
  id: string;
  type: string;
  params: Record<string, unknown>;
  order: number;
  parentId: string | null;
}

interface VideoState {
  currentTime: number;
  duration: number;
  clips: Clip[];
  operations: Operation[];
  isPlaying: boolean;
  selectedClipId: string | null;
  playbackSpeed: number;

  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  moveClip: (id: string, newStart: number, newTrack: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  selectClip: (id: string | null) => void;
  setPlaybackSpeed: (speed: number) => void;
  addOperation: (op: Operation) => void;
  removeOperation: (id: string) => void;
  reorderOperations: (ops: Operation[]) => void;
  getSelectedClip: () => Clip | undefined;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  currentTime: 0,
  duration: 60,
  clips: [],
  operations: [],
  isPlaying: false,
  selectedClipId: null,
  playbackSpeed: 1,

  addClip: (clip) => set((s) => ({ clips: [...s.clips, clip] })),
  removeClip: (id) => set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),
  moveClip: (id, newStart, newTrack) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === id ? { ...c, start: newStart, track: newTrack } : c
      ),
    })),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  selectClip: (id) => set({ selectedClipId: id }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  addOperation: (op) => set((s) => ({ operations: [...s.operations, op] })),
  removeOperation: (id) =>
    set((s) => ({ operations: s.operations.filter((o) => o.id !== id) })),
  reorderOperations: (ops) => set({ operations: ops }),
  getSelectedClip: () => {
    const state = get();
    return state.clips.find((c) => c.id === state.selectedClipId);
  },
}));
