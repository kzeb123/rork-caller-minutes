import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Animated, SafeAreaView, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { FileText, User, Clock, Phone, MessageCircle, PhoneIncoming, PhoneOutgoing, BarChart3, Brain, TrendingUp, Search, Tag, Edit3, Circle, Filter, Folder, Settings, ChevronDown, ChevronRight, ChevronUp, X, Plus, CheckCircle } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { CallNote, NoteStatus, NoteFolder, NoteFilter, FilterType, GroupByOption } from '@/types/contact';
import EditNoteModal from '@/components/EditNoteModal';
import NoteViewModal from '@/components/NoteViewModal';
import FolderManagementModal from '@/components/FolderManagementModal';
import { COLORS } from '@/constants/colors';

export default function NotesScreen() {
  const { notes, contacts, folders, updateNote, deleteNote } = useContacts();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const searchOpacity = new Animated.Value(0);
  const searchTranslateY = new Animated.Value(-20);
  const [editingNote, setEditingNote] = useState<CallNote | null>(null);
  const [viewingNote, setViewingNote] = useState<CallNote | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<NoteFilter[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('day');
  const [showGroupByModal, setShowGroupByModal] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const searchAnimation = new Animated.Value(0);
  const filterAnimation = new Animated.Value(0);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  const [searchResultsExpanded, setSearchResultsExpanded] = useState<boolean>(false);

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
    
    // Apple-style animation with spring effect
    Animated.parallel([
      Animated.timing(searchAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(searchOpacity, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.spring(searchTranslateY, {
        toValue: toValue ? 0 : -20,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      })
    ]).start();
    
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

  // Get search suggestions based on current query
  const getSearchSuggestions = useCallback(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const suggestions = new Set<string>();
    
    // Add matching contact names
    contacts.forEach(contact => {
      if (contact.name.toLowerCase().includes(query) && contact.name.toLowerCase() !== query) {
        suggestions.add(contact.name);
      }
    });
    
    // Add matching keywords from notes
    notes.forEach(note => {
      // Split note into words and find matches
      const words = note.note.toLowerCase().split(/\s+/);
      words.forEach(word => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanWord.length > 2 && cleanWord.includes(query) && cleanWord !== query) {
          suggestions.add(cleanWord);
        }
      });
      
      // Add matching tags
      if (note.tags) {
        note.tags.forEach(tag => {
          if (tag.toLowerCase().includes(query) && tag.toLowerCase() !== query) {
            suggestions.add(tag);
          }
        });
      }
      
      // Add matching categories
      if (note.category && note.category.toLowerCase().includes(query) && note.category.toLowerCase() !== query) {
        suggestions.add(note.category);
      }
    });
    
    return Array.from(suggestions).slice(0, 5); // Limit to 5 suggestions
  }, [searchQuery, contacts, notes]);



  const highlightText = (text: string, start: number, end: number) => {
    const before = text.substring(0, start);
    const match = text.substring(start, end);
    const after = text.substring(end);
    
    return (
      <Text>
        {before}
        <Text style={styles.highlightedText}>{match}</Text>
        {after}
      </Text>
    );
  };

  const handleSearchResultPress = (noteId: string) => {
    setHighlightedNoteId(noteId);
    setSearchResultsExpanded(false);
    
    // Auto-expand the group containing this note
    const note = notes.find(n => n.id === noteId);
    if (note) {
      // Find which group this note belongs to
      groupedNotes.forEach(group => {
        const noteInGroup = group.notes.find(n => n.id === noteId);
        if (noteInGroup) {
          setExpandedGroups(prev => new Set([...prev, group.id]));
          
          // If it's a time-based group with subgroups, also expand the contact subgroup
          if (group.subGroups) {
            group.subGroups.forEach(subGroup => {
              const noteInSubGroup = subGroup.notes.find((n: CallNote) => n.id === noteId);
              if (noteInSubGroup) {
                setExpandedGroups(prev => new Set([...prev, subGroup.id]));
              }
            });
          }
        }
      });
    }
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedNoteId(null);
    }, 3000);
  };

  const filteredNotes = useMemo(() => {
    let filtered = [...notes];

    // Apply search filter with enhanced matching (from header search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => {
        // Contact name matching
        const contactMatch = note.contactName.toLowerCase().includes(query);
        
        // Note content matching (word boundaries for better relevance)
        const noteWords = note.note.toLowerCase().split(/\s+/);
        const noteMatch = noteWords.some(word => 
          word.includes(query) || note.note.toLowerCase().includes(query)
        );
        
        // Status matching
        const statusMatch = getStatusText(note.status, note.customStatus).toLowerCase().includes(query);
        
        // Tags matching
        const tagsMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(query));
        
        // Category matching
        const categoryMatch = note.category && note.category.toLowerCase().includes(query);
        
        // Phone number matching (if searching for numbers)
        const phoneMatch = contacts.find(c => c.id === note.contactId)?.phoneNumber.includes(query);
        
        return contactMatch || noteMatch || statusMatch || tagsMatch || categoryMatch || phoneMatch;
      });
    }
    
    // Apply group search filter (from search bar under group by)
    if (groupSearchQuery.trim()) {
      const query = groupSearchQuery.toLowerCase();
      filtered = filtered.filter(note => {
        // Contact name matching
        const contactMatch = note.contactName.toLowerCase().includes(query);
        
        // Note content matching (word boundaries for better relevance)
        const noteWords = note.note.toLowerCase().split(/\s+/);
        const noteMatch = noteWords.some(word => 
          word.includes(query) || note.note.toLowerCase().includes(query)
        );
        
        // Status matching
        const statusMatch = getStatusText(note.status, note.customStatus).toLowerCase().includes(query);
        
        // Tags matching
        const tagsMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(query));
        
        // Category matching
        const categoryMatch = note.category && note.category.toLowerCase().includes(query);
        
        // Phone number matching (if searching for numbers)
        const phoneMatch = contacts.find(c => c.id === note.contactId)?.phoneNumber.includes(query);
        
        return contactMatch || noteMatch || statusMatch || tagsMatch || categoryMatch || phoneMatch;
      });
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
  }, [notes, searchQuery, groupSearchQuery, activeFilters, contacts]);

  // Get search results with highlighting info
  const getSearchResults = useCallback(() => {
    if (!groupSearchQuery.trim()) return [];
    
    const query = groupSearchQuery.toLowerCase();
    const results: {
      note: CallNote;
      matchType: 'contact' | 'content' | 'tag' | 'category';
      matchText: string;
      highlightStart: number;
      highlightEnd: number;
    }[] = [];
    
    filteredNotes.forEach(note => {
      // Contact name matching
      const contactNameLower = note.contactName.toLowerCase();
      const contactIndex = contactNameLower.indexOf(query);
      if (contactIndex !== -1) {
        results.push({
          note,
          matchType: 'contact',
          matchText: note.contactName,
          highlightStart: contactIndex,
          highlightEnd: contactIndex + query.length
        });
        return;
      }
      
      // Note content matching
      const noteLower = note.note.toLowerCase();
      const noteIndex = noteLower.indexOf(query);
      if (noteIndex !== -1) {
        // Get context around the match
        const contextStart = Math.max(0, noteIndex - 20);
        const contextEnd = Math.min(note.note.length, noteIndex + query.length + 20);
        const contextText = note.note.substring(contextStart, contextEnd);
        const adjustedStart = noteIndex - contextStart;
        
        results.push({
          note,
          matchType: 'content',
          matchText: contextText,
          highlightStart: adjustedStart,
          highlightEnd: adjustedStart + query.length
        });
        return;
      }
      
      // Tags matching
      if (note.tags) {
        for (const tag of note.tags) {
          const tagIndex = tag.toLowerCase().indexOf(query);
          if (tagIndex !== -1) {
            results.push({
              note,
              matchType: 'tag',
              matchText: tag,
              highlightStart: tagIndex,
              highlightEnd: tagIndex + query.length
            });
            return;
          }
        }
      }
      
      // Category matching
      if (note.category) {
        const categoryIndex = note.category.toLowerCase().indexOf(query);
        if (categoryIndex !== -1) {
          results.push({
            note,
            matchType: 'category',
            matchText: note.category,
            highlightStart: categoryIndex,
            highlightEnd: categoryIndex + query.length
          });
        }
      }
    });
    
    return results.slice(0, 10); // Limit to 10 results
  }, [groupSearchQuery, filteredNotes]);

  const groupedNotes = useMemo(() => {
    const groups: { id: string; title: string; notes: CallNote[]; type: 'time-based' | 'folder-based' | 'contact-based'; folderId?: string; date?: Date; contactName?: string; subGroups?: any[] }[] = [];

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
          // Group by contact within each folder
          const notesByContactInFolder = new Map<string, CallNote[]>();
          
          folderNotes.forEach(note => {
            const contactName = note.contactName;
            if (!notesByContactInFolder.has(contactName)) {
              notesByContactInFolder.set(contactName, []);
            }
            notesByContactInFolder.get(contactName)!.push(note);
          });

          // Create subgroups for each contact
          const contactGroups: any[] = [];
          notesByContactInFolder.forEach((contactNotes, contactName) => {
            contactGroups.push({
              id: `${folder.id}-${contactName}`,
              title: contactName,
              notes: contactNotes.sort((a, b) => 
                new Date(b.callStartTime).getTime() - new Date(a.callStartTime).getTime()
              ),
              type: 'contact-based',
              contactName,
            });
          });

          // Sort contact groups by most recent call
          contactGroups.sort((a, b) => {
            const aLatest = Math.max(...a.notes.map((n: CallNote) => new Date(n.callStartTime).getTime()));
            const bLatest = Math.max(...b.notes.map((n: CallNote) => new Date(n.callStartTime).getTime()));
            return bLatest - aLatest;
          });

          groups.push({
            id: folder.id,
            title: folder.name,
            notes: folderNotes,
            type: 'folder-based',
            folderId: folder.id,
            subGroups: contactGroups,
          });
        }
      });

      filteredNotes.forEach(note => {
        if (!note.folderId) {
          ungrouped.push(note);
        }
      });

      if (ungrouped.length > 0) {
        // Group ungrouped notes by contact
        const notesByContactUngrouped = new Map<string, CallNote[]>();
        
        ungrouped.forEach(note => {
          const contactName = note.contactName;
          if (!notesByContactUngrouped.has(contactName)) {
            notesByContactUngrouped.set(contactName, []);
          }
          notesByContactUngrouped.get(contactName)!.push(note);
        });

        // Create subgroups for ungrouped contacts
        const ungroupedContactGroups: any[] = [];
        notesByContactUngrouped.forEach((contactNotes, contactName) => {
          ungroupedContactGroups.push({
            id: `ungrouped-${contactName}`,
            title: contactName,
            notes: contactNotes.sort((a, b) => 
              new Date(b.callStartTime).getTime() - new Date(a.callStartTime).getTime()
            ),
            type: 'contact-based',
            contactName,
          });
        });

        groups.push({
          id: 'ungrouped',
          title: 'Ungrouped',
          notes: ungrouped,
          type: 'folder-based',
          subGroups: ungroupedContactGroups,
        });
      }

      return groups;
    }

    // Time-based grouping with contact sub-grouping
    const notesByTimePeriod = new Map<string, CallNote[]>();
    
    filteredNotes.forEach(note => {
      const date = new Date(note.callStartTime);
      let timeKey: string;
      let timeTitle: string;

      switch (groupBy) {
        case 'day':
          timeKey = date.toDateString();
          timeTitle = date.toLocaleDateString('en-US', { 
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
          timeKey = `${weekStart.toDateString()}-${weekEnd.toDateString()}`;
          timeTitle = `Week of ${weekStart.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })} - ${weekEnd.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}`;
          break;
        case 'month':
          timeKey = `${date.getFullYear()}-${date.getMonth()}`;
          timeTitle = date.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });
          break;
        case 'year':
          timeKey = date.getFullYear().toString();
          timeTitle = date.getFullYear().toString();
          break;
        default:
          timeKey = date.toDateString();
          timeTitle = date.toDateString();
      }

      if (!notesByTimePeriod.has(timeKey)) {
        notesByTimePeriod.set(timeKey, []);
      }
      notesByTimePeriod.get(timeKey)!.push(note);
    });

    // Now create groups with contact-based subgrouping for time periods
    notesByTimePeriod.forEach((notesInPeriod, key) => {
      // Group notes by contact within this time period
      const notesByContact = new Map<string, CallNote[]>();
      
      notesInPeriod.forEach(note => {
        const contactKey = note.contactName;
        if (!notesByContact.has(contactKey)) {
          notesByContact.set(contactKey, []);
        }
        notesByContact.get(contactKey)!.push(note);
      });

      // Create subgroups for each contact
      const contactGroups: any[] = [];
      notesByContact.forEach((contactNotes, contactName) => {
        contactGroups.push({
          id: `${key}-${contactName}`,
          title: contactName,
          notes: contactNotes.sort((a, b) => 
            new Date(b.callStartTime).getTime() - new Date(a.callStartTime).getTime()
          ),
          type: 'contact-based',
          contactName,
        });
      });

      // Sort contact groups by most recent call
      contactGroups.sort((a, b) => {
        const aLatest = Math.max(...a.notes.map((n: CallNote) => new Date(n.callStartTime).getTime()));
        const bLatest = Math.max(...b.notes.map((n: CallNote) => new Date(n.callStartTime).getTime()));
        return bLatest - aLatest;
      });

      const [title] = key.split('|');
      groups.push({
        id: key,
        title: title || key,
        notes: notesInPeriod.sort((a, b) => 
          new Date(b.callStartTime).getTime() - new Date(a.callStartTime).getTime()
        ),
        type: 'time-based',
        date: notesInPeriod[0].callStartTime,
        subGroups: contactGroups,
      });
    });

    return groups.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });
  }, [filteredNotes, groupBy, folders]);

  const handleViewNote = (note: CallNote) => {
    setViewingNote(note);
    setShowViewModal(true);
  };

  const handleEditNote = (note: CallNote) => {
    setEditingNote(note);
    setShowEditModal(true);
  };

  const handleEditFromView = () => {
    if (viewingNote) {
      setShowViewModal(false);
      setEditingNote(viewingNote);
      setShowEditModal(true);
    }
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

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'contact': return '#007AFF20';
      case 'content': return '#34C75920';
      case 'tag': return '#FF950020';
      case 'category': return '#5856D620';
      default: return '#F2F2F720';
    }
  };

  const renderNote = ({ item }: { item: CallNote }) => (
    <TouchableOpacity 
      style={[
        styles.noteCard,
        highlightedNoteId === item.id && styles.highlightedNoteCard
      ]} 
      onPress={() => handleViewNote(item)}
    >
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

  const NoteGroup = ({ group }: { group: { id: string; title: string; notes: CallNote[]; type: 'time-based' | 'folder-based' | 'contact-based'; folderId?: string; date?: Date; contactName?: string; subGroups?: any[] } }) => {
    const isExpanded = expandedGroups.has(group.id);
    const sortedGroupNotes = [...group.notes].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // For time-based groups with subgroups (like day/week/month)
    if (group.type === 'time-based' && group.subGroups) {
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
              <Text style={styles.groupTitle}>{group.title}</Text>
            </View>
            <Text style={styles.groupCount}>{group.notes.length}</Text>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.groupContent}>
              {group.subGroups.map(subGroup => {
                const subGroupExpanded = expandedGroups.has(subGroup.id);
                const subGroupNotes = [...subGroup.notes].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                
                return (
                  <View key={subGroup.id} style={styles.subGroup}>
                    <TouchableOpacity
                      style={styles.subGroupHeader}
                      onPress={() => toggleGroup(subGroup.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.subGroupHeaderLeft}>
                        {subGroupExpanded ? (
                          <ChevronDown size={16} color="#666" />
                        ) : (
                          <ChevronRight size={16} color="#666" />
                        )}
                        <View style={styles.contactAvatar}>
                          <User size={14} color="#666" />
                        </View>
                        <Text style={styles.subGroupTitle}>{subGroup.title}</Text>
                      </View>
                      <Text style={styles.subGroupCount}>{subGroup.notes.length}</Text>
                    </TouchableOpacity>
                    
                    {subGroupExpanded && (
                      <View style={styles.subGroupContent}>
                        {subGroupNotes.map(item => (
                          <TouchableOpacity 
                            key={item.id} 
                            style={[
                              styles.noteItem,
                              highlightedNoteId === item.id && styles.highlightedNoteItem
                            ]}
                            onPress={() => handleViewNote(item)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.noteItemHeader}>
                              <View style={styles.noteTimeInfo}>
                                <Text style={styles.noteTime}>
                                  {new Date(item.callStartTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </Text>
                              </View>
                              <View style={styles.noteCallInfo}>
                                {item.callDirection === 'inbound' ? (
                                  <PhoneIncoming size={12} color="#34c759" />
                                ) : (
                                  <PhoneOutgoing size={12} color="#007AFF" />
                                )}
                                <Clock size={12} color="#8E8E93" />
                                <Text style={styles.callDurationText}>
                                  {Math.floor(item.callDuration / 60)}:{(item.callDuration % 60).toString().padStart(2, '0')}
                                </Text>
                              </View>
                            </View>
                            
                            {item.note && !item.isAutoGenerated && (
                              <Text style={styles.notePreview} numberOfLines={2}>
                                {item.note}
                              </Text>
                            )}
                            
                            <View style={styles.noteTagsRow}>
                              <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={[styles.statusTagText, { color: getStatusColor(item.status) }]}>
                                  {getStatusText(item.status, item.customStatus)}
                                </Text>
                              </View>
                              {item.priority && (
                                <View style={styles.priorityBadge}>
                                  <Circle size={6} color={getPriorityColor(item.priority)} fill={getPriorityColor(item.priority)} />
                                  <Text style={styles.priorityText}>{item.priority}</Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    // For contact-based groups (default grouping)
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
            <View style={styles.contactAvatar}>
              <User size={16} color="#666" />
            </View>
            <Text style={styles.groupTitle}>{group.title}</Text>
          </View>
          <Text style={styles.groupCount}>{group.notes.length}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.groupContent}>
            {sortedGroupNotes.map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.noteItem,
                  highlightedNoteId === item.id && styles.highlightedNoteItem
                ]}
                onPress={() => handleViewNote(item)}
                activeOpacity={0.7}
              >
                <View style={styles.noteItemHeader}>
                  <View style={styles.noteTimeInfo}>
                    <Text style={styles.noteTime}>
                      {new Date(item.callStartTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={styles.noteDate}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.noteCallInfo}>
                    {item.callDirection === 'inbound' ? (
                      <PhoneIncoming size={12} color="#34c759" />
                    ) : (
                      <PhoneOutgoing size={12} color="#007AFF" />
                    )}
                    <Clock size={12} color="#8E8E93" />
                    <Text style={styles.callDurationText}>
                      {Math.floor(item.callDuration / 60)}:{(item.callDuration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                </View>
                
                {item.note && !item.isAutoGenerated && (
                  <Text style={styles.notePreview} numberOfLines={2}>
                    {item.note}
                  </Text>
                )}
                
                <View style={styles.noteTagsRow}>
                  <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusTagText, { color: getStatusColor(item.status) }]}>
                      {getStatusText(item.status, item.customStatus)}
                    </Text>
                  </View>
                  {item.priority && (
                    <View style={styles.priorityBadge}>
                      <Circle size={6} color={getPriorityColor(item.priority)} fill={getPriorityColor(item.priority)} />
                      <Text style={styles.priorityText}>{item.priority}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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

      {/* Search Bar with Apple-style animation */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            height: searchAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 70],
            }),
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.searchInputWrapper,
            {
              opacity: searchOpacity,
              transform: [{ translateY: searchTranslateY }],
            }
          ]}
        >
          <View style={styles.searchInputContainer}>
            <Search size={18} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts, keywords, or notes..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={showSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.length > 0 && (
            <View style={styles.searchResults}>
              <Text style={styles.searchResultsText}>
                {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''} found
              </Text>
              {searchQuery.length > 0 && (
                <View style={styles.searchSuggestions}>
                  {getSearchSuggestions().map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchSuggestion}
                      onPress={() => setSearchQuery(suggestion)}
                    >
                      <Search size={14} color="#8E8E93" />
                      <Text style={styles.searchSuggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.View>
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
      <View style={styles.groupByWrapper}>
        <View style={styles.groupByContainer}>
          <TouchableOpacity 
            style={styles.groupByButton}
            onPress={() => setShowGroupByModal(true)}
          >
            <Filter size={16} color="#007AFF" />
            <Text style={styles.groupByButtonText}>Group by: {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</Text>
            <ChevronDown size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar under Group By */}
        <View style={styles.groupSearchContainer}>
          <View style={styles.groupSearchInputWrapper}>
            <Search size={16} color="#8E8E93" />
            <TextInput
              style={styles.groupSearchInput}
              placeholder="Search contacts or keywords..."
              placeholderTextColor="#8E8E93"
              value={groupSearchQuery}
              onChangeText={(text) => {
                setGroupSearchQuery(text);
                if (text.trim()) {
                  setSearchResultsExpanded(true);
                } else {
                  setSearchResultsExpanded(false);
                }
              }}
              returnKeyType="search"
            />
            {groupSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setGroupSearchQuery('');
                setSearchResultsExpanded(false);
              }}>
                <X size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search Results Dropdown */}
          {searchResultsExpanded && groupSearchQuery.trim() && (
            <View style={styles.searchResultsDropdown}>
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsTitle}>
                  {getSearchResults().length} result{getSearchResults().length !== 1 ? 's' : ''} found
                </Text>
                <TouchableOpacity 
                  onPress={() => setSearchResultsExpanded(false)}
                  style={styles.collapseButton}
                >
                  <X size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {getSearchResults().map((result, index) => (
                  <TouchableOpacity
                    key={`${result.note.id}-${index}`}
                    style={styles.searchResultItem}
                    onPress={() => handleSearchResultPress(result.note.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultContent}>
                      <View style={styles.searchResultHeader}>
                        <View style={styles.searchResultContactInfo}>
                          <View style={styles.searchResultAvatar}>
                            <User size={12} color="#666" />
                          </View>
                          <Text style={styles.searchResultContactName}>
                            {result.matchType === 'contact' 
                              ? highlightText(result.matchText, result.highlightStart, result.highlightEnd)
                              : result.note.contactName
                            }
                          </Text>
                        </View>
                        <View style={styles.searchResultMeta}>
                          <Text style={styles.searchResultTime}>
                            {formatDate(result.note.createdAt)}
                          </Text>
                          <View style={[styles.matchTypeBadge, { backgroundColor: getMatchTypeColor(result.matchType) }]}>
                            <Text style={styles.matchTypeText}>
                              {result.matchType === 'contact' ? 'Contact' :
                               result.matchType === 'content' ? 'Note' :
                               result.matchType === 'tag' ? 'Tag' : 'Category'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.searchResultMatch}>
                        {result.matchType === 'content' && (
                          <Text style={styles.searchResultMatchText}>
                            {result.highlightStart > 0 && '...'}
                            {highlightText(result.matchText, result.highlightStart, result.highlightEnd)}
                            {result.highlightEnd < result.matchText.length && '...'}
                          </Text>
                        )}
                        {result.matchType === 'tag' && (
                          <View style={styles.searchResultTag}>
                            <Tag size={10} color="#007AFF" />
                            {highlightText(result.matchText, result.highlightStart, result.highlightEnd)}
                          </View>
                        )}
                        {result.matchType === 'category' && (
                          <View style={styles.searchResultCategory}>
                            <Text style={styles.categoryLabel}>Category: </Text>
                            {highlightText(result.matchText, result.highlightStart, result.highlightEnd)}
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {getSearchResults().length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Search size={24} color="#ccc" />
                    <Text style={styles.noResultsText}>No matches found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
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
      
      <NoteViewModal
        visible={showViewModal}
        note={viewingNote}
        onClose={() => {
          setShowViewModal(false);
          setViewingNote(null);
        }}
        onEdit={handleEditFromView}
      />
      
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

      {/* Group By Modal */}
      <Modal
        visible={showGroupByModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowGroupByModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGroupByModal(false)}
        >
          <View style={styles.groupByModalContainer}>
            <Text style={styles.groupByModalTitle}>Group Notes By</Text>
            {(['none', 'day', 'week', 'month', 'year', 'folder'] as GroupByOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.groupByModalOption,
                  groupBy === option && styles.selectedGroupByOption
                ]}
                onPress={() => {
                  setGroupBy(option);
                  setShowGroupByModal(false);
                }}
              >
                <Text style={[
                  styles.groupByModalOptionText,
                  groupBy === option && styles.selectedGroupByOptionText
                ]}>
                  {option === 'none' ? 'No Grouping' : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
                {groupBy === option && <CheckCircle size={20} color="#007AFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  searchInputWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  groupByWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  groupByContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupByButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  groupByButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  groupSearchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  groupSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    gap: 8,
  },
  groupSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontWeight: '400',
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
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
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
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  groupContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  filteredText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#007AFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
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
  searchResults: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  searchResultsText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
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
    height: 0,
  },
  subGroup: {
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  subGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
  },
  subGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subGroupCount: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  subGroupContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noteItem: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  noteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteCallInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notePreview: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
    marginBottom: 6,
  },
  noteTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  noteDate: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 4,
  },
  highlightedText: {
    backgroundColor: '#FFEB3B',
    color: '#000',
    fontWeight: '600',
    borderRadius: 2,
    paddingHorizontal: 1,
  },
  highlightedNoteCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#007AFF05',
    transform: [{ scale: 1.02 }],
  },
  highlightedNoteItem: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#007AFF10',
  },
  searchResultsDropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  collapseButton: {
    padding: 4,
  },
  searchResultsList: {
    maxHeight: 240,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  searchResultContactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchResultContactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchResultTime: {
    fontSize: 11,
    color: '#8E8E93',
  },
  matchTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchTypeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  searchResultMatch: {
    marginTop: 4,
  },
  searchResultMatchText: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
  },
  searchResultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#007AFF10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  searchResultCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noResultsText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  searchSuggestions: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  searchSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  searchSuggestionText: {
    fontSize: 14,
    color: '#3C3C43',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  groupByModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  groupByModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  groupByModalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedGroupByOption: {
    backgroundColor: '#007AFF10',
  },
  groupByModalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedGroupByOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});