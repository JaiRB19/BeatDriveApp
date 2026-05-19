import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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

const NeonArtwork = ({ title, isPlaying }: { title: string, isPlaying: boolean }) => {
    const hash = (title || 'Unknown').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    
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

    const initial = (title || 'U').charAt(0).toUpperCase();

    return (
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
    );
};

export default function PlayerScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { 
        currentSong, isPlaying, position, duration, togglePlayPause, seekTo,
        isShuffle, isRepeat, nextSong, previousSong, toggleShuffle, toggleRepeat
    } = usePlayerStore();

    const [slidingValue, setSlidingValue] = useState<number | null>(null);

    const handleMinimize = () => {
        navigation.goBack();
    };

    const displayPosition = slidingValue !== null ? slidingValue : position;

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleMinimize} style={styles.headerButton}>
                    <Ionicons name="chevron-down" size={32} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>NOW PLAYING</Text>
                <View style={styles.headerButton} />
            </View>

            <NeonArtwork title={currentSong?.title || ''} isPlaying={isPlaying} />

            <View style={styles.infoContainer}>
                <Text style={styles.songTitle} numberOfLines={1}>
                    {currentSong?.title || 'Unknown Title'}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                    {currentSong?.artist || 'Unknown Artist'}
                </Text>
            </View>

            <View style={styles.progressContainer}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={duration || 1}
                    value={displayPosition}
                    minimumTrackTintColor={COLORS.primary}
                    maximumTrackTintColor={COLORS.surfaceLight}
                    thumbTintColor={COLORS.primary}
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
                    <Ionicons name="shuffle" size={28} color={isShuffle ? COLORS.primary : COLORS.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={previousSong}>
                    <Ionicons name="play-skip-back" size={36} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
                    <Ionicons name={isPlaying ? "pause" : "play"} size={48} color={COLORS.textPrimary} style={{ marginLeft: isPlaying ? 0 : 4 }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={nextSong}>
                    <Ionicons name="play-skip-forward" size={36} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleRepeat}>
                    <Ionicons name="repeat" size={28} color={isRepeat ? COLORS.primary : COLORS.textSecondary} />
                </TouchableOpacity>
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
        marginVertical: 30,
    },
    artworkGlow: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 20,
        backgroundColor: 'transparent',
    },
    artworkImage: {
        width: 300,
        height: 300,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    artworkInitial: {
        fontSize: 120,
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
        color: COLORS.primary,
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
        backgroundColor: COLORS.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    }
});
