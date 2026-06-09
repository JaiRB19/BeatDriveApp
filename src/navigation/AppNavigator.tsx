import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import LibraryScreen from '../screens/LibraryScreen';
import DriveModeScreen from '../screens/DriveModeScreen';
import PlayerScreen from '../screens/PlayerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab config ────────────────────────────────────────────────────────────────
const TABS: { name: string; icon: string; iconOutline: string; label: string }[] = [
    { name: 'Library', icon: 'musical-notes', iconOutline: 'musical-notes-outline', label: 'Library' },
    { name: 'Settings', icon: 'settings', iconOutline: 'settings-outline', label: 'Settings' },
];

// ─── Premium Floating Glassmorphism Tab Bar ─────────────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    // Respect device safe area (gesture bar / nav buttons) with a minimum 12px gap
    const bottomOffset = Math.max(insets.bottom, 12);

    return (
        <View style={[styles.tabBarWrapper, { bottom: bottomOffset }]}>
            {/* Ambient neon glow behind the pill */}
            <View style={styles.ambientGlow} />

            <View style={styles.tabBarPill}>
                {state.routes.map((route, index) => {
                    const tab = TABS.find(t => t.name === route.name);
                    if (!tab) return null;

                    const isFocused = state.index === index;
                    const { options } = descriptors[route.key];

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            onPress={onPress}
                            activeOpacity={0.7}
                            style={styles.tabItem}
                        >
                            {/* Neon top-edge active indicator */}
                            {isFocused && <View style={styles.activeIndicator} />}

                            {/* Soft glow circle behind active icon */}
                            <View style={[
                                styles.iconWrapper,
                                isFocused && styles.iconWrapperActive,
                            ]}>
                                <Ionicons
                                    name={(isFocused ? tab.icon : tab.iconOutline) as any}
                                    size={24}
                                    color={isFocused ? COLORS.primary : COLORS.textSecondary}
                                />
                            </View>

                            <Text style={[
                                styles.tabLabel,
                                {
                                    color: isFocused ? COLORS.primary : COLORS.textSecondary,
                                    fontWeight: isFocused ? '700' : '400',
                                },
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        left: 26,
        right: 26,
        alignItems: 'center',
    },

    ambientGlow: {
        position: 'absolute',
        bottom: 0,
        left: 40,
        right: 40,
        height: 28,
        backgroundColor: COLORS.primary,
        opacity: 0.04,
        borderRadius: 30,
    },

    tabBarPill: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: 'rgba(20,20,22,0.92)',
        borderRadius: 22,

        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',

        paddingVertical: 6,
        paddingHorizontal: 8,

        alignItems: 'center',
        justifyContent: 'space-around',

        elevation: 8,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
    },

    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        position: 'relative',
        paddingTop: 2,
    },

    activeIndicator: {
        position: 'absolute',
        top: -2,
        width: 18,
        height: 2,
        borderRadius: 10,
        backgroundColor: COLORS.primary,
        opacity: 0.9,
    },

    iconWrapper: {
        padding: 5,
        borderRadius: 999,
    },

    iconWrapperActive: {
        backgroundColor: 'rgba(255,106,0,0.10)',
    },

    tabLabel: {
        fontSize: 10,
        letterSpacing: 0.2,
    },
});

// ─── Tab Navigator ──────────────────────────────────────────────────────────────
function TabNavigator() {
    return (
        <Tab.Navigator
            tabBar={(props) => <FloatingTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Library" component={LibraryScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

// ─── Root Stack Navigator ───────────────────────────────────────────────────────
export default function AppNavigator() {
    return (
        <SafeAreaProvider style={{ backgroundColor: COLORS.background }}>
            <NavigationContainer
                theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: COLORS.background } }}
            >
                <Stack.Navigator
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: COLORS.background } // Corrección aplicada aquí
                    }}
                >
                    {/* Main tabs (Library & Settings) */}
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                    {/* Full screen player modal */}
                    <Stack.Screen
                        name="Player"
                        component={PlayerScreen}
                        options={{ presentation: 'fullScreenModal', headerShown: false }}
                    />
                    {/* Drive Mode — covers tabs entirely */}
                    <Stack.Screen name="DriveMode" component={DriveModeScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}