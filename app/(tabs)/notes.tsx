import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, User, Clock, Phone, MessageCircle, PhoneIncoming, PhoneOutgoing, BarChart3, Brain, TrendingUp, Search, Tag, Edit3, Circle, Filter, Folder, Settings, ChevronDown, X } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { CallNote, NoteStatus, NoteFolder, NoteFilter, FilterType } from '@/types/contact';
import EditNoteModal from '@/components/EditNoteModal';
import FolderManagementModal from '@/components/FolderManagementModal';

export default function NotesScreen() {
  const { notes, contacts, folders, updateNote, deleteNote } = useContacts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<CallNote | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<NoteFilter[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [groupByFolder, setGroupByFolder] = useState<boolean>(true);
  const searchAnimation = new Animated.Value(0);
  const filterAnimation = new Animated.Value(0);

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

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    Animated.timing(filterAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const addFilter = (type: FilterType, value: string, label: string) => {
    const existingFilter = activeFilters.find(f => f.type === type && f.value === value);
    if (!existingFilter) {
      setActiveFilters([...activeFilters, { type, value, label }]);
    }
    setShowFilters(false);
  };

  const removeFilter = (filterToRemove: NoteFilter) => {
    setActiveFilters(activeFilters.filter(f => 
      !(f.type === filterToRemove.type && f.value === filterToRemove.value)
    ));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const getFolderById = (folderId: string) => {
    return folders.find(f => f.id === folderId);
  };

  const filteredNotes = useMemo(() => {
    let filtered = [...notes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.contactName.toLowerCase().includes(query) ||
        note.note.toLowerCase().includes(query) ||
        getStatusText(note.status, note.customStatus).toLowerCase().includes(query) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(query))) ||
        (note.category && note.category.toLowerCase().includes(query))
      );
    }

    // Apply active filters
    activeFilters.forEach(filter => {
      switch (filter.type) {
        case 'status':
          filtered = filtered.filter(note => note.status === filter.value);
          break;
        case 'priority':
          filtered = filtered.filter(note => note.priority === filter.value);
          break;
        case 'folder':
          if (filter.value === 'no-folder') {
            filtered = filtered.filter(note => !note.folderId);
          } else {
            filtered = filtered.filter(note => note.folderId === filter.value);
          }
          break;
        case 'direction':
          filtered = filtered.filter(note => note.callDirection === filter.value);
          break;
        case 'date':
          const today = new Date();
          switch (filter.value) {
            case 'today':
              filtered = filtered.filter(note => {
                const createdDate = new Date(note.createdAt);
                return createdDate.toDateString() === today.toDateString();
              });
              break;
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              filtered = filtered.filter(note => {
                const createdDate = new Date(note.createdAt);
                return createdDate >= weekAgo;
              });
              break;
            case 'month':
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              filtered = filtered.filter(note => {
                const createdDate = new Date(note.createdAt);
                return createdDate >= monthAgo;
              });
              break;
          }
          break;
      }
    });

    return filtered;
  }, [notes, searchQuery, activeFilters]);

  const groupedNotes = useMemo(() => {
    if (!groupByFolder) {
      return [{ folder: null, notes: filteredNotes }];
    }

    const groups: { folder: NoteFolder | null; notes: CallNote[] }[] = [];
    const folderMap = new Map<string, CallNote[]>();
    const noFolderNotes: CallNote[] = [];

    filteredNotes.forEach(note => {
      if (note.folderId) {
        if (!folderMap.has(note.folderId)) {
          folderMap.set(note.folderId, []);
        }
        folderMap.get(note.folderId)!.push(note);
      } else {
        noFolderNotes.push(note);
      }
    });

    // Add folder groups
    folders.forEach(folder => {
      const folderNotes = folderMap.get(folder.id) || [];
      if (folderNotes.length > 0) {
        groups.push({ folder, notes: folderNotes });
      }
    });

    // Add no folder group
    if (noFolderNotes.length > 0) {
      groups.push({ folder: null, notes: noFolderNotes });
    }

    return groups;
  }, [filteredNotes, groupByFolder, folders]);

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

  const FilterChip = ({ filter }: { filter: NoteFilter }) => (
    <View style={styles.filterChip}>
      <Text style={styles.filterChipText}>{filter.label}</Text>
      <TouchableOpacity onPress={() => removeFilter(filter)} style={styles.filterChipRemove}>
        <X size={12} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const FilterOption = ({ type, value, label, icon }: {
    type: FilterType;
    value: string;
    label: string;
    icon: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.filterOption}
      onPress={() => addFilter(type, value, label)}
    >
      <Text style={styles.filterOptionText}>{icon} {label}</Text>
    </TouchableOpacity>
  );

  const FolderGroup = ({ folder, notes }: { folder: NoteFolder | null; notes: CallNote[] }) => {
    const sortedGroupNotes = [...notes].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
      <View style={styles.folderGroup}>
        {groupByFolder && (
          <View style={styles.folderHeader}>
            <View style={styles.folderInfo}>
              <Folder 
                size={16} 
                color={folder?.color || '#999'} 
                fill={folder?.color ? folder.color + '20' : '#f0f0f0'} 
              />
              <Text style={styles.folderTitle}>
                {folder?.name || 'No Folder'} ({notes.length})
              </Text>
            </View>
            {folder && (
              <TouchableOpacity
                style={styles.folderAction}
                onPress={() => addFilter('folder', folder.id, folder.name)}
              >
                <Filter size={14} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.folderNotes}>
          {sortedGroupNotes.map((item) => (
            <View key={item.id}>
              {renderNote({ item })}
            </View>
          ))}
        </View>
      </View>
    );
  };

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
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setShowFolderModal(true)} style={styles.headerButton}>
                <Settings size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleFilters} style={styles.headerButton}>
                <Filter size={20} color={showFilters ? '#007AFF' : '#666'} />
                {activeFilters.length > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilters.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSearch} style={styles.headerButton}>
                <Search size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
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

      {/* Filter Panel */}
      <Animated.View 
        style={[
          styles.filterContainer,
          {
            height: filterAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 200],
            }),
            opacity: filterAnimation,
          }
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            <FilterOption type="status" value="follow-up" label="Follow-up" icon={<Tag size={14} color="#FF9500" />} />
            <FilterOption type="status" value="waiting-reply" label="Waiting Reply" icon={<Tag size={14} color="#007AFF" />} />
            <FilterOption type="status" value="closed" label="Closed" icon={<Tag size={14} color="#34C759" />} />
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Priority</Text>
            <FilterOption type="priority" value="high" label="High" icon={<Circle size={14} color="#FF3B30" />} />
            <FilterOption type="priority" value="medium" label="Medium" icon={<Circle size={14} color="#FF9500" />} />
            <FilterOption type="priority" value="low" label="Low" icon={<Circle size={14} color="#34C759" />} />
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Direction</Text>
            <FilterOption type="direction" value="inbound" label="Inbound" icon={<PhoneIncoming size={14} color="#34C759" />} />
            <FilterOption type="direction" value="outbound" label="Outbound" icon={<PhoneOutgoing size={14} color="#007AFF" />} />
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Folders</Text>
            <FilterOption type="folder" value="no-folder" label="No Folder" icon={<Folder size={14} color="#999" />} />
            {folders.map(folder => (
              <FilterOption 
                key={folder.id}
                type="folder" 
                value={folder.id} 
                label={folder.name} 
                icon={<Folder size={14} color={folder.color} />} 
              />
            ))}
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date</Text>
            <FilterOption type="date" value="today" label="Today" icon={<Clock size={14} color="#007AFF" />} />
            <FilterOption type="date" value="week" label="This Week" icon={<Clock size={14} color="#007AFF" />} />
            <FilterOption type="date" value="month" label="This Month" icon={<Clock size={14} color="#007AFF" />} />
          </View>
        </ScrollView>
      </Animated.View>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
            <View style={styles.activeFilters}>
              {activeFilters.map((filter, index) => (
                <FilterChip key={`${filter.type}-${filter.value}-${index}`} filter={filter} />
              ))}
              <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersButton}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Group Toggle */}
      <View style={styles.groupToggleContainer}>
        <TouchableOpacity 
          style={styles.groupToggle}
          onPress={() => setGroupByFolder(!groupByFolder)}
        >
          <Folder size={16} color={groupByFolder ? '#007AFF' : '#666'} />
          <Text style={[styles.groupToggleText, { color: groupByFolder ? '#007AFF' : '#666' }]}>
            Group by Folder
          </Text>
          <ChevronDown 
            size={16} 
            color={groupByFolder ? '#007AFF' : '#666'} 
            style={[{ transform: [{ rotate: groupByFolder ? '180deg' : '0deg' }] }]}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          {renderSummarySection()}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>
            Call Notes ({filteredNotes.length})
            {activeFilters.length > 0 && (
              <Text style={styles.filteredText}> • Filtered</Text>
            )}
          </Text>
          {filteredNotes.length === 0 ? (
            renderEmpty()
          ) : (
            <View style={styles.notesList}>
              {groupedNotes.map((group, index) => (
                <FolderGroup 
                  key={group.folder?.id || 'no-folder'} 
                  folder={group.folder} 
                  notes={group.notes} 
                />
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
      
      <FolderManagementModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
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
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 6,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    overflow: 'hidden',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    overflow: 'hidden',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterSection: {
    marginRight: 24,
    paddingVertical: 12,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
    gap: 6,
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333',
  },
  activeFiltersContainer: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  activeFiltersScroll: {
    paddingHorizontal: 16,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF20',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  filterChipRemove: {
    padding: 2,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FF3B3020',
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF3B30',
  },
  groupToggleContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupToggleText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  folderGroup: {
    marginBottom: 16,
  },
  folderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  folderAction: {
    padding: 4,
  },
  folderNotes: {
    gap: 8,
  },
  filteredText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#007AFF',
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