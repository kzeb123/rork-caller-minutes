import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TextInput, SafeAreaView } from 'react-native';
import { Users, Search } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import ContactCard from '@/components/ContactCard';
import NoteModal from '@/components/NoteModal';

export default function ContactsScreen() {
  const { contacts, isLoading } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(query) ||
      contact.phoneNumber.includes(query)
    );
  }, [contacts, searchQuery]);

  const sectionedContacts = useMemo(() => {
    if (!filteredContacts.length) return [];
    
    const sorted = [...filteredContacts].sort((a, b) => a.name.localeCompare(b.name));
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
  }, [filteredContacts]);

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
      <Users size={48} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Contacts</Text>
      <Text style={styles.emptyText}>
        Go to Settings to add contacts manually or import from your device
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {sectionedContacts.length > 0 ? (
        <SectionList
          sections={sectionedContacts}
          renderItem={renderContact}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
        />
      ) : (
        renderEmpty()
      )}

      <NoteModal />
    </SafeAreaView>
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
  listContent: {
    paddingBottom: 20,
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
    paddingHorizontal: 32,
    backgroundColor: '#F2F2F7',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  searchContainer: {
    backgroundColor: '#F2F2F7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});