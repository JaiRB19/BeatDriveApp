import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator, DeviceEventEmitter, Image, Linking, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import * as FileSystem from 'expo-file-system/legacy';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const [keepAwake, setKeepAwake] = useState(false);
    const [cacheSizeStr, setCacheSizeStr] = useState("Calculating...");
    const [isClearing, setIsClearing] = useState(false);
    const { clearPlayerState } = usePlayerStore();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        calculateCacheSize();
    }, []);

    const calculateCacheSize = async () => {
        try {
            const dir = FileSystem.documentDirectory;
            if (!dir) return;
            const files = await FileSystem.readDirectoryAsync(dir);
            let totalBytes = 0;
            for (const file of files) {
                if (file.endsWith('.mp3') || file.endsWith('.m4a') || file === 'imported_songs.json') {
                    const info = await FileSystem.getInfoAsync(dir + file);
                    if (info.exists && !info.isDirectory) {
                        totalBytes += info.size;
                    }
                }
            }
            if (totalBytes === 0) {
                setCacheSizeStr("0.0 MB");
            } else {
                const mb = (totalBytes / (1024 * 1024)).toFixed(1);
                setCacheSizeStr(`${mb} MB`);
            }
        } catch (e) {
            console.error("Error calculating cache size", e);
            setCacheSizeStr("Unknown");
        }
    };

    const handleToggleKeepAwake = async (value: boolean) => {
        setKeepAwake(value);
        if (value) {
            activateKeepAwake();
        } else {
            deactivateKeepAwake();
        }
    };

    const confirmClearCache = () => {
        Alert.alert(
            "Clear Music Cache",
            "Are you sure you want to delete all imported music? This will remove the files from the app's local storage (your original cloud files are safe).",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: handleClearCache }
            ]
        );
    };

    const handleClearCache = async () => {
        setIsClearing(true);
        try {
            const dir = FileSystem.documentDirectory;
            if (!dir) return;
            const files = await FileSystem.readDirectoryAsync(dir);
            for (const file of files) {
                if (file.endsWith('.mp3') || file.endsWith('.m4a') || file === 'imported_songs.json') {
                    await FileSystem.deleteAsync(dir + file, { idempotent: true });
                }
            }
            await calculateCacheSize();
            await clearPlayerState(); // Reset recently played and stop music
            DeviceEventEmitter.emit('CACHE_CLEARED'); // Tell Library to refresh
            Alert.alert("Success", "Music cache has been cleared.");
        } catch (e) {
            console.error("Error clearing cache", e);
            Alert.alert("Error", "Could not clear cache.");
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* HEADER */}
            <View style={[styles.header, isLandscape && styles.headerLandscape]}>
                {isLandscape && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Library' as never)}
                        style={{ marginRight: 10 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                )}
                <Text style={styles.headerTitle}>SETTINGS</Text>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
                {/* SECTION: DRIVING SETTINGS */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>DRIVING</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="car-outline" size={22} color={COLORS.primary} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.rowTitle}>Prevent Sleep</Text>
                                <Text style={styles.rowSubtitle}>Keep the screen turned on during Drive Mode.</Text>
                            </View>
                            <Switch
                                value={keepAwake}
                                onValueChange={handleToggleKeepAwake}
                                trackColor={{ false: COLORS.surfaceLight, true: 'rgba(255, 106, 0, 0.4)' }}
                                thumbColor={keepAwake ? COLORS.primary : COLORS.textSecondary}
                            />
                        </View>

                        {/* ENTER DRIVE MODE TRIGGER */}
                        <View style={[styles.divider, { marginVertical: 15 }]} />
                        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('DriveMode' as never)}>
                            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 106, 0, 0.1)' }]}>
                                <Ionicons name="car-sport" size={22} color={COLORS.primary} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.rowTitle}>Enter Drive Mode</Text>
                                <Text style={styles.rowSubtitle}>Open the simplified driver-safe dashboard interface.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SECTION: STORAGE */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>STORAGE</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.rowTitle}>Clear Storage</Text>
                                <Text style={styles.rowSubtitle}>Cache occupied by imported music: {cacheSizeStr}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionButton} onPress={confirmClearCache} disabled={isClearing}>
                            {isClearing ? (
                                <ActivityIndicator color="#FF4D4D" size="small" />
                            ) : (
                                <Text style={styles.actionButtonText}>Clear Music Cache</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SECTION: ABOUT */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>ABOUT</Text>
                    <View style={styles.aboutCard}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={{ width: 80, height: 80, borderRadius: 40 }}
                            />
                        </View>
                        <Text style={styles.aboutAppName}>Beat Drive</Text>
                        <Text style={styles.aboutVersion}>v1.1.0 - TRAX STEREO EDITION</Text>
                        <Text style={styles.aboutCredits}>Developed In React Native & Expo</Text>

                        <TouchableOpacity
                            style={styles.privacyButton}
                            onPress={() => Linking.openURL('https://privacy-portal-rho.vercel.app/BeatDrive')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.privacyButtonText}>Privacy Policy</Text>
                        </TouchableOpacity>

                        <Text style={styles.aboutCopyright}>© 2026 Jaiel Apps. All rights reserved.</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerLandscape: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 15,
        paddingBottom: 10,
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 10,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
        paddingRight: 10,
    },
    rowTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    rowSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    actionButton: {
        backgroundColor: 'rgba(120, 0, 0, 0.1)',
        borderColor: COLORS.danger,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
    },
    actionButtonText: {
        color: '#FF4D4D',
        fontWeight: 'bold',
        fontSize: 14,
    },
    aboutCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: 'rgba(255,106,0,0.1)',
        borderWidth: 1,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    logoGlow: {
        textShadowColor: COLORS.primary,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    aboutAppName: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    aboutVersion: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
    },
    privacyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 106, 0, 0.08)',
        borderColor: 'rgba(255, 106, 0, 0.3)',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginTop: 10,
        marginBottom: 15,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    privacyButtonText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    aboutCredits: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    aboutCopyright: {
        color: COLORS.textSecondary,
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 14,
    }
});
