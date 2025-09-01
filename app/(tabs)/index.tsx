import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { Stack } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import ContactCard from '@/components/ContactCard';
import NoteModal from '@/components/NoteModal';

export default function ContactsScreen() {
  const { contacts, isLoading } = useContacts();

  const sectionedContacts = useMemo(() => {
    if (!contacts.length) return [];
    
    const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
    const sections: { title: string; data: typeof contacts }[] = [];
    
    sorted.forEach(contact => {
      const firstLetter = contact.name.charAt(0).toUpperCase();
      let section = sections.find(s => s.title === firstLetter);
      
      if (!section) {
        section = { title: firstLetter, data: [] };
        sections.push(section);
      }
      
      section.data.push(contact);
    });
    
    return sections.sort((a, b) => a.title.localeCompare(b.title));
  }, [contacts]);

  const renderContact = ({ item }: { item: any }) => (
    <ContactCard contact={item} />
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Contacts</Text>
      <Text style={styles.emptyText}>
        Go to Settings to add contacts manually or import from your device
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Contacts',
          headerStyle: {
            backgroundColor: '#F2F2F7',
          },
          headerTitleStyle: {
            color: '#000',
            fontSize: 17,
            fontWeight: '600',
          },
        }} 
      />

      {sectionedContacts.length > 0 ? (
        <SectionList
          sections={sectionedContacts}
          renderItem={renderContact}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
        />
      ) : (
        renderEmpty()
      )}

      <NoteModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F2F2F7',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});