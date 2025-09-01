import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ContactsProvider } from "@/hooks/contacts-store";
import IncomingCallModal from "@/components/IncomingCallModal";
import ActiveCallModal from "@/components/ActiveCallModal";
import NoteModal from "@/components/NoteModal";
import ReminderSuggestionModal from "@/components/ReminderSuggestionModal";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ContactsProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
          <IncomingCallModal />
          <ActiveCallModal />
          <NoteModal />
          <ReminderSuggestionModal />
        </GestureHandlerRootView>
      </ContactsProvider>
    </QueryClientProvider>
  );
}