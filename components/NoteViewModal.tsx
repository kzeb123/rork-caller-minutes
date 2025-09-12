import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { X, Clock, Phone, PhoneIncoming, PhoneOutgoing, Tag, Circle, Edit3, Folder } from 'lucide-react-native';
import { CallNote } from '@/types/contact';
import { useContacts } from '@/hooks/contacts-store';

interface NoteViewModalProps {
  visible: boolean;
  note: CallNote | null;
  onClose: () => void;
  onEdit: () => void;
}

export default function NoteViewModal({ visible, note, onClose, onEdit }: NoteViewModalProps) {
  const { folders } = useContacts();

  const formatDate = (date: Date) => {
    const now = new Date();
    const noteDate = new Date(date);
    const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return noteDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return noteDate.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return noteDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };
  
  const formatCallDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  const formatCallTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'follow-up': return '#FF9500';
      case 'waiting-reply': return '#007AFF';
      case 'closed': return '#34C759';
      case 'other': return '#5856D6';
      default: return '#999';
    }
  };

  const getStatusText = (status: string, customStatus?: string) => {
    if (status === 'other' && customStatus) return customStatus;
    switch (status) {
      case 'follow-up': return 'Follow-up';
      case 'waiting-reply': return 'Waiting Reply';
      case 'closed': return 'Closed';
      case 'other': return 'Other';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'low': return '#34C759';
      case 'medium': return '#FF9500';
      case 'high': return '#FF3B30';
      default: return '#999';
    }
  };

  const getFolder = () => {
    if (!note?.folderId) return null;
    return folders.find(f => f.id === note.folderId);
  };

  if (!visible || !note) return null;

  const folder = getFolder();

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Call Note</Text>
          
          <TouchableOpacity onPress={onEdit} style={styles.headerButton}>
            <Edit3 size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Contact Header */}
          <View style={styles.contactHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {note.contactName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{note.contactName}</Text>
              <Text style={styles.contactDate}>
                {new Date(note.callStartTime).toLocaleDateString([], {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </View>

          {/* Call Details */}
          <View style={styles.callDetailsCard}>
            <View style={styles.callDetailRow}>
              <View style={styles.callDetailItem}>
                {note.callDirection === 'inbound' ? (
                  <PhoneIncoming size={16} color="#34c759" />
                ) : (
                  <PhoneOutgoing size={16} color="#007AFF" />
                )}
                <Text style={styles.callDetailText}>
                  {note.callDirection === 'inbound' ? 'Incoming' : 'Outgoing'}
                </Text>
              </View>
              
              <View style={styles.callDetailItem}>
                <Clock size={16} color="#666" />
                <Text style={styles.callDetailText}>
                  {formatCallTime(note.callStartTime)}
                </Text>
              </View>
              
              <View style={styles.callDetailItem}>
                <Phone size={16} color="#666" />
                <Text style={styles.callDetailText}>
                  {formatCallDuration(note.callDuration)}
                </Text>
              </View>
            </View>
          </View>

          {/* Status and Priority */}
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(note.status) + '20' }]}>
                  <Tag size={12} color={getStatusColor(note.status)} />
                  <Text style={[styles.statusText, { color: getStatusColor(note.status) }]}>
                    {getStatusText(note.status, note.customStatus)}
                  </Text>
                </View>
              </View>
              
              {note.priority && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Priority</Text>
                  <View style={styles.priorityBadge}>
                    <Circle size={8} color={getPriorityColor(note.priority)} fill={getPriorityColor(note.priority)} />
                    <Text style={styles.priorityText}>
                      {note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            
            {(note.category || folder) && (
              <View style={styles.metaRow}>
                {note.category && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Category</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{note.category}</Text>
                    </View>
                  </View>
                )}
                
                {folder && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Folder</Text>
                    <View style={styles.folderBadge}>
                      <Folder size={12} color={folder.color} />
                      <Text style={styles.folderText}>{folder.name}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <View style={styles.tagsCard}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {note.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Note Content */}
          <View style={styles.noteCard}>
            <Text style={styles.sectionTitle}>Note</Text>
            <Text style={[styles.noteContent, note.isAutoGenerated && styles.autoNoteContent]}>
              {note.note || 'No note content'}
            </Text>
            {note.isAutoGenerated && (
              <View style={styles.autoIndicator}>
                <Text style={styles.autoText}>Auto-generated</Text>
              </View>
            )}
          </View>

          {/* Timestamps */}
          <View style={styles.timestampsCard}>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Created:</Text>
              <Text style={styles.timestampValue}>{formatDate(note.createdAt)}</Text>
            </View>
            {note.updatedAt && (
              <View style={styles.timestampRow}>
                <Text style={styles.timestampLabel}>Updated:</Text>
                <Text style={styles.timestampValue}>{formatDate(note.updatedAt)}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  contactDate: {
    fontSize: 16,
    color: '#666',
  },
  callDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  callDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  callDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callDetailText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    marginRight: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  folderText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tagsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  autoNoteContent: {
    fontStyle: 'italic',
    color: '#666',
  },
  autoIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  autoText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  timestampsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timestampLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timestampValue: {
    fontSize: 14,
    color: '#333',
  },
});