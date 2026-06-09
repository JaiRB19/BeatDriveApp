import { create } from 'zustand';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Song } from './useLibrary';

interface PlayerState {
    currentSong: Song | null;
    queue: Song[];
    recentlyPlayed: Song[];
    isPlaying: boolean;
    position: number;
    duration: number;
    isShuffle: boolean;
    isRepeat: boolean;

    setQueue: (songs: Song[]) => void;
    setCurrentSong: (song: Song) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    seekTo: (millis: number) => Promise<void>;
    nextSong: () => Promise<void>;
    previousSong: () => Promise<void>;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    loadRecentlyPlayed: () => Promise<void>;
    clearPlayerState: () => Promise<void>;
    removeFromRecentlyPlayed: (songId: string) => Promise<void>;
    stopAndRemoveSong: (songId: string) => Promise<void>;
}

let isAudioInitialized = false;
const initAudio = async () => {
    if (isAudioInitialized) return;
    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
        isAudioInitialized = true;
    } catch (e) {
        console.warn("No se pudo configurar el audio", e);
    }
};

let soundInstance: Audio.Sound | null = null;
let loadCounter = 0;

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentSong: null,
    queue: [],
    recentlyPlayed: [],
    isPlaying: false,
    position: 0,
    duration: 0,
    isShuffle: false,
    isRepeat: false,

    setQueue: (songs: Song[]) => set({ queue: songs }),

    loadRecentlyPlayed: async () => {
        try {
            const fileUri = FileSystem.documentDirectory + 'recently_played.json';
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(fileUri);
                const loaded = JSON.parse(content) as Song[];
                
                // EXPO GO FIX: Reconstruct absolute URIs dynamically because Sandbox UUID changes across reloads
                const reconstructed = loaded.map(s => {
                    if (s.id.startsWith('imported')) {
                        const fileName = s.uri.split('/').pop();
                        return { ...s, uri: `${FileSystem.documentDirectory}${fileName}` };
                    }
                    return s;
                });
                
                set({ recentlyPlayed: reconstructed });
            }
        } catch (e) {
            console.warn("No se pudo cargar el historial de recientes", e);
        }
    },

    setCurrentSong: async (song: Song) => {
        const currentLoadId = ++loadCounter;
        await initAudio();

        if (soundInstance) {
            try {
                await soundInstance.stopAsync();
                await soundInstance.unloadAsync();
            } catch (e) {
                // Ignore unload errors
            }
            soundInstance = null;
        }

        // Guardar en recientemente escuchadas (evitando duplicados seguidos y manteniendo 10 máximo)
        const currentRecent = get().recentlyPlayed;
        const newRecent = [song, ...currentRecent.filter(s => s.id !== song.id)].slice(0, 10);

        set({ currentSong: song, isPlaying: false, position: 0, duration: 0, recentlyPlayed: newRecent });

        // Persistir historial en disco
        try {
            const fileUri = FileSystem.documentDirectory + 'recently_played.json';
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newRecent));
        } catch (e) {
            console.warn("No se pudo persistir el historial de recientes", e);
        }

        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: song.uri },
                { shouldPlay: true, progressUpdateIntervalMillis: 250 }
            );

            if (currentLoadId !== loadCounter) {
                await sound.unloadAsync();
                return;
            }

            soundInstance = sound;
            set({ isPlaying: true });

            soundInstance.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    set({
                        position: status.positionMillis,
                        duration: status.durationMillis || 0
                    });

                    if (status.didJustFinish) {
                        setTimeout(async () => {
                            const { isRepeat } = get();
                            if (isRepeat && soundInstance) {
                                // Reiniciar la misma canción
                                await soundInstance.setPositionAsync(0);
                                await soundInstance.playAsync();
                                set({ position: 0, isPlaying: true });
                            } else {
                                // Pasar a la siguiente
                                get().nextSong();
                            }
                        }, 0);
                    }
                }
            });
        } catch (error) {
            console.error("Error al reproducir la canción:", error);
            set({ isPlaying: false });
        }
    },

    togglePlayPause: async () => {
        const { isPlaying } = get();

        if (soundInstance) {
            try {
                const status = await soundInstance.getStatusAsync();
                if (status.isLoaded) {
                    if (isPlaying) {
                        await soundInstance.pauseAsync();
                        set({ isPlaying: false });
                    } else {
                        await soundInstance.playAsync();
                        set({ isPlaying: true });
                    }
                }
            } catch (error) {
                console.error("Error al pausar/reproducir:", error);
            }
        }
    },

    seekTo: async (millis: number) => {
        if (soundInstance) {
            try {
                await soundInstance.setPositionAsync(millis);
                set({ position: millis });
            } catch (error) {
                console.error("Error al hacer seek:", error);
            }
        }
    },

    nextSong: async () => {
        const { queue, currentSong, isShuffle } = get();
        if (queue.length === 0 || !currentSong) return;

        let nextIndex = 0;

        if (isShuffle) {
            if (queue.length > 1) {
                const remainingSongs = queue.filter(s => s.id !== currentSong.id);
                const randomIndex = Math.floor(Math.random() * remainingSongs.length);
                const selectedSong = remainingSongs[randomIndex];
                nextIndex = queue.findIndex(s => s.id === selectedSong.id);
            } else {
                nextIndex = 0;
            }
        } else {
            const currentIndex = queue.findIndex(s => s.id === currentSong.id);
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % queue.length;
            }
        }

        await get().setCurrentSong(queue[nextIndex]);
    },

    previousSong: async () => {
        const { queue, currentSong, position, seekTo } = get();
        if (queue.length === 0 || !currentSong) return;

        if (position > 3000) {
            await seekTo(0);
            return;
        }

        const currentIndex = queue.findIndex(s => s.id === currentSong.id);
        let prevIndex = 0;
        if (currentIndex !== -1) {
            prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
        }

        await get().setCurrentSong(queue[prevIndex]);
    },

    toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
    toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),

    clearPlayerState: async () => {
        if (soundInstance) {
            try {
                await soundInstance.stopAsync();
                await soundInstance.unloadAsync();
            } catch (e) {}
            soundInstance = null;
        }
        set({ currentSong: null, queue: [], recentlyPlayed: [], isPlaying: false, position: 0, duration: 0 });
        
        try {
            const fileUri = FileSystem.documentDirectory + 'recently_played.json';
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify([]));
        } catch (e) {}
    },
    
    removeFromRecentlyPlayed: async (songId: string) => {
        const currentRecent = get().recentlyPlayed;
        const newRecent = currentRecent.filter(s => s.id !== songId);
        set({ recentlyPlayed: newRecent });
        
        try {
            const fileUri = FileSystem.documentDirectory + 'recently_played.json';
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newRecent));
        } catch (e) {
            console.warn("No se pudo actualizar el historial al remover", e);
        }
    },

    stopAndRemoveSong: async (songId: string) => {
        const { currentSong } = get();
        if (currentSong?.id === songId && soundInstance) {
            try {
                await soundInstance.stopAsync();
                await soundInstance.unloadAsync();
            } catch (e) {}
            soundInstance = null;
            set({ currentSong: null, isPlaying: false, position: 0, duration: 0 });
        }
        
        const currentRecent = get().recentlyPlayed;
        const newRecent = currentRecent.filter(s => s.id !== songId);
        set({ recentlyPlayed: newRecent });
        
        try {
            const fileUri = FileSystem.documentDirectory + 'recently_played.json';
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newRecent));
        } catch (e) {}
    },
}));