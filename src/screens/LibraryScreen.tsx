import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLibrary } from '../hooks/useLibrary';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Height of the floating tab bar pill (paddingVertical*2 + icon + label + gap)
const TAB_BAR_HEIGHT = 68;

// El mock de recientes fue eliminado, ahora se usan los datos reales del store.

export default function LibraryScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    // 1. Traemos la lógica de la biblioteca (archivos locales e importados)
    const { songs, permissionResponse, requestPermission, isLoading, importSong, deleteImportedSong } = useLibrary();

    // 2. Traemos el estado global del reproductor
    const { currentSong, isPlaying, setCurrentSong, togglePlayPause, setQueue, nextSong, previousSong, recentlyPlayed, loadRecentlyPlayed, stopAndRemoveSong } = usePlayerStore();

    // Estado local para la búsqueda de canciones
    const [searchQuery, setSearchQuery] = React.useState('');

    // Cargar historial persistido al abrir la app
    useEffect(() => {
        loadRecentlyPlayed();
    }, []);

    // Helper para generar el mismo color de carátula que el PlayerScreen
    const getHashColor = (title: string, isBorder: boolean = false) => {
        const hash = (title || 'U').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return isBorder ? `hsl(${hash % 360}, 100%, 50%)` : `hsl(${hash % 360}, 80%, 20%)`;
    };

    // Handler to safely delete an imported song with confirmation
    const handleDeleteSong = (song: any) => {
        if (song.id.startsWith('imported')) {
            Alert.alert(
                "Delete Song",
                `Are you sure you want to delete "${song.title}" from your device storage?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Delete", 
                        style: "destructive", 
                        onPress: async () => {
                            // Stop active audio (if applicable) and clean from Recently Played
                            await stopAndRemoveSong(song.id);
                            // Delete permanent physical file
                            await deleteImportedSong(song.id);
                        }
                    }
                ]
            );
        } else {
            Alert.alert(
                "Local Device Song", 
                "This song is stored directly in your system music library and cannot be deleted from within BeatDrive."
            );
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* HEADER */}
            <View style={styles.header}>
                <Image 
                    source={require('../../assets/icon.png')} 
                    style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 106, 0, 0.4)' }} 
                />
                <Text style={styles.headerTitle}>BEAT DRIVE</Text>
                <TouchableOpacity onPress={() => navigation.navigate('DriveMode' as never)}>
                    <Ionicons name="car-sport" size={28} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: currentSong ? 180 : 100 }}>

                {/* BARRA DE BÚSQUEDA */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your library..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* RECENTLY PLAYED */}
                {recentlyPlayed.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recently Played</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {recentlyPlayed.map((song) => (
                                <TouchableOpacity 
                                    key={`recent-${song.id}`} 
                                    style={styles.recentCard}
                                    onPress={() => {
                                        // Poner los recientes como cola y reproducir el tocado
                                        setQueue(recentlyPlayed);
                                        setCurrentSong(song);
                                    }}
                                >
                                    <View style={[styles.recentImage, { backgroundColor: getHashColor(song.title), borderColor: getHashColor(song.title, true), borderWidth: 2, alignItems: 'center', justifyContent: 'center' }]}>
                                        <Text style={{ color: getHashColor(song.title, true), fontSize: 50, fontWeight: '900', fontStyle: 'italic' }}>
                                            {song.title.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.recentTitle} numberOfLines={1}>{song.title}</Text>
                                    <Text style={styles.recentArtist} numberOfLines={1}>{song.artist}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* LOCAL SONGS & IMPORTED CLOUD SONGS */}
                <View style={[styles.sectionHeader, { marginTop: 20, marginBottom: 5 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="folder-open-outline" size={24} color={COLORS.textPrimary} style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Library</Text>
                    </View>
                    <TouchableOpacity onPress={importSong} style={styles.importButton}>
                        <Ionicons name="cloud-download-outline" size={18} color={COLORS.textPrimary} style={{ marginRight: 4 }} />
                        <Text style={styles.importText}>Import</Text>
                    </TouchableOpacity>
                </View>

                {!permissionResponse?.granted && (
                    <TouchableOpacity style={styles.permissionBanner} onPress={requestPermission}>
                        <Ionicons name="warning-outline" size={20} color={COLORS.background} />
                        <Text style={styles.permissionBannerText}>Conceder acceso a música del dispositivo</Text>
                    </TouchableOpacity>
                )}

                {isLoading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
                ) : (
                    (() => {
                        const filteredSongs = songs.filter(song => 
                            song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            song.artist.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        if (filteredSongs.length === 0 && searchQuery.length > 0) {
                            return (
                                <View style={styles.noResultsContainer}>
                                    <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
                                    <Text style={styles.noResultsText}>No songs found for "{searchQuery}"</Text>
                                </View>
                            );
                        }

                        return filteredSongs.map((song) => {
                            const isThisSongActive = currentSong?.id === song.id;

                            return (
                                <TouchableOpacity
                                    key={song.id}
                                    style={[styles.songRow, isThisSongActive && styles.songRowActive]}
                                    onPress={() => {
                                        setQueue(filteredSongs);
                                        setCurrentSong(song);
                                    }}
                                >
                                    <View style={styles.songIconContainer}>
                                        {isThisSongActive && isPlaying ? (
                                            <Ionicons name="stats-chart" size={18} color={COLORS.primary} />
                                        ) : (
                                            <Ionicons name="musical-note" size={18} color={COLORS.textSecondary} />
                                        )}
                                    </View>
                                    <View style={styles.songInfo}>
                                        <Text style={[styles.songTitle, isThisSongActive && { color: COLORS.primary }]} numberOfLines={1}>
                                            {song.title}
                                        </Text>
                                        <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
                                    </View>
                                    <View style={styles.songRight}>
                                        <Text style={[styles.songDuration, isThisSongActive && { color: COLORS.primary }]}>
                                            {song.duration}
                                        </Text>
                                        <TouchableOpacity 
                                            onPress={() => handleDeleteSong(song)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <Ionicons
                                                name="ellipsis-vertical"
                                                size={20}
                                                color={isThisSongActive ? COLORS.primary : COLORS.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        });
                    })()
                )}
            </ScrollView>

            {/* MINI PLAYER FLOTANTE (Solo aparece si hay una canción seleccionada) */}
            {currentSong && (
                <View style={[styles.miniPlayer, { 
                    bottom: Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 10 
                }]}>
                    <TouchableOpacity style={styles.miniPlayerInfo} onPress={() => navigation.navigate('Player' as never)}>
                        <View style={styles.miniPlayerArt}>
                            <Ionicons name="musical-notes" size={20} color={COLORS.textPrimary} />
                        </View>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.miniPlayerTitle} numberOfLines={1}>{currentSong.title}</Text>
                            <Text style={styles.miniPlayerArtist} numberOfLines={1}>{currentSong.artist}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.miniPlayerControls}>
                        <TouchableOpacity onPress={previousSong}>
                            <Ionicons name="play-skip-back" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={nextSong}>
                            <Ionicons name="play-skip-forward" size={22} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centerContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
    messageText: { color: COLORS.textPrimary, fontSize: 18, textAlign: 'center', marginBottom: 20 },
    permissionButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    permissionText: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, paddingTop: 10 },
    headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2 },
    searchContainer: { flexDirection: 'row', backgroundColor: COLORS.surfaceLight, marginHorizontal: 20, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 30 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: 'bold' },
    seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
    importButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    importText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: 'bold' },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    noResultsText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    permissionBanner: { backgroundColor: COLORS.primary, marginHorizontal: 20, marginBottom: 15, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    permissionBannerText: { color: COLORS.background, fontWeight: 'bold' },
    horizontalScroll: { paddingLeft: 20 },
    recentCard: { marginRight: 15, width: 140 },
    recentImage: { width: 140, height: 140, borderRadius: 16, marginBottom: 10, backgroundColor: COLORS.surfaceLight },
    recentTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: 'bold', marginTop: 5 },
    recentArtist: { color: COLORS.textSecondary, fontSize: 12 },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
    songRowActive: { backgroundColor: 'rgba(255, 106, 0, 0.1)', borderColor: COLORS.danger, borderWidth: 1, borderRadius: 16, marginHorizontal: 10, paddingHorizontal: 10 },
    songIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    songInfo: { flex: 1, paddingRight: 10 },
    songTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
    songArtist: { color: COLORS.textSecondary, fontSize: 14, marginTop: 2 },
    songRight: { alignItems: 'flex-end' },
    songDuration: { color: COLORS.textPrimary, fontSize: 14, marginBottom: 4, fontWeight: 'bold' },
    miniPlayer: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: COLORS.surfaceLight, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 },
    miniPlayerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    miniPlayerArt: { width: 40, height: 40, borderRadius: 8, backgroundColor: COLORS.danger, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    miniPlayerTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: 'bold' },
    miniPlayerArtist: { color: COLORS.textSecondary, fontSize: 12 },
    miniPlayerControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    playButton: { backgroundColor: COLORS.secondary, padding: 10, borderRadius: 20 },
});