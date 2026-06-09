import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useLibrary } from '../hooks/useLibrary';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { usePlaylistStore } from '../store/usePlaylistStore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Height of the floating tab bar pill (paddingVertical*2 + icon + label + gap)
const TAB_BAR_HEIGHT = 68;

// El mock de recientes fue eliminado, ahora se usan los datos reales del store.

export default function LibraryScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    // 1. Traemos la lógica de la biblioteca (archivos locales e importados)
    const { songs, permissionResponse, requestPermission, isLoading, importSong, deleteImportedSong } = useLibrary();

    // 2. Traemos el estado global del reproductor
    const { currentSong, isPlaying, setCurrentSong, togglePlayPause, setQueue, nextSong, previousSong, recentlyPlayed, loadRecentlyPlayed, stopAndRemoveSong } = usePlayerStore();
    const { playlists, loadPlaylists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist } = usePlaylistStore();

    // Estado local para la búsqueda de canciones
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'songs' | 'playlists'>('songs');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    
    // Modales
    const [createPlaylistModalVisible, setCreatePlaylistModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [addToPlaylistModalVisible, setAddToPlaylistModalVisible] = useState(false);
    const [songToAdd, setSongToAdd] = useState<any>(null);
    const [songMenuModalVisible, setSongMenuModalVisible] = useState(false);
    const [selectedSongForMenu, setSelectedSongForMenu] = useState<any>(null);

    // Cargar historial persistido al abrir la app
    useEffect(() => {
        loadRecentlyPlayed();
        loadPlaylists();
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
        <View style={[styles.container, { paddingTop: isLandscape ? (insets.top + 4) : insets.top }]}>
            {/* HEADER */}
            <View style={[styles.header, isLandscape && styles.headerLandscape]}>
                {!isLandscape && (
                    <Image 
                        source={require('../../assets/icon.png')} 
                        style={{ width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 106, 0, 0.4)' }} 
                    />
                )}
                <Text style={[styles.headerTitle, isLandscape && styles.headerTitleLandscape]}>BEAT DRIVE</Text>
                <TouchableOpacity onPress={() => navigation.navigate('DriveMode' as never)}>
                    <Ionicons name="car-sport" size={isLandscape ? 24 : 28} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* SEGMENTED CONTROL */}
            <View style={styles.segmentedControl}>
                <TouchableOpacity 
                    style={[styles.segmentButton, activeTab === 'songs' && styles.segmentButtonActive]}
                    onPress={() => { setActiveTab('songs'); setSelectedPlaylistId(null); }}
                >
                    <Text style={[styles.segmentText, activeTab === 'songs' && styles.segmentTextActive]}>Local Songs</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.segmentButton, activeTab === 'playlists' && styles.segmentButtonActive]}
                    onPress={() => { setActiveTab('playlists'); setSelectedPlaylistId(null); }}
                >
                    <Text style={[styles.segmentText, activeTab === 'playlists' && styles.segmentTextActive]}>Playlists</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: isLandscape
                        ? (insets.bottom + 20)
                        : (currentSong ? 180 : 100)
                }}
            >

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
                {activeTab === 'songs' && (
                    <>
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

                                return (
                                    <View style={isLandscape ? styles.songGridLandscape : undefined}>
                                        {filteredSongs.map((song) => {
                                            const isThisSongActive = currentSong?.id === song.id;

                                            return (
                                                <TouchableOpacity
                                                    key={song.id}
                                                    style={[
                                                        styles.songRow,
                                                        isThisSongActive && styles.songRowActive,
                                                        isLandscape && styles.songRowLandscape,
                                                    ]}
                                                    onPress={() => {
                                                        setQueue(filteredSongs);
                                                        setCurrentSong(song);
                                                    }}
                                                    onLongPress={() => {
                                                        setSongToAdd(song);
                                                        setAddToPlaylistModalVisible(true);
                                                    }}
                                                    delayLongPress={500}
                                                >
                                                    <View style={[styles.songIconContainer, isLandscape && styles.songIconLandscape]}>
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
                                                        {!isLandscape && (
                                                            <Text style={[styles.songDuration, isThisSongActive && { color: COLORS.primary }]}>
                                                                {song.duration}
                                                            </Text>
                                                        )}
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                setSelectedSongForMenu(song);
                                                                setSongMenuModalVisible(true);
                                                            }}
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
                                        })}
                                    </View>
                                );
                            })()
                        )}
                    </>
                )}

                {activeTab === 'playlists' && selectedPlaylistId === null && (
                    <View style={{ paddingHorizontal: 20 }}>
                        <TouchableOpacity 
                            style={styles.createPlaylistCard} 
                            onPress={() => setCreatePlaylistModalVisible(true)}
                        >
                            <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                            <Text style={styles.createPlaylistText}>Create New Playlist</Text>
                        </TouchableOpacity>

                        <View style={[styles.playlistsGrid, isLandscape && styles.playlistsGridLandscape]}>
                            {playlists.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((playlist) => (
                                <TouchableOpacity 
                                    key={playlist.id} 
                                    style={styles.playlistCard}
                                    onPress={() => setSelectedPlaylistId(playlist.id)}
                                    onLongPress={() => {
                                        Alert.alert(
                                            "Delete Playlist",
                                            `Are you sure you want to delete "${playlist.name}"?`,
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                { text: "Delete", style: "destructive", onPress: () => deletePlaylist(playlist.id) }
                                            ]
                                        );
                                    }}
                                >
                                    <View style={[styles.playlistImage, { backgroundColor: getHashColor(playlist.name) }]}>
                                        <Ionicons name="musical-notes" size={40} color={COLORS.textPrimary} />
                                    </View>
                                    <Text style={styles.playlistName} numberOfLines={1}>{playlist.name}</Text>
                                    <Text style={styles.playlistCount}>{playlist.songIds.length} songs</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {activeTab === 'playlists' && selectedPlaylistId !== null && (
                    <View style={{ paddingHorizontal: 20 }}>
                        <TouchableOpacity 
                            style={styles.backButton} 
                            onPress={() => setSelectedPlaylistId(null)}
                        >
                            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                            <Text style={styles.backButtonText}>Back to Playlists</Text>
                        </TouchableOpacity>
                        
                        {(() => {
                            const playlist = playlists.find(p => p.id === selectedPlaylistId);
                            if (!playlist) return null;

                            const playlistSongs = playlist.songIds
                                .map(id => songs.find(s => s.id === id))
                                .filter(Boolean) as any[];
                            
                            const filteredPlaylistSongs = playlistSongs.filter(song => 
                                song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                song.artist.toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            if (filteredPlaylistSongs.length === 0) {
                                return (
                                    <View style={styles.noResultsContainer}>
                                        <Ionicons name="albums-outline" size={48} color={COLORS.textSecondary} />
                                        <Text style={styles.noResultsText}>This playlist is empty.</Text>
                                    </View>
                                );
                            }

                            return filteredPlaylistSongs.map((song) => {
                                const isThisSongActive = currentSong?.id === song.id;

                                return (
                                    <TouchableOpacity
                                        key={`pl-${playlist.id}-${song.id}`}
                                        style={[styles.songRow, isThisSongActive && styles.songRowActive]}
                                        onPress={() => {
                                            setQueue(filteredPlaylistSongs);
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
                                                onPress={() => removeSongFromPlaylist(playlist.id, song.id)}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Ionicons
                                                    name="trash-outline"
                                                    size={20}
                                                    color={COLORS.danger}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                );
                            });
                        })()}
                    </View>
                )}
            </ScrollView>

            {/* MODAL CREAR PLAYLIST */}
            <Modal
                visible={createPlaylistModalVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>New Playlist</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Playlist name"
                            placeholderTextColor={COLORS.textSecondary}
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalButton} onPress={() => {
                                setCreatePlaylistModalVisible(false);
                                setNewPlaylistName('');
                            }}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={() => {
                                if (newPlaylistName.trim().length > 0) {
                                    createPlaylist(newPlaylistName.trim());
                                    setCreatePlaylistModalVisible(false);
                                    setNewPlaylistName('');
                                }
                            }}>
                                <Text style={styles.modalButtonPrimaryText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* OPTIONS SHEET FOR SONG */}
            <Modal
                visible={songMenuModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSongMenuModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setSongMenuModalVisible(false)}
                >
                    <View style={styles.actionSheetContainer}>
                        <View style={styles.actionSheetHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionSheetTitle} numberOfLines={1}>
                                    {selectedSongForMenu?.title || 'Song Options'}
                                </Text>
                                <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 4 }} numberOfLines={1}>
                                    {selectedSongForMenu?.artist || ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setSongMenuModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.actionSheetRow}
                            onPress={() => {
                                setSongMenuModalVisible(false);
                                setSongToAdd(selectedSongForMenu);
                                setAddToPlaylistModalVisible(true);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} style={{ marginRight: 15 }} />
                            <Text style={styles.actionSheetRowText}>Add to Playlist</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionSheetRow, { borderBottomWidth: 0 }]}
                            onPress={() => {
                                setSongMenuModalVisible(false);
                                if (selectedSongForMenu) {
                                    handleDeleteSong(selectedSongForMenu);
                                }
                            }}
                        >
                            <Ionicons name="trash-outline" size={24} color={COLORS.danger} style={{ marginRight: 15 }} />
                            <Text style={[styles.actionSheetRowText, { color: COLORS.danger }]}>Delete Song</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* MODAL AÑADIR A PLAYLIST */}
            <Modal
                visible={addToPlaylistModalVisible}
                transparent
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.actionSheetContainer}>
                        <View style={styles.actionSheetHeader}>
                            <Text style={styles.actionSheetTitle}>Add to Playlist</Text>
                            <TouchableOpacity onPress={() => setAddToPlaylistModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {playlists.length === 0 ? (
                                <Text style={styles.noPlaylistsText}>You don't have any playlists yet.</Text>
                            ) : (
                                playlists.map(playlist => (
                                    <TouchableOpacity 
                                        key={playlist.id} 
                                        style={styles.actionSheetRow}
                                        onPress={() => {
                                            if (songToAdd) {
                                                addSongToPlaylist(playlist.id, songToAdd.id);
                                            }
                                            setAddToPlaylistModalVisible(false);
                                            setSongToAdd(null);
                                        }}
                                    >
                                        <Ionicons name="musical-notes" size={24} color={COLORS.textSecondary} style={{ marginRight: 15 }} />
                                        <Text style={styles.actionSheetRowText}>{playlist.name}</Text>
                                        {songToAdd && playlist.songIds.includes(songToAdd.id) && (
                                            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                        <TouchableOpacity 
                            style={styles.actionSheetCreateButton}
                            onPress={() => {
                                setAddToPlaylistModalVisible(false);
                                setCreatePlaylistModalVisible(true);
                            }}
                        >
                            <Ionicons name="add" size={20} color={COLORS.background} style={{ marginRight: 8 }} />
                            <Text style={styles.actionSheetCreateButtonText}>New Playlist</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MINI PLAYER FLOTANTE (solo en portrait, si hay canción activa) */}
            {currentSong && !isLandscape && (
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
    headerLandscape: { marginBottom: 8, paddingTop: 4 },
    headerTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2 },
    headerTitleLandscape: { fontSize: 18 },
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
    segmentedControl: { flexDirection: 'row', backgroundColor: COLORS.surfaceLight, marginHorizontal: 20, borderRadius: 12, padding: 4, marginBottom: 20 },
    segmentButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    segmentButtonActive: { backgroundColor: COLORS.surfaceDark },
    segmentText: { color: COLORS.textSecondary, fontWeight: 'bold' },
    segmentTextActive: { color: COLORS.textPrimary },
    createPlaylistCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, padding: 15, borderRadius: 12, marginBottom: 20, justifyContent: 'center', gap: 10 },
    createPlaylistText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
    // Song landscape grid
    songGridLandscape: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 10,
    },
    songRowLandscape: {
        width: '50%',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 14,
        marginHorizontal: 0,
    },
    songIconLandscape: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    playlistsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    playlistsGridLandscape: { flexWrap: 'wrap' },
    playlistCard: { width: '48%', backgroundColor: COLORS.surfaceLight, borderRadius: 16, padding: 15, marginBottom: 15, alignItems: 'center' },
    playlistImage: { width: 80, height: 80, borderRadius: 12, marginBottom: 10, justifyContent: 'center', alignItems: 'center' },
    playlistName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
    playlistCount: { color: COLORS.textSecondary, fontSize: 12 },
    backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
    backButtonText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '85%', backgroundColor: COLORS.surfaceDark, borderRadius: 16, padding: 20 },
    modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalInput: { backgroundColor: COLORS.surfaceLight, color: COLORS.textPrimary, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    modalButtonText: { color: COLORS.textSecondary, fontWeight: 'bold' },
    modalButtonPrimary: { backgroundColor: COLORS.primary },
    modalButtonPrimaryText: { color: COLORS.background, fontWeight: 'bold' },
    actionSheetContainer: { width: '100%', backgroundColor: COLORS.surfaceDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, position: 'absolute', bottom: 0 },
    actionSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    actionSheetTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
    actionSheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
    actionSheetRowText: { flex: 1, color: COLORS.textPrimary, fontSize: 16 },
    noPlaylistsText: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 },
    actionSheetCreateButton: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    actionSheetCreateButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
});