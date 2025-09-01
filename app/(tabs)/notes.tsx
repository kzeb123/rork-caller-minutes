import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, User, Clock, Phone, MessageCircle, PhoneIncoming, PhoneOutgoing, BarChart3, Brain, TrendingUp, Search, Tag, Edit3, Circle } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { CallNote, NoteStatus } from '@/types/contact';
import EditNoteModal from '@/components/EditNoteModal';

export default function NotesScreen() {
  const { notes, contacts, updateNote, deleteNote } = useContacts();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingNote, setEditingNote] = useState<CallNote | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const searchAnimation = new Animated.Value(0);

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

  const getStatusColor = (status: NoteStatus, customStatus?: string) => {
    switch (status) {
      case 'follow-up': return '#FF9500';
      case 'waiting-reply': return '#007AFF';
      case 'closed': return '#34C759';
      case 'other': return '#5856D6';
      default: return '#999';
    }
  };

  const getStatusText = (status: NoteStatus, customStatus?: string) => {
    if (status === 'other' && customStatus) return customStatus;
    switch (status) {
      case 'follow-up': return 'Follow-up';
      case 'waiting-reply': return 'Waiting Reply';
      case 'closed': return 'Closed';
      case 'other': return 'Other';
      default: return 'Unknown';
    }
  };

  const toggleSearch = () => {
    const toValue = showSearch ? 0 : 1;
    setShowSearch(!showSearch);
    Animated.timing(searchAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    if (showSearch) {
      setSearchQuery('');
    }
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.contactName.toLowerCase().includes(query) ||
      note.note.toLowerCase().includes(query) ||
      getStatusText(note.status, note.customStatus).toLowerCase().includes(query) ||
      (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query))) ||
      (note.category && note.category.toLowerCase().includes(query))
    );
  }, [notes, searchQuery]);

  const handleEditNote = (note: CallNote) => {
    setEditingNote(note);
    setShowEditModal(true);
  };

  const handleSaveNote = (updates: Partial<CallNote>) => {
    if (editingNote) {
      updateNote({ id: editingNote.id, updates });
    }
    setShowEditModal(false);
    setEditingNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    setShowEditModal(false);
    setEditingNote(null);
  };

  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'low': return '#34C759';
      case 'medium': return '#FF9500';
      case 'high': return '#FF3B30';
      default: return '#999';
    }
  };

  const renderNote = ({ item }: { item: CallNote }) => (
    <TouchableOpacity style={styles.noteCard} onPress={() => handleEditNote(item)}>
      <View style={styles.noteHeader}>
        <View style={styles.contactInfo}>
          <View style={styles.avatar}>
            <User size={16} color="#666" />
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{item.contactName}</Text>
            <View style={styles.timeContainer}>
              <Clock size={12} color="#999" />
              <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
              {item.updatedAt && (
                <Text style={styles.updatedText}> • edited</Text>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => handleEditNote(item)} style={styles.editButton}>
            <Edit3 size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Priority and Category */}
      {(item.priority || item.category) && (
        <View style={styles.metaInfo}>
          {item.priority && (
            <View style={styles.priorityContainer}>
              <Circle size={8} color={getPriorityColor(item.priority)} fill={getPriorityColor(item.priority)} />
              <Text style={styles.priorityText}>{item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority</Text>
            </View>
          )}
          {item.category && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
      )}
      
      {/* Tags */}
      <View style={styles.tagsRow}>
        <View style={styles.leftTags}>
          {item.isAutoGenerated && (
            <View style={styles.autoTag}>
              <Text style={styles.autoTagText}>Auto</Text>
            </View>
          )}
          <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Tag size={10} color={getStatusColor(item.status)} />
            <Text style={[styles.statusTagText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status, item.customStatus)}
            </Text>
          </View>
        </View>
        
        {item.tags && item.tags.length > 0 && (
          <View style={styles.customTags}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.customTag}>
                <Text style={styles.customTagText}>{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.callDetails}>
        <View style={styles.callDetailItem}>
          {item.callDirection === 'inbound' ? (
            <PhoneIncoming size={14} color="#34c759" />
          ) : (
            <PhoneOutgoing size={14} color="#007AFF" />
          )}
          <Text style={styles.callDetailText}>
            {item.callDirection === 'inbound' ? 'Incoming' : 'Outgoing'} • {formatCallTime(item.callStartTime)} • {formatCallDuration(item.callDuration)}
          </Text>
        </View>
      </View>
      
      <View style={styles.noteContent}>
        <MessageCircle size={16} color={item.isAutoGenerated ? '#999' : '#007AFF'} />
        <Text style={[styles.noteText, item.isAutoGenerated && styles.autoNoteText]}>
          {item.note}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FileText size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Call Notes Yet</Text>
      <Text style={styles.emptyText}>
        Notes from your calls will appear here
      </Text>
    </View>
  );

  const sortedNotes = [...filteredNotes].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Summary statistics
  const totalCalls = notes.length;
  const totalContacts = contacts.length;
  const inboundCalls = notes.filter(note => note.callDirection === 'inbound').length;
  const outboundCalls = notes.filter(note => note.callDirection === 'outbound').length;
  const notesWithContent = notes.filter(note => !note.isAutoGenerated).length;
  const autoGeneratedNotes = notes.filter(note => note.isAutoGenerated).length;

  const averageCallDuration = totalCalls > 0 
    ? Math.round(notes.reduce((sum, note) => sum + note.callDuration, 0) / totalCalls)
    : 0;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const StatCard = ({ icon, title, value, subtitle, color = '#007AFF' }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        {React.cloneElement(icon as React.ReactElement, { color: color, size: 20 } as any)}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderSummarySection = () => {
    if (totalCalls === 0) {
      return (
        <View style={styles.summaryEmptyContainer}>
          <BarChart3 size={48} color="#ccc" />
          <Text style={styles.summaryEmptyTitle}>No Data Yet</Text>
          <Text style={styles.summaryEmptyText}>
            Start making calls to see your summary statistics
          </Text>
        </View>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContent}>
        <StatCard
          icon={<BarChart3 />}
          title="Total Calls"
          value={totalCalls}
          color="#007AFF"
        />
        <StatCard
          icon={<Clock />}
          title="Avg Duration"
          value={formatDuration(averageCallDuration)}
          color="#34C759"
        />
        <StatCard
          icon={<TrendingUp />}
          title="Inbound"
          value={inboundCalls}
          subtitle={`${totalCalls > 0 ? Math.round((inboundCalls / totalCalls) * 100) : 0}%`}
          color="#34C759"
        />
        <StatCard
          icon={<TrendingUp />}
          title="Outbound"
          value={outboundCalls}
          subtitle={`${totalCalls > 0 ? Math.round((outboundCalls / totalCalls) * 100) : 0}%`}
          color="#FF9500"
        />
        <StatCard
          icon={<Brain />}
          title="Manual Notes"
          value={notesWithContent}
          subtitle={`${totalCalls > 0 ? Math.round((notesWithContent / totalCalls) * 100) : 0}%`}
          color="#5856D6"
        />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Notes & Summary',
          headerRight: () => (
            <TouchableOpacity onPress={toggleSearch} style={styles.searchButton}>
              <Search size={20} color="#007AFF" />
            </TouchableOpacity>
          ),
        }} 
      />

      {/* Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            height: searchAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 60],
            }),
            opacity: searchAnimation,
          }
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, contacts, or status..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={showSearch}
          />
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          {renderSummarySection()}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>Call Notes</Text>
          {sortedNotes.length === 0 ? (
            renderEmpty()
          ) : (
            <View style={styles.notesList}>
              {sortedNotes.map((item) => (
                <View key={item.id}>
                  {renderNote({ item })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      <EditNoteModal
        visible={showEditModal}
        note={editingNote}
        onClose={() => {
          setShowEditModal(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  summarySection: {
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  notesSection: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  summaryScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 1,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  summaryEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
  },
  summaryEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 6,
  },
  summaryEmptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 16,
  },
  notesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  noteCard: {
    backgroundColor: '#fff',
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactDetails: {
    flex: 1,
  },
  autoTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  autoTagText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  searchButton: {
    padding: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  callDetails: {
    marginBottom: 8,
  },
  callDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callDetailText: {
    fontSize: 12,
    color: '#666',
  },
  noteContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  noteText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  autoNoteText: {
    fontStyle: 'italic',
    color: '#999',
  },
  updatedText: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  categoryContainer: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customTag: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  customTagText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
});