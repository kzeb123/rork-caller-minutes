import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomSplashScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 1: Scale up and bounce entrance
    const entranceAnimation = Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);

    // Phase 2: Rotation and pulsing effect
    const showoffAnimation = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
    ]);

    // Phase 3: Accelerate off screen like a car
    const exitAnimation = Animated.parallel([
      Animated.timing(translateXAnim, {
        toValue: screenWidth + 200,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -50,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.5,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // Execute animations in sequence
    Animated.sequence([
      entranceAnimation,
      Animated.delay(500), // Pause before showoff
      showoffAnimation,
      Animated.delay(300), // Brief pause before exit
      exitAnimation,
    ]).start();
  }, [bounceAnim, rotateAnim, scaleAnim, translateXAnim, translateYAnim, opacityAnim, screenWidth]);

  const bounceInterpolate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.Text
            style={[
              styles.logo,
              {
                transform: [
                  { translateY: bounceInterpolate },
                  { translateX: translateXAnim },
                  { translateY: translateYAnim },
                  { scale: scaleAnim },
                  { rotate: rotateInterpolate },
                ],
                opacity: opacityAnim,
              },
            ]}
          >
            R
          </Animated.Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC2626', // Red background
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFFFFF', // White color
    textAlign: 'center',
  },
});