import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Image } from 'react-native';
import { ChevronRight, User, CreditCard, X, Edit3 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Contact } from '@/types/contact';
import { useContacts } from '@/hooks/contacts-store';

interface ContactCardProps {
  contact: Contact;
}

export default function ContactCard({ contact }: ContactCardProps) {
  const { openCallNoteModal, updateContact } = useContacts();
  const [showBusinessCard, setShowBusinessCard] = useState(false);

  const handleContactPress = () => {
    const options: any[] = [
      { text: 'Cancel', style: 'cancel' as const },
      { 
        text: 'Create Call Note', 
        onPress: () => openCallNoteModal(contact)
      },
    ];

    if (contact.businessCardImage) {
      options.splice(1, 0, {
        text: 'View Business Card',
        onPress: () => setShowBusinessCard(true)
      });
    }

    Alert.alert(
      contact.name,
      contact.phoneNumber,
      options
    );
  };

  const showBusinessCardEditOptions = () => {
    Alert.alert(
      'Business Card Options',
      'What would you like to do?',
      [
        {
          text: 'Change Business Card',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'We need camera roll permissions to attach business cards.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
              base64: false,
            });

            if (!result.canceled && result.assets[0]) {
              updateContact({ 
                id: contact.id, 
                updates: { businessCardImage: result.assets[0].uri } 
              });
              setShowBusinessCard(false);
            }
          }
        },
        {
          text: 'Take New Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'We need camera permissions to take photos of business cards.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 0.8,
              base64: false,
            });

            if (!result.canceled && result.assets[0]) {
              updateContact({ 
                id: contact.id, 
                updates: { businessCardImage: result.assets[0].uri } 
              });
              setShowBusinessCard(false);
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handleContactPress}>
        <View style={styles.avatar}>
          <User size={24} color="#666" />
        </View>
        
        <View style={styles.info}>
          <Text style={styles.name}>{contact.name}</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.phone}>{contact.phoneNumber}</Text>
            {contact.businessCardImage && (
              <View style={styles.businessCardBadge}>
                <CreditCard size={12} color="#007AFF" />
                <Text style={styles.businessCardText}>Card</Text>
              </View>
            )}
          </View>
        </View>

        <ChevronRight size={20} color="#C7C7CC" />
      </TouchableOpacity>

      {/* Business Card Viewer Modal */}
      <Modal
        visible={showBusinessCard}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBusinessCard(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowBusinessCard(false)}
          >
            <X size={28} color="#fff" />
          </TouchableOpacity>
          
          {/* Edit Business Card Button */}
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => showBusinessCardEditOptions()}
          >
            <Edit3 size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            {contact.businessCardImage && (
              <Image 
                source={{ uri: contact.businessCardImage }}
                style={styles.businessCardImage}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={styles.modalFooter}>
            <Text style={styles.modalTitle}>{contact.name}&apos;s Business Card</Text>
            <Text style={styles.modalSubtitle}>Pinch to zoom • Swipe to dismiss</Text>
          </View>
        </View>
      </Modal>
    </>
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  businessCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  businessCardText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  editButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  businessCardImage: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});