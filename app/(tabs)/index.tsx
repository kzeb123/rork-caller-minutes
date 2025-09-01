import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import ContactCard from '@/components/ContactCard';
import IncomingCallModal from '@/components/IncomingCallModal';
import ActiveCallModal from '@/components/ActiveCallModal';
import NoteModal from '@/components/NoteModal';

export default function ContactsScreen() {
  const { contacts, isLoading } = useContacts();



  const renderContact = ({ item }: { item: any }) => (
    <ContactCard contact={item} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Contacts Yet</Text>
      <Text style={styles.emptyText}>
        Go to Settings to add contacts and start receiving call notes
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Contacts',
        }} 
      />

      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        contentContainerStyle={contacts.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <IncomingCallModal />
      <ActiveCallModal />
      <NoteModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});