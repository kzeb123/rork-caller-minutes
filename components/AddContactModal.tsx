import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Alert, FlatList, ScrollView, Animated, Dimensions } from 'react-native';
import { X, UserPlus, User, Phone, Search, Plus } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { Contact } from '@/types/contact';

interface AddContactModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (contact: { name: string; phoneNumber: string }) => void;
  onSelectContact?: (contact: Contact) => void;
}

export default function AddContactModal({ visible, onClose, onAdd, onSelectContact }: AddContactModalProps) {
  const { contacts, openCallNoteModal } = useContacts();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Get dimensions inside component
  const { width, height } = Dimensions.get('window');
  
  // Animation values for radiating effect from bottom-left corner
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(-width * 0.45)).current;
  const translateYAnim = useRef(new Animated.Value(height * 0.45)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Animate modal radiating from bottom-left corner with smooth expansion
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(translateXAnim, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation values
      scaleAnim.setValue(0);
      translateXAnim.setValue(-width * 0.45);
      translateYAnim.setValue(height * 0.45);
      opacityAnim.setValue(0);
    }
  }, [visible, width, height, scaleAnim, translateXAnim, translateYAnim, opacityAnim]);

  const handleAdd = () => {
    if (!name.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in both name and phone number');
      return;
    }

    onAdd({
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
    });

    setName('');
    setPhoneNumber('');
    setShowAddForm(false);
    onClose();
  };

  const handleClose = () => {
    // Animate closing back to corner with smooth contraction
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateXAnim, {
        toValue: -width * 0.45,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: height * 0.45,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setName('');
      setPhoneNumber('');
      setSearchQuery('');
      setShowAddForm(false);
      onClose();
    });
  };

  const handleContactSelect = (contact: Contact) => {
    if (onSelectContact) {
      onSelectContact(contact);
    } else {
      openCallNoteModal(contact);
    }
    handleClose();
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery)
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={styles.contactItem} 
      onPress={() => handleContactSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.contactAvatar}>
        <User size={20} color="#666" />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <View style={styles.phoneContainer}>
          <Phone size={12} color="#999" />
          <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      presentationStyle="overFullScreen"
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          {
            opacity: opacityAnim,
          }
        ]}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              width: width * 0.95,
              height: height * 0.85,
              transform: [
                { scale: scaleAnim },
                { translateX: translateXAnim },
                { translateY: translateYAnim },
              ],
            },
          ]}
        >
          <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {showAddForm ? 'New Contact' : 'Select Contact'}
          </Text>
          
          {showAddForm ? (
            <TouchableOpacity onPress={handleAdd}>
              <UserPlus size={24} color="#007AFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowAddForm(true)}>
              <Plus size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        {showAddForm ? (
          <ScrollView style={styles.content}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter contact name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowAddForm(false);
                  setName('');
                  setPhoneNumber('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.contactsList}>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Search size={18} color="#8E8E93" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search contacts..."
                  placeholderTextColor="#8E8E93"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={18} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {filteredContacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <User size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No contacts found' : 'No contacts yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Try a different search' : 'Add a contact to get started'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity 
                    style={styles.emptyAddButton}
                    onPress={() => setShowAddForm(true)}
                  >
                    <Plus size={20} color="#007AFF" />
                    <Text style={styles.emptyAddButtonText}>Add Contact</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredContacts}
                renderItem={renderContact}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactsList: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
  listContent: {
    paddingVertical: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});