import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Animated, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useLibrary } from '../hooks/useLibrary';
import { usePlaylistStore } from '../store/usePlaylistStore';
import { useNavigation } from '@react-navigation/native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DriveModeScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const { songs } = useLibrary();
    const { playlists } = usePlaylistStore();
    const [activeRightTab, setActiveRightTab] = useState<'queue' | 'songs' | 'playlists'>('songs');
    const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);

    const {
        currentSong,
        isPlaying,
        position,
        duration,
        togglePlayPause,
        nextSong,
        previousSong,
        queue,
        setQueue,
        setCurrentSong
    } = usePlayerStore();

    // Force screen turned on during Drive Mode for driver safety
    useEffect(() => {
        activateKeepAwake();
        return () => {
            deactivateKeepAwake();
        };
    }, []);

    // Helper to format time milliseconds to mm:ss
    const formatTime = (millis: number) => {
        if (isNaN(millis) || millis < 0) return '0:00';
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Calculate progress percentage
    const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

    const hash = (currentSong?.title || 'Unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const activeColor = currentSong ? `hsl(${hue}, 100%, 55%)` : COLORS.primary;
    const initial = (currentSong?.title || 'U').charAt(0).toUpperCase();

    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isPlaying) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();
        } else {
            scaleAnim.stopAnimation();
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [isPlaying, scaleAnim]);

    if (isLandscape) {
        return (
            <View style={[styles.container, { paddingLeft: insets.left + 20, paddingRight: insets.right + 20, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
                {/* Landscape: Split-Screen */}
                <View style={styles.landscapeRow}>

                    {/* Left Column: Music Info & Controls */}
                    <View style={styles.landscapeLeftColumn}>
                        <View style={styles.landscapeHeader}>
                            <TouchableOpacity style={styles.exitButtonLandscape} onPress={() => navigation.goBack()}>
                                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                                <Text style={styles.exitTextLandscape}>Exit</Text>
                            </TouchableOpacity>
                            <View style={styles.headerTitleContainer}>
                                <Ionicons name="car-sport" size={20} color={activeColor} />
                                <Text style={[styles.headerTitle, { color: activeColor, fontSize: 14 }]}>DRIVE MODE</Text>
                            </View>
                        </View>

                        <View style={styles.landscapePlayerMain}>
                            {currentSong ? (
                                <View style={styles.landscapeSongInfo}>
                                    <View style={styles.metaContainerLandscape}>
                                        <Text style={styles.trackTitleLandscape} numberOfLines={1}>
                                            {currentSong.title.toUpperCase()}
                                        </Text>
                                        <Text style={[styles.trackArtistLandscape, { color: activeColor }]} numberOfLines={1}>
                                            {currentSong.artist.toUpperCase()}
                                        </Text>
                                    </View>

                                    <View style={styles.progressContainerLandscape}>
                                        <View style={styles.timeRow}>
                                            <Text style={styles.timeText}>{formatTime(position)}</Text>
                                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                        </View>
                                        <View style={styles.progressBarBackground}>
                                            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: activeColor, shadowColor: activeColor }]} />
                                        </View>
                                    </View>

                                    <View style={styles.controlsRowLandscape}>
                                        <TouchableOpacity
                                            style={[styles.giantButton, styles.sideButtonLandscape]}
                                            onPress={previousSong}
                                            disabled={!currentSong}
                                        >
                                            <Ionicons name="play-skip-back" size={38} color={currentSong ? COLORS.textPrimary : COLORS.surfaceLight} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.giantButton,
                                                styles.centerButtonLandscape,
                                                {
                                                    backgroundColor: isPlaying ? 'rgba(255,255,255,0.06)' : activeColor,
                                                    borderColor: activeColor
                                                }
                                            ]}
                                            onPress={togglePlayPause}
                                            disabled={!currentSong}
                                        >
                                            <Ionicons
                                                name={isPlaying ? "pause" : "play"}
                                                size={48}
                                                color={isPlaying ? activeColor : COLORS.textPrimary}
                                                style={!isPlaying ? { marginLeft: 4 } : undefined}
                                            />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.giantButton, styles.sideButtonLandscape]}
                                            onPress={nextSong}
                                            disabled={!currentSong}
                                        >
                                            <Ionicons name="play-skip-forward" size={38} color={currentSong ? COLORS.textPrimary : COLORS.surfaceLight} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.emptyStateLandscape}>
                                    <Ionicons name="musical-notes-outline" size={60} color={COLORS.textSecondary} />
                                    <Text style={styles.emptyTextLandscape}>NO SONG LOADED</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Right Column: Playback Queue */}
                    <View style={styles.landscapeRightColumn}>
                        <View style={styles.mediaTabsHeader}>
                            <TouchableOpacity style={[styles.mediaTab, activeRightTab === 'queue' && styles.mediaTabActive]} onPress={() => setActiveRightTab('queue')}>
                                <Text style={[styles.mediaTabText, activeRightTab === 'queue' && styles.mediaTabTextActive]}>QUEUE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mediaTab, activeRightTab === 'songs' && styles.mediaTabActive]} onPress={() => setActiveRightTab('songs')}>
                                <Text style={[styles.mediaTabText, activeRightTab === 'songs' && styles.mediaTabTextActive]}>SONGS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.mediaTab, activeRightTab === 'playlists' && styles.mediaTabActive]} onPress={() => { setActiveRightTab('playlists'); setExpandedPlaylistId(null); }}>
                                <Text style={[styles.mediaTabText, activeRightTab === 'playlists' && styles.mediaTabTextActive]}>PLAYLISTS</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.queueContainer} showsVerticalScrollIndicator={false}>
                            {activeRightTab === 'queue' && (
                                queue.length > 0 ? (
                                    queue.map((song, idx) => {
                                        const isCurrent = currentSong?.id === song.id;
                                        return (
                                            <TouchableOpacity
                                                key={`queue-${song.id}-${idx}`}
                                                style={[
                                                    styles.queueItem,
                                                    isCurrent && { backgroundColor: 'rgba(255, 106, 0, 0.12)', borderColor: COLORS.primary }
                                                ]}
                                                onPress={() => setCurrentSong(song)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.queueItemContent}>
                                                    <Ionicons
                                                        name={isCurrent ? "musical-note" : "musical-note-outline"}
                                                        size={20}
                                                        color={isCurrent ? COLORS.primary : COLORS.textSecondary}
                                                    />
                                                    <View style={styles.queueItemMeta}>
                                                        <Text style={[styles.queueItemTitle, isCurrent && { color: COLORS.primary, fontWeight: '700' }]} numberOfLines={1}>
                                                            {song.title}
                                                        </Text>
                                                        <Text style={styles.queueItemArtist} numberOfLines={1}>
                                                            {song.artist}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {isCurrent && isPlaying && (
                                                    <Text style={[styles.playingIndicator, { color: COLORS.primary }]}>PLAYING</Text>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptyQueueContainer}>
                                        <Text style={styles.emptyQueueText}>Queue is empty</Text>
                                    </View>
                                )
                            )}

                            {activeRightTab === 'songs' && (
                                songs.length > 0 ? (
                                    songs.map((song) => {
                                        const isCurrent = currentSong?.id === song.id;
                                        return (
                                            <TouchableOpacity
                                                key={`song-${song.id}`}
                                                style={[
                                                    styles.queueItem,
                                                    isCurrent && { backgroundColor: 'rgba(255, 106, 0, 0.12)', borderColor: COLORS.primary }
                                                ]}
                                                onPress={() => { setQueue(songs); setCurrentSong(song); }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.queueItemContent}>
                                                    <Ionicons name="musical-note-outline" size={20} color={isCurrent ? COLORS.primary : COLORS.textSecondary} />
                                                    <View style={styles.queueItemMeta}>
                                                        <Text style={[styles.queueItemTitle, isCurrent && { color: COLORS.primary, fontWeight: '700' }]} numberOfLines={1}>
                                                            {song.title}
                                                        </Text>
                                                        <Text style={styles.queueItemArtist} numberOfLines={1}>
                                                            {song.artist}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptyQueueContainer}>
                                        <Text style={styles.emptyQueueText}>No local songs found</Text>
                                    </View>
                                )
                            )}

                            {activeRightTab === 'playlists' && expandedPlaylistId === null && (
                                playlists.length > 0 ? (
                                    playlists.map((playlist) => (
                                        <TouchableOpacity
                                            key={`pl-${playlist.id}`}
                                            style={styles.playlistItemLandscape}
                                            onPress={() => setExpandedPlaylistId(playlist.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.playlistItemContent}>
                                                <Ionicons name="albums" size={24} color={COLORS.primary} />
                                                <View style={styles.queueItemMeta}>
                                                    <Text style={styles.queueItemTitle} numberOfLines={1}>{playlist.name}</Text>
                                                    <Text style={styles.queueItemArtist} numberOfLines={1}>{playlist.songIds.length} songs</Text>
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.emptyQueueContainer}>
                                        <Text style={styles.emptyQueueText}>No playlists created yet</Text>
                                    </View>
                                )
                            )}

                            {activeRightTab === 'playlists' && expandedPlaylistId !== null && (
                                (() => {
                                    const playlist = playlists.find(p => p.id === expandedPlaylistId);
                                    if (!playlist) return null;
                                    const playlistSongs = playlist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean) as any[];

                                    return (
                                        <View>
                                            <TouchableOpacity
                                                style={styles.backToPlaylistsBtn}
                                                onPress={() => setExpandedPlaylistId(null)}
                                            >
                                                <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
                                                <Text style={styles.backToPlaylistsText}>{playlist.name}</Text>
                                            </TouchableOpacity>

                                            {playlistSongs.length > 0 ? (
                                                playlistSongs.map((song) => {
                                                    const isCurrent = currentSong?.id === song.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={`pl-song-${song.id}`}
                                                            style={[
                                                                styles.queueItem,
                                                                isCurrent && { backgroundColor: 'rgba(255, 106, 0, 0.12)', borderColor: COLORS.primary }
                                                            ]}
                                                            onPress={() => { setQueue(playlistSongs); setCurrentSong(song); }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View style={styles.queueItemContent}>
                                                                <Ionicons name="musical-note-outline" size={20} color={isCurrent ? COLORS.primary : COLORS.textSecondary} />
                                                                <View style={styles.queueItemMeta}>
                                                                    <Text style={[styles.queueItemTitle, isCurrent && { color: COLORS.primary, fontWeight: '700' }]} numberOfLines={1}>
                                                                        {song.title}
                                                                    </Text>
                                                                    <Text style={styles.queueItemArtist} numberOfLines={1}>
                                                                        {song.artist}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                })
                                            ) : (
                                                <View style={styles.emptyQueueContainer}>
                                                    <Text style={styles.emptyQueueText}>This playlist is empty</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })()
                            )}
                        </ScrollView>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
                <TouchableOpacity style={styles.exitButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={32} color={COLORS.textPrimary} />
                    <Text style={styles.exitText}>Exit</Text>
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Ionicons name="car-sport" size={24} color={activeColor} />
                    <Text style={[styles.headerTitle, { color: activeColor }]}>DRIVE MODE</Text>
                </View>
                <View style={{ width: 80 }} />
            </View>

            <View style={styles.mainContent}>
                {currentSong ? (
                    <View style={styles.trackInfoContainer}>

                        <View style={styles.artworkContainer}>
                            <Animated.View style={[
                                styles.artworkGlow,
                                {
                                    shadowColor: `hsl(${hue}, 100%, 50%)`,
                                    transform: [{ scale: scaleAnim }]
                                }
                            ]}>
                                <View style={[styles.artworkImage, { width: width * 0.65, height: width * 0.65, backgroundColor: `hsl(${hue}, 80%, 20%)`, borderColor: `hsl(${hue}, 100%, 50%)`, borderWidth: 2 }]}>
                                    <Text style={[styles.artworkInitial, { color: `hsl(${hue}, 100%, 70%)` }]}>{initial}</Text>
                                    <Ionicons name="musical-notes" size={40} color={`hsl(${hue}, 100%, 60%)`} style={{ position: 'absolute', bottom: 20, right: 20, opacity: 0.5 }} />
                                </View>
                            </Animated.View>
                        </View>

                        <View style={styles.metaContainer}>
                            <Text style={styles.trackTitle} numberOfLines={1}>
                                {currentSong.title.toUpperCase()}
                            </Text>
                            <Text style={[styles.trackArtist, { color: activeColor }]} numberOfLines={1}>
                                {currentSong.artist.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="musical-notes-outline" size={100} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>NO SONG LOADED</Text>
                        <Text style={styles.emptySubtext}>Select a song from your Library before driving.</Text>
                    </View>
                )}
            </View>

            <View style={[styles.bottomConsole, { paddingBottom: insets.bottom + 30 }]}>
                {currentSong && (
                    <View style={styles.progressContainer}>
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(position)}</Text>
                            <Text style={styles.timeText}>{formatTime(duration)}</Text>
                        </View>
                        <View style={styles.progressBarBackground}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: activeColor, shadowColor: activeColor }]} />
                        </View>
                    </View>
                )}

                <View style={styles.controlsRow}>
                    <TouchableOpacity
                        style={[styles.giantButton, styles.sideButton]}
                        onPress={previousSong}
                        disabled={!currentSong}
                    >
                        <Ionicons name="play-skip-back" size={48} color={currentSong ? COLORS.textPrimary : COLORS.surfaceLight} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.giantButton,
                            styles.centerButton,
                            {
                                backgroundColor: isPlaying ? 'rgba(255,255,255,0.06)' : activeColor,
                                borderColor: activeColor
                            }
                        ]}
                        onPress={togglePlayPause}
                        disabled={!currentSong}
                    >
                        <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={56}
                            color={isPlaying ? activeColor : COLORS.textPrimary}
                            style={!isPlaying ? { marginLeft: 6 } : undefined}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.giantButton, styles.sideButton]}
                        onPress={nextSong}
                        disabled={!currentSong}
                    >
                        <Ionicons name="play-skip-forward" size={48} color={currentSong ? COLORS.textPrimary : COLORS.surfaceLight} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
    },
    exitText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    trackInfoContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 40,
    },
    artworkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    artworkGlow: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 20,
        backgroundColor: 'transparent',
    },
    artworkImage: {
        width: Dimensions.get('window').width * 0.65,
        height: Dimensions.get('window').width * 0.65,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    artworkInitial: {
        fontSize: 120,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    metaContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },
    trackTitle: {
        color: COLORS.textPrimary,
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1,
    },
    trackArtist: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 3,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
    },
    emptyText: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    emptySubtext: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    bottomConsole: {
        paddingHorizontal: 30,
        gap: 30,
    },
    progressContainer: {
        gap: 8,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    progressBarBackground: {
        height: 8, // Thicker bar
        backgroundColor: COLORS.surface,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 6,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    giantButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 99,
        borderWidth: 2,
    },
    sideButton: {
        width: 80,
        height: 80,
        backgroundColor: COLORS.surface,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    centerButton: {
        width: 110,
        height: 110,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    // Landscape Layout Styles
    landscapeRow: {
        flex: 1,
        flexDirection: 'row',
        gap: 20,
    },
    landscapeLeftColumn: {
        flex: 1.2,
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    landscapeRightColumn: {
        flex: 0.8,
        backgroundColor: 'rgba(20,20,22,0.6)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        padding: 15,
        overflow: 'hidden',
    },
    landscapeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    exitButtonLandscape: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
    },
    exitTextLandscape: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    landscapePlayerMain: {
        flex: 1,
        justifyContent: 'center',
    },
    landscapeSongInfo: {
        gap: 20,
    },
    metaContainerLandscape: {
        alignItems: 'flex-start',
        gap: 4,
    },
    trackTitleLandscape: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
    },
    trackArtistLandscape: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
    },
    progressContainerLandscape: {
        gap: 6,
    },
    controlsRowLandscape: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 25,
    },
    sideButtonLandscape: {
        width: 75,
        height: 75,
        backgroundColor: COLORS.surface,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    centerButtonLandscape: {
        width: 95,
        height: 95,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    emptyStateLandscape: {
        alignItems: 'center',
        gap: 10,
    },
    emptyTextLandscape: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    mediaTabsHeader: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 15,
    },
    mediaTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    mediaTabActive: {
        backgroundColor: COLORS.surfaceDark || '#151518',
    },
    mediaTabText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    mediaTabTextActive: {
        color: COLORS.primary,
        fontWeight: '900',
    },
    playlistItemLandscape: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    playlistItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    backToPlaylistsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        marginBottom: 10,
    },
    backToPlaylistsText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    queueContainer: {
        gap: 10,
        paddingBottom: 10,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    queueItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    queueItemMeta: {
        flex: 1,
    },
    queueItemTitle: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    queueItemArtist: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    playingIndicator: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyQueueContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyQueueText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
});