import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Playlist {
    id: string;
    name: string;
    songIds: string[];
}

interface PlaylistStore {
    playlists: Playlist[];
    isLoading: boolean;
    loadPlaylists: () => Promise<void>;
    createPlaylist: (name: string) => Promise<void>;
    deletePlaylist: (id: string) => Promise<void>;
    addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
}

const PLAYLISTS_STORAGE_KEY = '@beatdrive_playlists';

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
    playlists: [],
    isLoading: true,

    loadPlaylists: async () => {
        try {
            set({ isLoading: true });
            const stored = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
            if (stored) {
                set({ playlists: JSON.parse(stored), isLoading: false });
            } else {
                set({ playlists: [], isLoading: false });
            }
        } catch (error) {
            console.error('Error loading playlists:', error);
            set({ isLoading: false });
        }
    },

    createPlaylist: async (name: string) => {
        try {
            const newPlaylist: Playlist = {
                id: `playlist_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                name,
                songIds: []
            };
            const currentPlaylists = get().playlists;
            const updated = [...currentPlaylists, newPlaylist];
            await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(updated));
            set({ playlists: updated });
        } catch (error) {
            console.error('Error creating playlist:', error);
        }
    },

    deletePlaylist: async (id: string) => {
        try {
            const currentPlaylists = get().playlists;
            const updated = currentPlaylists.filter(p => p.id !== id);
            await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(updated));
            set({ playlists: updated });
        } catch (error) {
            console.error('Error deleting playlist:', error);
        }
    },

    addSongToPlaylist: async (playlistId: string, songId: string) => {
        try {
            const currentPlaylists = get().playlists;
            const updated = currentPlaylists.map(p => {
                if (p.id === playlistId) {
                    if (!p.songIds.includes(songId)) {
                        return { ...p, songIds: [...p.songIds, songId] };
                    }
                }
                return p;
            });
            await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(updated));
            set({ playlists: updated });
        } catch (error) {
            console.error('Error adding song to playlist:', error);
        }
    },

    removeSongFromPlaylist: async (playlistId: string, songId: string) => {
        try {
            const currentPlaylists = get().playlists;
            const updated = currentPlaylists.map(p => {
                if (p.id === playlistId) {
                    return { ...p, songIds: p.songIds.filter(id => id !== songId) };
                }
                return p;
            });
            await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(updated));
            set({ playlists: updated });
        } catch (error) {
            console.error('Error removing song from playlist:', error);
        }
    }
}));
