import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Animated, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, User, Clock, Phone, MessageCircle, PhoneIncoming, PhoneOutgoing, BarChart3, Brain, TrendingUp, Search, Tag, Edit3, Circle, Filter, Folder, Settings, ChevronDown, ChevronRight, X, Plus } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { CallNote, NoteStatus, NoteFolder, NoteFilter, FilterType, GroupByOption } from '@/types/contact';
import EditNoteModal from '@/components/EditNoteModal';
import FolderManagementModal from '@/components/FolderManagementModal';
import { COLORS } from '@/constants/colors';

export default function NotesScreen() {
  const { notes, contacts, folders, updateNote, deleteNote } = useContacts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<CallNote | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<NoteFilter[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
    const groups: { id: string; title: string; notes: CallNote[]; type: 'time-based' | 'folder-based' | 'contact-based'; folderId?: string; date?: Date; contactName?: string }[] = [];

    if (groupBy === 'none') {
      // Group by contact name for collapsible view
      const notesByContact = new Map<string, CallNote[]>();
      
      filteredNotes.forEach(note => {
        const contactName = note.contactName;
        if (!notesByContact.has(contactName)) {
          notesByContact.set(contactName, []);
        }
        notesByContact.get(contactName)!.push(note);
      });

      notesByContact.forEach((contactNotes, contactName) => {
        const sortedNotes = contactNotes.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        groups.push({
          id: `contact-${contactName}`,
          title: contactName,
          notes: sortedNotes,
          type: 'contact-based',
          contactName,
          date: sortedNotes[0].createdAt,
        });
      });

      return groups.sort((a, b) => {
        if (a.date && b.date) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
    }

    if (groupBy === 'folder') {
      const ungrouped: CallNote[] = [];
      
      folders.forEach(folder => {
        const folderNotes = filteredNotes.filter(n => n.folderId === folder.id);
        if (folderNotes.length > 0) {
          groups.push({
            id: folder.id,
            title: folder.name,
            notes: folderNotes,
            type: 'folder-based',
            folderId: folder.id,
          });
        }
      });

      filteredNotes.forEach(note => {
        if (!note.folderId) {
          ungrouped.push(note);
        }
      });

      if (ungrouped.length > 0) {
        groups.push({
          id: 'ungrouped',
          title: 'Ungrouped',
          notes: ungrouped,
          type: 'folder-based',
        });
      }

      return groups;
    }

    const notesByDate = new Map<string, CallNote[]>();
    
    filteredNotes.forEach(note => {
      const date = new Date(note.createdAt);
      let key: string;
      let title: string;

      switch (groupBy) {
        case 'day':
          key = date.toDateString();
          title = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          key = `${weekStart.toDateString()}-${weekEnd.toDateString()}`;
          title = `Week of ${weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })} - ${weekEnd.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          title = date.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });
          break;
        case 'year':
          key = date.getFullYear().toString();
          title = date.getFullYear().toString();
          break;
        default:
          key = date.toDateString();
          title = date.toDateString();
      }

      if (!notesByDate.has(key)) {
        notesByDate.set(key, []);
      }
      notesByDate.get(key)!.push(note);
    });

    notesByDate.forEach((notesInGroup, key) => {
      const [title] = key.split('|');
      groups.push({
        id: key,
        title: title || key,
        notes: notesInGroup.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        type: 'time-based',
        date: notesInGroup[0].createdAt,
      });
    });

    return groups.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });
  }, [filteredNotes, groupBy, folders]);

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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const NoteGroup = ({ group }: { group: { id: string; title: string; notes: CallNote[]; type: 'time-based' | 'folder-based' | 'contact-based'; folderId?: string; date?: Date; contactName?: string } }) => {
    const isExpanded = expandedGroups.has(group.id);
    const sortedGroupNotes = [...group.notes].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const getGroupSubtitle = () => {
      if (group.type === 'contact-based') {
        const latestNote = sortedGroupNotes[0];
        if (latestNote) {
          return `Latest: ${formatDate(latestNote.createdAt)}`;
        }
      }
      return null;
    };

    return (
      <View style={styles.noteGroup}>
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleGroup(group.id)}
          activeOpacity={0.7}
        >
          <View style={styles.groupHeaderLeft}>
            {isExpanded ? (
              <ChevronDown size={20} color="#000" />
            ) : (
              <ChevronRight size={20} color="#000" />
            )}
            {group.type === 'contact-based' && (
              <View style={styles.contactAvatar}>
                <User size={16} color="#666" />
              </View>
            )}
            {group.type === 'folder-based' && group.folderId && (
              <View
                style={[
                  styles.folderIndicator,
                  { backgroundColor: folders.find(f => f.id === group.folderId)?.color || COLORS.primary },
                ]}
              />
            )}
            <View style={styles.groupTitleContainer}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {getGroupSubtitle() && (
                <Text style={styles.groupSubtitle}>{getGroupSubtitle()}</Text>
              )}
            </View>
          </View>
          <View style={styles.groupHeaderRight}>
            <Text style={styles.groupCount}>{group.notes.length}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.groupContent}>
            {sortedGroupNotes.map((item, index) => (
              <View key={item.id} style={styles.noteInGroup}>
                <View style={styles.noteHeader}>
                  <View style={styles.noteTimeInfo}>
                    <Clock size={12} color="#999" />
                    <Text style={styles.noteTime}>{formatDate(item.createdAt)}</Text>
                    <View style={styles.callDirectionIndicator}>
                      {item.callDirection === 'inbound' ? (
                        <PhoneIncoming size={12} color="#34c759" />
                      ) : (
                        <PhoneOutgoing size={12} color="#007AFF" />
                      )}
                      <Text style={styles.callDurationText}>{formatCallDuration(item.callDuration)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleEditNote(item)} style={styles.editButton}>
                    <Edit3 size={14} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                
                {/* Status and Tags */}
                <View style={styles.noteMetaRow}>
                  <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Tag size={8} color={getStatusColor(item.status)} />
                    <Text style={[styles.statusTagText, { color: getStatusColor(item.status) }]}>
                      {getStatusText(item.status, item.customStatus)}
                    </Text>
                  </View>
                  {item.priority && (
                    <View style={styles.priorityIndicator}>
                      <Circle size={6} color={getPriorityColor(item.priority)} fill={getPriorityColor(item.priority)} />
                      <Text style={styles.priorityText}>{item.priority}</Text>
                    </View>
                  )}
                </View>
                
                {/* Note Content */}
                <TouchableOpacity onPress={() => handleEditNote(item)} style={styles.noteContentContainer}>
                  <Text style={[styles.noteText, item.isAutoGenerated && styles.autoNoteText]} numberOfLines={3}>
                    {item.note}
                  </Text>
                </TouchableOpacity>
                
                {/* Custom Tags */}
                {item.tags && item.tags.length > 0 && (
                  <View style={styles.customTagsContainer}>
                    {item.tags.slice(0, 3).map((tag, tagIndex) => (
                      <View key={tagIndex} style={styles.customTag}>
                        <Text style={styles.customTagText}>{tag}</Text>
                      </View>
                    ))}
                    {item.tags.length > 3 && (
                      <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
                    )}
                  </View>
                )}
                
                {index < sortedGroupNotes.length - 1 && <View style={styles.noteSeparator} />}
              </View>
            ))}
          </View>
        )}
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
    <SafeAreaView style={styles.container}>
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

      {/* Group By Options */}
      <View style={styles.groupByContainer}>
        <Text style={styles.groupByLabel}>Group by:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupByScroll}>
          {(['none', 'day', 'week', 'month', 'year', 'folder'] as GroupByOption[]).map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.groupByOption,
                groupBy === option && styles.groupByOptionActive,
              ]}
              onPress={() => setGroupBy(option)}
            >
              <Text
                style={[
                  styles.groupByOptionText,
                  groupBy === option && styles.groupByOptionTextActive,
                ]}
              >
                {option === 'none' ? 'Contact' : option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              {groupedNotes.map((group) => (
                <NoteGroup 
                  key={group.id} 
                  group={group} 
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
    </SafeAreaView>
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
  groupByContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupByLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 12,
  },
  groupByScroll: {
    flex: 1,
  },
  groupByOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  groupByOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  groupByOptionText: {
    fontSize: 14,
    color: '#000',
  },
  groupByOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  noteGroup: {
    backgroundColor: '#fff',
    marginBottom: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  groupCount: {
    fontSize: 14,
    color: '#8E8E93',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  contactAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  groupTitleContainer: {
    flex: 1,
  },
  groupSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  groupHeaderRight: {
    alignItems: 'flex-end',
  },
  noteInGroup: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  noteTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  noteTime: {
    fontSize: 12,
    color: '#999',
  },
  callDirectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  callDurationText: {
    fontSize: 11,
    color: '#666',
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  noteContentContainer: {
    marginBottom: 8,
  },
  customTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  noteSeparator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginTop: 8,
  },
});