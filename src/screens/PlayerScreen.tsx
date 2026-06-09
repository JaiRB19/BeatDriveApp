import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatTime = (millis: number) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// ─── Neon Artwork ────────────────────────────────────────────────────────────
const NeonArtwork = ({ title, isPlaying, size = 300 }: { title: string; isPlaying: boolean; size?: number }) => {
    const hash = (title || 'Unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;

    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isPlaying) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                ])
            ).start();
        } else {
            scaleAnim.stopAnimation();
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [isPlaying, scaleAnim]);

    const initial = (title || 'U').charAt(0).toUpperCase();

    return (
        <Animated.View
            style={[
                styles.artworkGlow,
                {
                    shadowColor: `hsl(${hue}, 100%, 50%)`,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View
                style={[
                    styles.artworkImage,
                    {
                        width: size,
                        height: size,
                        backgroundColor: `hsl(${hue}, 80%, 12%)`,
                        borderColor: `hsl(${hue}, 100%, 45%)`,
                        borderWidth: 2,
                    },
                ]}
            >
                <Text style={[styles.artworkInitial, { color: `hsl(${hue}, 100%, 70%)`, fontSize: size * 0.38 }]}>
                    {initial}
                </Text>
                <Ionicons
                    name="musical-notes"
                    size={size * 0.13}
                    color={`hsl(${hue}, 100%, 60%)`}
                    style={{ position: 'absolute', bottom: size * 0.07, right: size * 0.07, opacity: 0.45 }}
                />
            </View>
        </Animated.View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlayerScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    const {
        currentSong, isPlaying, position, duration, togglePlayPause, seekTo,
        isShuffle, isRepeat, nextSong, previousSong, toggleShuffle, toggleRepeat,
    } = usePlayerStore();

    const [slidingValue, setSlidingValue] = useState<number | null>(null);
    const displayPosition = slidingValue !== null ? slidingValue : position;

    const hash = (currentSong?.title || 'Unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const accentColor = currentSong ? `hsl(${hue}, 100%, 55%)` : COLORS.primary;

    // ── LANDSCAPE LAYOUT ──────────────────────────────────────────────────────
    if (isLandscape) {
        const artworkSize = Math.min(height * 0.72, 260);

        return (
            <View
                style={[
                    styles.containerLandscape,
                    {
                        paddingLeft: insets.left + 16,
                        paddingRight: insets.right + 16,
                        paddingTop: insets.top + 8,
                        paddingBottom: insets.bottom + 8,
                    },
                ]}
            >
                {/* Left Column: Artwork */}
                <View style={styles.leftColLandscape}>
                    <NeonArtwork
                        title={currentSong?.title || ''}
                        isPlaying={isPlaying}
                        size={artworkSize}
                    />
                </View>

                {/* Right Column: Info + Controls */}
                <View style={styles.rightColLandscape}>
                    {/* Header row */}
                    <View style={styles.headerLandscape}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonLandscape}>
                            <Ionicons name="chevron-down" size={26} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitleLandscape}>NOW PLAYING</Text>
                        <View style={{ width: 36 }} />
                    </View>

                    {/* Song info */}
                    <View style={styles.infoLandscape}>
                        <Text style={[styles.songTitleLandscape, { color: COLORS.textPrimary }]} numberOfLines={2}>
                            {currentSong?.title || 'No Song Selected'}
                        </Text>
                        <Text style={[styles.songArtistLandscape, { color: accentColor }]} numberOfLines={1}>
                            {currentSong?.artist || '—'}
                        </Text>
                    </View>

                    {/* Progress Slider */}
                    <View style={styles.progressLandscape}>
                        <Slider
                            style={styles.sliderLandscape}
                            minimumValue={0}
                            maximumValue={duration || 1}
                            value={displayPosition}
                            minimumTrackTintColor={accentColor}
                            maximumTrackTintColor={COLORS.surfaceLight}
                            thumbTintColor={accentColor}
                            onValueChange={(v) => setSlidingValue(v)}
                            onSlidingComplete={(v) => { seekTo(v); setSlidingValue(null); }}
                        />
                        <View style={styles.timeRowLandscape}>
                            <Text style={styles.timeTextLandscape}>{formatTime(displayPosition)}</Text>
                            <Text style={styles.timeTextLandscape}>{formatTime(duration)}</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controlsLandscape}>
                        <TouchableOpacity onPress={toggleShuffle} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="shuffle" size={26} color={isShuffle ? accentColor : COLORS.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={previousSong}
                            style={styles.controlBtnLandscape}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="play-skip-back" size={34} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.playBtnLandscape,
                                {
                                    backgroundColor: isPlaying ? 'rgba(255,255,255,0.06)' : accentColor,
                                    borderColor: accentColor,
                                    shadowColor: accentColor,
                                },
                            ]}
                            onPress={togglePlayPause}
                        >
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={38}
                                color={isPlaying ? accentColor : COLORS.textPrimary}
                                style={!isPlaying ? { marginLeft: 4 } : undefined}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={nextSong}
                            style={styles.controlBtnLandscape}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="play-skip-forward" size={34} color={COLORS.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleRepeat} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <Ionicons name="repeat" size={26} color={isRepeat ? accentColor : COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // ── PORTRAIT LAYOUT (original) ─────────────────────────────────────────────
    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Ionicons name="chevron-down" size={32} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>NOW PLAYING</Text>
                <View style={styles.headerButton} />
            </View>

            <View style={styles.artworkContainer}>
                <NeonArtwork title={currentSong?.title || ''} isPlaying={isPlaying} size={300} />
            </View>

            <View style={styles.infoContainer}>
                <Text style={styles.songTitle} numberOfLines={1}>
                    {currentSong?.title || 'Unknown Title'}
                </Text>
                <Text style={[styles.songArtist, { color: accentColor }]} numberOfLines={1}>
                    {currentSong?.artist || 'Unknown Artist'}
                </Text>
            </View>

            <View style={styles.progressContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    value={displayPosition}
                    minimumTrackTintColor={accentColor}
                    maximumTrackTintColor={COLORS.surfaceLight}
                    thumbTintColor={accentColor}
                    onValueChange={(value) => setSlidingValue(value)}
                    onSlidingComplete={(value) => {
                        seekTo(value);
                        setSlidingValue(null);
                    }}
                />
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
            </View>

            <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={toggleShuffle}>
                    <Ionicons name="shuffle" size={28} color={isShuffle ? accentColor : COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={previousSong}>
                    <Ionicons name="play-skip-back" size={36} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.playButton, { backgroundColor: accentColor, shadowColor: accentColor }]} onPress={togglePlayPause}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={48} color={COLORS.textPrimary} style={{ marginLeft: isPlaying ? 0 : 4 }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={nextSong}>
                    <Ionicons name="play-skip-forward" size={36} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleRepeat}>
                    <Ionicons name="repeat" size={28} color={isRepeat ? accentColor : COLORS.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // ── Portrait ────────────────────────────────────────────────────────────────
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 30,
    },
    headerButton: {
        width: 40,
        alignItems: 'center',
    },
    headerTitle: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    artworkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    artworkGlow: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 20,
        backgroundColor: 'transparent',
    },
    artworkImage: {
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    artworkInitial: {
        fontWeight: '900',
        fontStyle: 'italic',
    },
    infoContainer: {
        alignItems: 'center',
        paddingHorizontal: 30,
        marginBottom: 30,
    },
    songTitle: {
        color: COLORS.textPrimary,
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    songArtist: {
        fontSize: 18,
        fontWeight: '600',
    },
    progressContainer: {
        paddingHorizontal: 30,
        marginBottom: 40,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
    },
    timeText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },

    // ── Landscape ────────────────────────────────────────────────────────────────
    containerLandscape: {
        flex: 1,
        backgroundColor: COLORS.background,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    leftColLandscape: {
        flex: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightColLandscape: {
        flex: 1,
        justifyContent: 'center',
        gap: 18,
    },
    headerLandscape: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButtonLandscape: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 18,
    },
    headerTitleLandscape: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 2.5,
    },
    infoLandscape: {
        gap: 6,
    },
    songTitleLandscape: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 0.5,
        lineHeight: 32,
    },
    songArtistLandscape: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 2,
    },
    progressLandscape: {
        gap: 4,
    },
    sliderLandscape: {
        width: '100%',
        height: 36,
    },
    timeRowLandscape: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    timeTextLandscape: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    controlsLandscape: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 8,
    },
    controlBtnLandscape: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    playBtnLandscape: {
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 14,
        elevation: 12,
    },
});
