import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ChevronRight, User } from 'lucide-react-native';
import { Contact } from '@/types/contact';
import { useContacts } from '@/hooks/contacts-store';

interface ContactCardProps {
  contact: Contact;
}

export default function ContactCard({ contact }: ContactCardProps) {
  const { openCallNoteModal } = useContacts();

  const handleContactPress = () => {
    Alert.alert(
      contact.name,
      contact.phoneNumber,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Call Note', 
          onPress: () => openCallNoteModal(contact)
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleContactPress}>
      <View style={styles.avatar}>
        <User size={24} color="#666" />
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.phone}>{contact.phoneNumber}</Text>
      </View>

      <ChevronRight size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000',
    marginBottom: 2,
  },
  phone: {
    fontSize: 15,
    color: '#8E8E93',
  },
});