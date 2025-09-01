import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Save, Clock, Phone } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';

export default function NoteModal() {
  const { showNoteModal, currentCallContact, callStartTime, callEndTime, closeNoteModal, saveNote, getFormattedNoteTemplate } = useContacts();
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (showNoteModal && currentCallContact) {
      const template = getFormattedNoteTemplate(currentCallContact.name);
      setNoteText(template);
    }
  }, [showNoteModal, currentCallContact, getFormattedNoteTemplate]);
  
  const formatCallDuration = () => {
    if (!callStartTime || !callEndTime) return '0s';
    const duration = Math.floor((callEndTime.getTime() - callStartTime.getTime()) / 1000);
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  const formatCallTime = () => {
    if (!callStartTime) return '';
    return callStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatCallDate = () => {
    if (!callStartTime) return '';
    return callStartTime.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSave = () => {
    if (noteText.trim()) {
      saveNote(noteText.trim());
      setNoteText('');
    } else {
      closeNoteModal();
    }
  };

  const handleClose = () => {
    setNoteText('');
    closeNoteModal();
  };

  const handleSkip = () => {
    saveNote('');
    setNoteText('');
  };

  if (!showNoteModal || !currentCallContact) return null;

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Call Note</Text>
          
          <TouchableOpacity onPress={handleSave}>
            <Save size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.contactName}>{currentCallContact.name}</Text>
          <Text style={styles.contactPhone}>{currentCallContact.phoneNumber}</Text>
          
          <View style={styles.callInfo}>
            <View style={styles.callInfoItem}>
              <Clock size={16} color="#666" />
              <Text style={styles.callInfoText}>
                {formatCallTime()} • {formatCallDate()}
              </Text>
            </View>
            <View style={styles.callInfoItem}>
              <Phone size={16} color="#666" />
              <Text style={styles.callInfoText}>
                Duration: {formatCallDuration()}
              </Text>
            </View>
          </View>
          
          <Text style={styles.promptText}>
            Do you want to take a note for this contact?
          </Text>
          
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note about this call..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            value={noteText}
            onChangeText={setNoteText}
            autoFocus
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipButton} onPress={() => saveNote('')}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, !noteText.trim() && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={!noteText.trim()}
          >
            <Text style={[styles.saveButtonText, !noteText.trim() && styles.saveButtonTextDisabled]}>
              Save Note
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  contactName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  callInfo: {
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  callInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  callInfoText: {
    fontSize: 14,
    color: '#666',
  },
  promptText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  noteInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});