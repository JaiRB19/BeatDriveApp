import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useNavigation } from '@react-navigation/native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DriveModeScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { 
        currentSong, 
        isPlaying, 
        position, 
        duration, 
        togglePlayPause, 
        nextSong, 
        previousSong 
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
                                <View style={[styles.artworkImage, { backgroundColor: `hsl(${hue}, 80%, 20%)`, borderColor: `hsl(${hue}, 100%, 50%)`, borderWidth: 2 }]}>
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
        width: width * 0.65,
        height: width * 0.65,
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
    }
});