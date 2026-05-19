import { useState, useEffect } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { DeviceEventEmitter } from 'react-native';

export interface Song {
    id: string;
    title: string;
    artist: string;
    duration: string;
    uri: string;
}

const IMPORTED_SONGS_FILE = `${FileSystem.documentDirectory}imported_songs.json`;

export const useLibrary = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [importedSongs, setImportedSongs] = useState<Song[]>([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [isLoading, setIsLoading] = useState(true);

    // Función para convertir los segundos a formato mm:ss
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const loadImportedSongs = async () => {
        try {
            const fileInfo = await FileSystem.getInfoAsync(IMPORTED_SONGS_FILE);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(IMPORTED_SONGS_FILE);
                const parsed = JSON.parse(content) as Song[];
                // EXPO GO FIX: Reconstruct absolute URI dynamically because the Sandbox UUID changes on every app reload!
                const reconstructed = parsed.map(s => {
                    const fileName = s.uri.split('/').pop();
                    return {
                        ...s,
                        uri: `${FileSystem.documentDirectory}${fileName}`
                    };
                });
                setImportedSongs(reconstructed);
                return reconstructed;
            }
        } catch (error) {
            console.error("Error loading imported songs:", error);
        }
        return [];
    };

    const saveImportedSongs = async (newSongs: Song[]) => {
        try {
            await FileSystem.writeAsStringAsync(IMPORTED_SONGS_FILE, JSON.stringify(newSongs));
            setImportedSongs(newSongs);
        } catch (error) {
            console.error("Error saving imported songs:", error);
        }
    };

    const loadAudioFiles = async (currentImported: Song[]) => {
        try {
            setIsLoading(true);
            let mediaSongs: Song[] = [];

            // Si hay permiso para la biblioteca nativa, cargamos las canciones del dispositivo
            if (permissionResponse?.status === 'granted') {
                const media = await MediaLibrary.getAssetsAsync({
                    mediaType: 'audio',
                    first: 100, // Traemos las primeras 100 por ahora
                    sortBy: ['creationTime'],
                });

                mediaSongs = media.assets.map((asset) => ({
                    id: asset.id,
                    title: asset.filename.replace(/\.[^/.]+$/, ""), // Sin extensión
                    artist: 'Local Device',
                    duration: formatDuration(asset.duration),
                    uri: asset.uri,
                }));
            }

            // Unimos las canciones importadas de la nube con las locales nativas
            const combined = [...currentImported, ...mediaSongs];
            // Eliminamos duplicados matemáticamente en caso de recargas rápidas (Fast Refresh)
            const uniqueSongs = Array.from(new Map(combined.map(s => [s.id, s])).values());
            
            setSongs(uniqueSongs);
        } catch (error) {
            console.error("Error cargando música: ", error);
        } finally {
            setIsLoading(false);
        }
    };

    const initializeLibrary = async () => {
        setIsLoading(true);
        const currentImported = await loadImportedSongs();
        await loadAudioFiles(currentImported);
    };

    useEffect(() => {
        initializeLibrary();
        
        // Escuchar el evento de borrado de caché desde Settings
        const subscription = DeviceEventEmitter.addListener('CACHE_CLEARED', () => {
            initializeLibrary();
        });

        return () => subscription.remove();
    }, [permissionResponse?.status]);

    const importSong = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: false,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const asset = result.assets[0];
            const originalName = asset.name;
            // Limpiar el nombre para evitar errores AVPlayer -11800 por espacios o caracteres especiales en iOS
            const safeFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const uniqueId = `imported-${Date.now()}`;
            const permanentUri = `${FileSystem.documentDirectory}${uniqueId}-${safeFileName}`;

            // Copiamos el archivo desde la ubicación temporal/nube al almacenamiento permanente de la app
            await FileSystem.copyAsync({
                from: asset.uri,
                to: permanentUri
            });

            // Usamos expo-av para extraer la duración real del archivo importado
            let durationSeconds = 0;
            try {
                const { sound, status } = await Audio.Sound.createAsync({ uri: permanentUri });
                if (status.isLoaded && status.durationMillis) {
                    durationSeconds = status.durationMillis / 1000;
                }
                await sound.unloadAsync();
            } catch (err) {
                console.error("Error leyendo la duración con expo-av", err);
            }

            const newSong: Song = {
                id: uniqueId,
                title: originalName.replace(/\.[^/.]+$/, ""),
                artist: 'Imported (Cloud)',
                duration: formatDuration(durationSeconds),
                uri: permanentUri,
            };

            const updatedImported = [newSong, ...importedSongs];
            await saveImportedSongs(updatedImported);

            // Actualizamos la lista principal para que aparezca instantáneamente
            setSongs((prev) => [newSong, ...prev]);

        } catch (error) {
            console.error("Error importando canción de la nube: ", error);
        }
    };

    const deleteImportedSong = async (id: string) => {
        try {
            const songToDelete = importedSongs.find(s => s.id === id);
            if (songToDelete) {
                await FileSystem.deleteAsync(songToDelete.uri, { idempotent: true });
            }
            const updatedImported = importedSongs.filter(s => s.id !== id);
            await saveImportedSongs(updatedImported);
            setSongs(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error("Error borrando canción importada: ", error);
        }
    };

    return {
        songs,
        permissionResponse,
        requestPermission,
        isLoading,
        importSong,
        deleteImportedSong
    };
};