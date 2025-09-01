import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Contact, CallNote, IncomingCall, ActiveCall, Reminder, Order, DetectedDateTime, NoteStatus } from '@/types/contact';

const CONTACTS_KEY = 'call_notes_contacts';
const NOTES_KEY = 'call_notes_notes';
const REMINDERS_KEY = 'call_notes_reminders';
const ORDERS_KEY = 'call_notes_orders';
const NOTE_TEMPLATE_KEY = 'call_note_template';

const DEFAULT_NOTE_TEMPLATE = `Call with [CONTACT_NAME] - [DATE]

Purpose of call:

Key points discussed:

Action items:

Next steps:

Additional notes:`;

export const [ContactsProvider, useContacts] = createContextHook(() => {
  // Always call hooks in the same order
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [currentCallContact, setCurrentCallContact] = useState<Contact | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callEndTime, setCallEndTime] = useState<Date | null>(null);
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('inbound');
  const [detectedDateTimes, setDetectedDateTimes] = useState<DetectedDateTime[]>([]);
  const [showReminderSuggestionModal, setShowReminderSuggestionModal] = useState<boolean>(false);
  const [currentNoteForReminder, setCurrentNoteForReminder] = useState<CallNote | null>(null);
  
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ['contacts'],
    queryFn: async (): Promise<Contact[]> => {
      const stored = await AsyncStorage.getItem(CONTACTS_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  });

  const notesQuery = useQuery({
    queryKey: ['notes'],
    queryFn: async (): Promise<CallNote[]> => {
      const stored = await AsyncStorage.getItem(NOTES_KEY);
      const notes = stored ? JSON.parse(stored) : [];
      
      // Migrate old notes to include status field
      const migratedNotes = notes.map((note: any) => ({
        ...note,
        status: note.status || 'follow-up' as NoteStatus,
        customStatus: note.customStatus || undefined,
      }));
      
      // Save migrated notes back if any migration occurred
      const needsMigration = notes.some((note: any) => !note.status);
      if (needsMigration) {
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(migratedNotes));
      }
      
      return migratedNotes;
    }
  });

  const remindersQuery = useQuery({
    queryKey: ['reminders'],
    queryFn: async (): Promise<Reminder[]> => {
      const stored = await AsyncStorage.getItem(REMINDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  });

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: async (): Promise<Order[]> => {
      const stored = await AsyncStorage.getItem(ORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  });

  const noteTemplateQuery = useQuery({
    queryKey: ['noteTemplate'],
    queryFn: async (): Promise<string> => {
      const stored = await AsyncStorage.getItem(NOTE_TEMPLATE_KEY);
      return stored || DEFAULT_NOTE_TEMPLATE;
    }
  });

  const addContactMutation = useMutation({
    mutationFn: async (contact: Omit<Contact, 'id' | 'createdAt'>) => {
      const contacts = contactsQuery.data || [];
      const newContact: Contact = {
        ...contact,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      const updated = [...contacts, newContact];
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const contacts = contactsQuery.data || [];
      const updated = contacts.filter(c => c.id !== contactId);
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const importContactsMutation = useMutation({
    mutationFn: async () => {
      if (Platform.OS === 'web') {
        throw new Error('Contact import is not available on web');
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access contacts was denied');
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      const existingContacts = contactsQuery.data || [];
      const existingPhones = new Set(existingContacts.map(c => c.phoneNumber));
      
      const newContacts: Contact[] = [];
      
      data.forEach(deviceContact => {
        if (deviceContact.name && deviceContact.phoneNumbers && deviceContact.phoneNumbers.length > 0) {
          const phoneNumber = deviceContact.phoneNumbers[0].number?.replace(/[^\d+]/g, '') || '';
          
          if (phoneNumber && !existingPhones.has(phoneNumber)) {
            newContacts.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: deviceContact.name,
              phoneNumber,
              createdAt: new Date(),
            });
            existingPhones.add(phoneNumber);
          }
        }
      });

      const updated = [...existingContacts, ...newContacts];
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
      return { imported: newContacts.length, total: updated.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: Omit<CallNote, 'id' | 'createdAt'>) => {
      const notes = notesQuery.data || [];
      const newNote: CallNote = {
        ...note,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      const updated = [...notes, newNote];
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CallNote> }) => {
      const notes = notesQuery.data || [];
      const updated = notes.map(note => 
        note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
      );
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const notes = notesQuery.data || [];
      const updated = notes.filter(note => note.id !== noteId);
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const addReminderMutation = useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'createdAt'>) => {
      const reminders = remindersQuery.data || [];
      const newReminder: Reminder = {
        ...reminder,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      const updated = [...reminders, newReminder];
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Reminder> }) => {
      const reminders = remindersQuery.data || [];
      const updated = reminders.map(reminder => 
        reminder.id === id ? { ...reminder, ...updates } : reminder
      );
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const reminders = remindersQuery.data || [];
      const updated = reminders.filter(r => r.id !== reminderId);
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
  });

  const addOrderMutation = useMutation({
    mutationFn: async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
      const orders = ordersQuery.data || [];
      const newOrder: Order = {
        ...order,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = [...orders, newOrder];
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Order> }) => {
      const orders = ordersQuery.data || [];
      const updated = orders.map(order => 
        order.id === id ? { ...order, ...updates, updatedAt: new Date() } : order
      );
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const orders = ordersQuery.data || [];
      const updated = orders.filter(o => o.id !== orderId);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const updateNoteTemplateMutation = useMutation({
    mutationFn: async (template: string) => {
      await AsyncStorage.setItem(NOTE_TEMPLATE_KEY, template);
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteTemplate'] });
    }
  });
  
  const { mutate: addNoteMutate } = addNoteMutation;

  const openCallNoteModal = useCallback((contact: Contact) => {
    const now = new Date();
    setCurrentCallContact(contact);
    setCallStartTime(now);
    setCallEndTime(now);
    setCallDirection('inbound');
    setShowNoteModal(true);
  }, []);

  const simulateIncomingCall = useCallback((contact: Contact, direction: 'inbound' | 'outbound' = 'inbound') => {
    setIncomingCall({
      contact,
      startTime: new Date(),
      direction,
    });
  }, []);

  const endCall = useCallback(() => {
    if (activeCall && callStartTime) {
      const callEnd = new Date();
      setCallEndTime(callEnd);
      setCurrentCallContact(activeCall.contact);
      setCallDirection(activeCall.direction);
      setActiveCall(null);
      setShowNoteModal(true);
    }
  }, [activeCall, callStartTime]);
  
  const answerCall = useCallback(() => {
    if (incomingCall) {
      const callStart = new Date();
      setActiveCall({
        contact: incomingCall.contact,
        startTime: callStart,
        direction: incomingCall.direction,
      });
      setCallStartTime(callStart);
      setIncomingCall(null);
      
      // Simulate call duration (3-10 seconds for demo)
      const callDuration = Math.floor(Math.random() * 8000) + 3000;
      setTimeout(() => {
        endCall();
      }, callDuration);
    }
  }, [incomingCall, endCall]);
  


  const declineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  const closeNoteModal = useCallback(() => {
    setShowNoteModal(false);
    setCurrentCallContact(null);
    setCallStartTime(null);
    setCallEndTime(null);
    setCallDirection('inbound');
  }, []);

  // Date/time detection utility function
  const detectDateTimeInText = useCallback((text: string): DetectedDateTime[] => {
    const detections: DetectedDateTime[] = [];
    const now = new Date();
    
    // Common date/time patterns
    const patterns = [
      // Time patterns
      { regex: /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi, type: 'time' as const },
      { regex: /\b(\d{1,2})\s*(am|pm)\b/gi, type: 'time' as const },
      
      // Date patterns
      { regex: /\b(tomorrow|tmrw)\b/gi, type: 'date' as const },
      { regex: /\b(today)\b/gi, type: 'date' as const },
      { regex: /\b(next week)\b/gi, type: 'date' as const },
      { regex: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, type: 'date' as const },
      { regex: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, type: 'date' as const },
      { regex: /\b(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?\b/g, type: 'date' as const },
      { regex: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/gi, type: 'date' as const },
      { regex: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/gi, type: 'date' as const },
      
      // Combined patterns
      { regex: /\b(tomorrow|tmrw)\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi, type: 'datetime' as const },
      { regex: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi, type: 'datetime' as const },
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const matchText = match[0];
        let suggestedDate = new Date(now);
        
        try {
          // Parse different date/time formats
          if (matchText.toLowerCase().includes('tomorrow') || matchText.toLowerCase().includes('tmrw')) {
            suggestedDate.setDate(now.getDate() + 1);
          } else if (matchText.toLowerCase().includes('today')) {
            // Keep current date
          } else if (matchText.toLowerCase().includes('next week')) {
            suggestedDate.setDate(now.getDate() + 7);
          } else if (matchText.toLowerCase().match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/)) {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = dayNames.indexOf(matchText.toLowerCase().match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/)![0]);
            const currentDay = now.getDay();
            let daysUntilTarget = targetDay - currentDay;
            if (daysUntilTarget <= 0) daysUntilTarget += 7; // Next occurrence
            suggestedDate.setDate(now.getDate() + daysUntilTarget);
          }
          
          // Handle time parsing
          const timeMatch = matchText.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i) || matchText.match(/(\d{1,2})\s*(am|pm)/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const ampm = timeMatch[3] || timeMatch[2];
            
            if (ampm && ampm.toLowerCase() === 'pm' && hours !== 12) {
              hours += 12;
            } else if (ampm && ampm.toLowerCase() === 'am' && hours === 12) {
              hours = 0;
            }
            
            suggestedDate.setHours(hours, minutes, 0, 0);
          }
          
          detections.push({
            originalText: matchText,
            suggestedDate,
            type: pattern.type,
            confidence: 0.8
          });
        } catch (error) {
          console.log('Error parsing date/time:', error);
        }
      }
    });
    
    return detections;
  }, []);

  const saveNote = useCallback((noteText: string, status: NoteStatus = 'follow-up', customStatus?: string) => {
    if (currentCallContact && callStartTime && callEndTime) {
      const duration = Math.floor((callEndTime.getTime() - callStartTime.getTime()) / 1000);
      const finalNote = noteText.trim() || 'No note was taken';
      
      const newNote: CallNote = {
        id: Date.now().toString(),
        contactId: currentCallContact.id,
        contactName: currentCallContact.name,
        note: finalNote,
        callStartTime,
        callEndTime,
        callDuration: duration,
        isAutoGenerated: !noteText.trim(),
        callDirection,
        status,
        customStatus,
        createdAt: new Date(),
      };
      
      addNoteMutate({
        contactId: currentCallContact.id,
        contactName: currentCallContact.name,
        note: finalNote,
        callStartTime,
        callEndTime,
        callDuration: duration,
        isAutoGenerated: !noteText.trim(),
        callDirection,
        status,
        customStatus,
      });
      
      // Detect dates/times in the note text if it's not auto-generated
      if (noteText.trim()) {
        const detectedDates = detectDateTimeInText(noteText);
        if (detectedDates.length > 0) {
          setDetectedDateTimes(detectedDates);
          setCurrentNoteForReminder(newNote);
          setShowReminderSuggestionModal(true);
        }
      }
    }
    closeNoteModal();
  }, [currentCallContact, callStartTime, callEndTime, callDirection, addNoteMutate, closeNoteModal, detectDateTimeInText]);

  const getFormattedNoteTemplate = useCallback((contactName: string) => {
    const template = noteTemplateQuery.data || DEFAULT_NOTE_TEMPLATE;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return template
      .replace(/\[CONTACT_NAME\]/g, contactName)
      .replace(/\[DATE\]/g, formattedDate);
  }, [noteTemplateQuery.data]);

  const clearAllData = useCallback(async () => {
    await AsyncStorage.removeItem(CONTACTS_KEY);
    await AsyncStorage.removeItem(NOTES_KEY);
    await AsyncStorage.removeItem(REMINDERS_KEY);
    await AsyncStorage.removeItem(ORDERS_KEY);
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  const { mutate: addReminderMutate } = addReminderMutation;

  const createReminderFromDetection = useCallback((detection: DetectedDateTime, title?: string) => {
    if (currentNoteForReminder) {
      const reminderTitle = title || `Follow up: ${detection.originalText}`;
      addReminderMutate({
        contactId: currentNoteForReminder.contactId,
        contactName: currentNoteForReminder.contactName,
        title: reminderTitle,
        description: `From call note: "${currentNoteForReminder.note.substring(0, 100)}${currentNoteForReminder.note.length > 100 ? '...' : ''}"`,
        dueDate: detection.suggestedDate,
        isCompleted: false,
        relatedNoteId: currentNoteForReminder.id,
      });
    }
  }, [currentNoteForReminder, addReminderMutate]);

  const closeReminderSuggestionModal = useCallback(() => {
    setShowReminderSuggestionModal(false);
    setDetectedDateTimes([]);
    setCurrentNoteForReminder(null);
  }, []);

  // Call Directory Extension Support (iOS only)
  const getCallDirectoryData = useCallback(() => {
    if (Platform.OS !== 'ios') {
      return { identificationEntries: [], blockingEntries: [] };
    }

    const contacts = contactsQuery.data || [];
    
    // Format contacts for iOS Call Directory
    const identificationEntries = contacts
      .filter(contact => contact.phoneNumber)
      .map(contact => ({
        phoneNumber: contact.phoneNumber.replace(/[^\d+]/g, ''), // Clean phone number
        label: contact.name,
      }))
      .sort((a, b) => a.phoneNumber.localeCompare(b.phoneNumber)); // iOS requires sorted entries

    // For blocking, you could add logic to block numbers not in contacts
    // or maintain a separate blocked numbers list
    const blockingEntries: { phoneNumber: string }[] = [];

    return {
      identificationEntries,
      blockingEntries,
      totalContacts: contacts.length,
      lastUpdated: new Date().toISOString(),
    };
  }, [contactsQuery.data]);

  const exportCallDirectoryData = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Call Directory is only available on iOS');
    }

    const data = getCallDirectoryData();
    
    // Store the data in a format that could be accessed by a Call Directory extension
    await AsyncStorage.setItem('call_directory_data', JSON.stringify(data));
    
    return data;
  }, [getCallDirectoryData]);

  return useMemo(() => ({
    contacts: contactsQuery.data || [],
    notes: notesQuery.data || [],
    reminders: remindersQuery.data || [],
    orders: ordersQuery.data || [],
    noteTemplate: noteTemplateQuery.data || DEFAULT_NOTE_TEMPLATE,
    isLoading: contactsQuery.isLoading || notesQuery.isLoading || remindersQuery.isLoading || ordersQuery.isLoading || noteTemplateQuery.isLoading,
    incomingCall,
    activeCall,
    showNoteModal,
    currentCallContact,
    callStartTime,
    callEndTime,
    detectedDateTimes,
    showReminderSuggestionModal,
    currentNoteForReminder,
    addContact: addContactMutation.mutate,
    deleteContact: deleteContactMutation.mutate,
    importContacts: importContactsMutation.mutate,
    isImporting: importContactsMutation.isPending,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    addReminder: addReminderMutation.mutate,
    updateReminder: updateReminderMutation.mutate,
    deleteReminder: deleteReminderMutation.mutate,
    addOrder: addOrderMutation.mutate,
    updateOrder: updateOrderMutation.mutate,
    deleteOrder: deleteOrderMutation.mutate,
    updateNoteTemplate: updateNoteTemplateMutation.mutate,
    openCallNoteModal,
    simulateIncomingCall,
    answerCall,
    declineCall,
    endCall,
    closeNoteModal,
    saveNote,
    getFormattedNoteTemplate,
    clearAllData,
    createReminderFromDetection,
    closeReminderSuggestionModal,
  }), [
    contactsQuery.data,
    notesQuery.data,
    remindersQuery.data,
    ordersQuery.data,
    noteTemplateQuery.data,
    contactsQuery.isLoading,
    notesQuery.isLoading,
    remindersQuery.isLoading,
    ordersQuery.isLoading,
    noteTemplateQuery.isLoading,
    incomingCall,
    activeCall,
    showNoteModal,
    currentCallContact,
    callStartTime,
    callEndTime,
    detectedDateTimes,
    showReminderSuggestionModal,
    currentNoteForReminder,
    addContactMutation.mutate,
    deleteContactMutation.mutate,
    importContactsMutation.mutate,
    importContactsMutation.isPending,
    updateNoteMutation.mutate,
    deleteNoteMutation.mutate,
    addReminderMutation.mutate,
    updateReminderMutation.mutate,
    deleteReminderMutation.mutate,
    addOrderMutation.mutate,
    updateOrderMutation.mutate,
    deleteOrderMutation.mutate,
    updateNoteTemplateMutation.mutate,
    openCallNoteModal,
    simulateIncomingCall,
    answerCall,
    declineCall,
    endCall,
    closeNoteModal,
    saveNote,
    getFormattedNoteTemplate,
    clearAllData,
    createReminderFromDetection,
    closeReminderSuggestionModal,
  ]);
});