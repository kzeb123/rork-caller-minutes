import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Phone, Trash2, User, PhoneOutgoing } from 'lucide-react-native';
import { Contact } from '@/types/contact';
import { useContacts } from '@/hooks/contacts-store';

interface ContactCardProps {
  contact: Contact;
}

export default function ContactCard({ contact }: ContactCardProps) {
  const { simulateIncomingCall, deleteContact } = useContacts();

  const handleIncomingCall = () => {
    simulateIncomingCall(contact, 'inbound');
  };

  const handleOutgoingCall = () => {
    simulateIncomingCall(contact, 'outbound');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteContact(contact.id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <User size={24} color="#666" />
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.phone}>{contact.phoneNumber}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.incomingButton} onPress={handleIncomingCall}>
          <Phone size={18} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.outgoingButton} onPress={handleOutgoingCall}>
          <PhoneOutgoing size={18} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 size={16} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34c759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outgoingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});