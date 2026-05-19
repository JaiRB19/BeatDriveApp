import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/colors';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      <AppNavigator />
    </>
  );
}