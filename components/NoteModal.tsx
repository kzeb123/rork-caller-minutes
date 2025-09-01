import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Save, Clock, Phone, Tag, Check } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { NoteStatus } from '@/types/contact';

export default function NoteModal() {
  const { showNoteModal, currentCallContact, callStartTime, callEndTime, closeNoteModal, saveNote, getFormattedNoteTemplate } = useContacts();
  const [noteText, setNoteText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<NoteStatus>('follow-up');
  const [customStatus, setCustomStatus] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    if (showNoteModal && currentCallContact) {
      const template = getFormattedNoteTemplate(currentCallContact.name);
      setNoteText(template);
      setSelectedStatus('follow-up');
      setCustomStatus('');
      setShowStatusPicker(false);
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
      const finalCustomStatus = selectedStatus === 'other' ? customStatus.trim() : undefined;
      saveNote(noteText.trim(), selectedStatus, finalCustomStatus);
      setNoteText('');
      setSelectedStatus('follow-up');
      setCustomStatus('');
    } else {
      closeNoteModal();
    }
  };

  const handleClose = () => {
    setNoteText('');
    setSelectedStatus('follow-up');
    setCustomStatus('');
    setShowStatusPicker(false);
    closeNoteModal();
  };

  const handleSkip = () => {
    saveNote('', 'closed');
    setNoteText('');
    setSelectedStatus('follow-up');
    setCustomStatus('');
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
          
          {/* Status Selection */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Status</Text>
            <TouchableOpacity 
              style={styles.statusSelector}
              onPress={() => setShowStatusPicker(!showStatusPicker)}
            >
              <Tag size={16} color="#007AFF" />
              <Text style={styles.statusText}>
                {selectedStatus === 'other' && customStatus ? customStatus : 
                 selectedStatus === 'follow-up' ? 'Follow-up' :
                 selectedStatus === 'waiting-reply' ? 'Waiting Reply' :
                 selectedStatus === 'closed' ? 'Closed' : 'Other'}
              </Text>
            </TouchableOpacity>
            
            {showStatusPicker && (
              <View style={styles.statusPicker}>
                {(['follow-up', 'waiting-reply', 'closed', 'other'] as NoteStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={styles.statusOption}
                    onPress={() => {
                      setSelectedStatus(status);
                      if (status !== 'other') {
                        setShowStatusPicker(false);
                      }
                    }}
                  >
                    <Text style={[styles.statusOptionText, selectedStatus === status && styles.selectedStatusText]}>
                      {status === 'follow-up' ? 'Follow-up' :
                       status === 'waiting-reply' ? 'Waiting Reply' :
                       status === 'closed' ? 'Closed' : 'Other'}
                    </Text>
                    {selectedStatus === status && <Check size={16} color="#007AFF" />}
                  </TouchableOpacity>
                ))}
                
                {selectedStatus === 'other' && (
                  <TextInput
                    style={styles.customStatusInput}
                    placeholder="Enter custom status..."
                    placeholderTextColor="#999"
                    value={customStatus}
                    onChangeText={setCustomStatus}
                    onSubmitEditing={() => setShowStatusPicker(false)}
                    autoFocus
                  />
                )}
              </View>
            )}
          </View>
          
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note about this call..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
            value={noteText}
            onChangeText={setNoteText}
            autoFocus={!showStatusPicker}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, !noteText.trim() && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={!noteText.trim() || (selectedStatus === 'other' && !customStatus.trim())}
          >
            <Text style={[styles.saveButtonText, (!noteText.trim() || (selectedStatus === 'other' && !customStatus.trim())) && styles.saveButtonTextDisabled]}>
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
  statusSection: {
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  statusPicker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e5e9',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedStatusText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  customStatusInput: {
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e1e5e9',
  },
});