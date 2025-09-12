import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Contact, CallNote, IncomingCall, ActiveCall, Reminder, Order, DetectedDateTime, NoteStatus, NoteFolder, NoteFilter, ProductCatalog, Product } from '@/types/contact';

const CONTACTS_KEY = 'call_notes_contacts';
const NOTES_KEY = 'call_notes_notes';
const REMINDERS_KEY = 'call_notes_reminders';
const ORDERS_KEY = 'call_notes_orders';
const NOTE_TEMPLATE_KEY = 'call_note_template';
const FOLDERS_KEY = 'call_notes_folders';
const PRODUCT_CATALOGS_KEY = 'call_notes_product_catalogs';

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

  const foldersQuery = useQuery({
    queryKey: ['folders'],
    queryFn: async (): Promise<NoteFolder[]> => {
      const stored = await AsyncStorage.getItem(FOLDERS_KEY);
      const folders = stored ? JSON.parse(stored) : [];
      
      // Add default folders if none exist
      if (folders.length === 0) {
        const defaultFolders: NoteFolder[] = [
          {
            id: 'work',
            name: 'Work',
            color: '#007AFF',
            createdAt: new Date(),
            description: 'Work-related calls'
          },
          {
            id: 'personal',
            name: 'Personal',
            color: '#34C759',
            createdAt: new Date(),
            description: 'Personal calls'
          },
          {
            id: 'sales',
            name: 'Sales',
            color: '#FF9500',
            createdAt: new Date(),
            description: 'Sales and business calls'
          },
          {
            id: 'support',
            name: 'Support',
            color: '#5856D6',
            createdAt: new Date(),
            description: 'Customer support calls'
          }
        ];
        await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(defaultFolders));
        return defaultFolders;
      }
      
      return folders;
    }
  });

  const productCatalogsQuery = useQuery({
    queryKey: ['productCatalogs'],
    queryFn: async (): Promise<ProductCatalog[]> => {
      const stored = await AsyncStorage.getItem(PRODUCT_CATALOGS_KEY);
      return stored ? JSON.parse(stored) : [];
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
      const updated = reminders.map(reminder => {
        if (reminder.id === id) {
          const updatedReminder = { ...reminder, ...updates };
          // Set completedAt when marking as completed
          if (updates.isCompleted === true && !reminder.isCompleted) {
            updatedReminder.completedAt = new Date();
          }
          // Clear completedAt when marking as not completed
          if (updates.isCompleted === false && reminder.isCompleted) {
            updatedReminder.completedAt = undefined;
          }
          return updatedReminder;
        }
        return reminder;
      });
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

  const addFolderMutation = useMutation({
    mutationFn: async (folder: Omit<NoteFolder, 'id' | 'createdAt'>) => {
      const folders = foldersQuery.data || [];
      const newFolder: NoteFolder = {
        ...folder,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      const updated = [...folders, newFolder];
      await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    }
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NoteFolder> }) => {
      const folders = foldersQuery.data || [];
      const updated = folders.map(folder => 
        folder.id === id ? { ...folder, ...updates } : folder
      );
      await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const folders = foldersQuery.data || [];
      const notes = notesQuery.data || [];
      
      // Remove folder reference from notes
      const updatedNotes = notes.map(note => 
        note.folderId === folderId ? { ...note, folderId: undefined } : note
      );
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
      
      // Remove folder
      const updatedFolders = folders.filter(f => f.id !== folderId);
      await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(updatedFolders));
      
      return { folders: updatedFolders, notes: updatedNotes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const addProductCatalogMutation = useMutation({
    mutationFn: async (catalog: Omit<ProductCatalog, 'id' | 'createdAt' | 'updatedAt'>) => {
      const catalogs = productCatalogsQuery.data || [];
      const newCatalog: ProductCatalog = {
        ...catalog,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = [...catalogs, newCatalog];
      await AsyncStorage.setItem(PRODUCT_CATALOGS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCatalogs'] });
    }
  });

  const updateProductCatalogMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductCatalog> }) => {
      const catalogs = productCatalogsQuery.data || [];
      const updated = catalogs.map(catalog => 
        catalog.id === id ? { ...catalog, ...updates, updatedAt: new Date() } : catalog
      );
      await AsyncStorage.setItem(PRODUCT_CATALOGS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCatalogs'] });
    }
  });

  const deleteProductCatalogMutation = useMutation({
    mutationFn: async (catalogId: string) => {
      const catalogs = productCatalogsQuery.data || [];
      const updated = catalogs.filter(c => c.id !== catalogId);
      await AsyncStorage.setItem(PRODUCT_CATALOGS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productCatalogs'] });
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

  // Date/time detection utility function - simplified to only detect times
  const detectDateTimeInText = useCallback((text: string): DetectedDateTime[] => {
    const detections: DetectedDateTime[] = [];
    const now = new Date();
    
    // Only look for time patterns in 12/24 hour format
    const patterns = [
      // 24-hour format (e.g., 14:30, 09:00)
      { regex: /\b([01]?\d|2[0-3]):([0-5]\d)\b/g, type: 'time' as const, is24Hour: true },
      // 12-hour format with am/pm (e.g., 2:30pm, 9:00 AM)
      { regex: /\b(1[0-2]|0?[1-9]):([0-5]\d)\s*(am|pm|AM|PM)\b/g, type: 'time' as const, is24Hour: false },
      // 12-hour format without colon (e.g., 2pm, 9 AM)
      { regex: /\b(1[0-2]|0?[1-9])\s*(am|pm|AM|PM)\b/g, type: 'time' as const, is24Hour: false },
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const matchText = match[0];
        let suggestedDate = new Date(now);
        
        try {
          // Parse time
          let hours = parseInt(match[1]);
          let minutes = 0;
          
          if (match[2] && match[2].match(/\d+/)) {
            minutes = parseInt(match[2]);
          }
          
          // Handle 12-hour format with AM/PM
          if (!pattern.is24Hour && match[3]) {
            const ampm = match[3].toLowerCase();
            if (ampm === 'pm' && hours !== 12) {
              hours += 12;
            } else if (ampm === 'am' && hours === 12) {
              hours = 0;
            }
          } else if (!pattern.is24Hour && match[2] && !match[2].match(/\d+/)) {
            // Handle format like "2pm" where match[2] is am/pm
            const ampm = match[2].toLowerCase();
            if (ampm === 'pm' && hours !== 12) {
              hours += 12;
            } else if (ampm === 'am' && hours === 12) {
              hours = 0;
            }
          }
          
          // Set the time for today initially
          suggestedDate.setHours(hours, minutes, 0, 0);
          
          // If the time has already passed today, set it for tomorrow
          if (suggestedDate.getTime() <= now.getTime()) {
            suggestedDate.setDate(suggestedDate.getDate() + 1);
          }
          
          detections.push({
            originalText: matchText,
            suggestedDate,
            type: 'time',
            confidence: 0.9
          });
        } catch (error) {
          console.log('Error parsing time:', error);
        }
      }
    });
    
    // Remove duplicate times (same hour and minute)
    const uniqueDetections = detections.filter((detection, index, self) => {
      return index === self.findIndex(d => 
        d.suggestedDate.getHours() === detection.suggestedDate.getHours() &&
        d.suggestedDate.getMinutes() === detection.suggestedDate.getMinutes()
      );
    });
    
    return uniqueDetections;
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
    await AsyncStorage.removeItem(FOLDERS_KEY);
    await AsyncStorage.removeItem(PRODUCT_CATALOGS_KEY);
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    queryClient.invalidateQueries({ queryKey: ['productCatalogs'] });
  }, [queryClient]);

  const addFakeContactsMutation = useMutation({
    mutationFn: async () => {
      const fakeContacts: Omit<Contact, 'id' | 'createdAt'>[] = [
        {
          name: 'John Smith',
          phoneNumber: '+1234567890',
        },
        {
          name: 'Sarah Johnson',
          phoneNumber: '+1987654321',
        },
        {
          name: 'Michael Brown',
          phoneNumber: '+1555123456',
        },
        {
          name: 'Emily Davis',
          phoneNumber: '+1444987654',
        },
        {
          name: 'David Wilson',
          phoneNumber: '+1333456789',
        },
        {
          name: 'Lisa Anderson',
          phoneNumber: '+1222789012',
        },
        {
          name: 'Robert Taylor',
          phoneNumber: '+1111345678',
        },
        {
          name: 'Jennifer Martinez',
          phoneNumber: '+1666901234',
        },
        {
          name: 'Christopher Lee',
          phoneNumber: '+1777567890',
        },
        {
          name: 'Amanda White',
          phoneNumber: '+1888234567',
        },
        {
          name: 'James Garcia',
          phoneNumber: '+1999678901',
        },
        {
          name: 'Michelle Rodriguez',
          phoneNumber: '+1555890123',
        },
        {
          name: 'Daniel Thompson',
          phoneNumber: '+1444123456',
        },
        {
          name: 'Jessica Moore',
          phoneNumber: '+1333789012',
        },
        {
          name: 'Matthew Jackson',
          phoneNumber: '+1222456789',
        }
      ];

      const existingContacts = contactsQuery.data || [];
      const existingPhones = new Set(existingContacts.map(c => c.phoneNumber));
      
      const newContacts: Contact[] = [];
      
      fakeContacts.forEach(fakeContact => {
        if (!existingPhones.has(fakeContact.phoneNumber)) {
          newContacts.push({
            ...fakeContact,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
          });
          existingPhones.add(fakeContact.phoneNumber);
        }
      });

      const updated = [...existingContacts, ...newContacts];
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
      return { added: newContacts.length, total: updated.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

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
    folders: foldersQuery.data || [],
    productCatalogs: productCatalogsQuery.data || [],
    noteTemplate: noteTemplateQuery.data || DEFAULT_NOTE_TEMPLATE,
    isLoading: contactsQuery.isLoading || notesQuery.isLoading || remindersQuery.isLoading || ordersQuery.isLoading || noteTemplateQuery.isLoading || foldersQuery.isLoading || productCatalogsQuery.isLoading,
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
    addFolder: addFolderMutation.mutate,
    updateFolder: updateFolderMutation.mutate,
    deleteFolder: deleteFolderMutation.mutate,
    addProductCatalog: addProductCatalogMutation.mutate,
    updateProductCatalog: updateProductCatalogMutation.mutate,
    deleteProductCatalog: deleteProductCatalogMutation.mutate,
    openCallNoteModal,
    simulateIncomingCall,
    answerCall,
    declineCall,
    endCall,
    closeNoteModal,
    saveNote,
    getFormattedNoteTemplate,
    clearAllData,
    addFakeContacts: addFakeContactsMutation.mutate,
    isAddingFakeContacts: addFakeContactsMutation.isPending,
    createReminderFromDetection,
    closeReminderSuggestionModal,
  }), [
    contactsQuery.data,
    notesQuery.data,
    remindersQuery.data,
    ordersQuery.data,
    foldersQuery.data,
    productCatalogsQuery.data,
    noteTemplateQuery.data,
    contactsQuery.isLoading,
    notesQuery.isLoading,
    remindersQuery.isLoading,
    ordersQuery.isLoading,
    foldersQuery.isLoading,
    productCatalogsQuery.isLoading,
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
    addFolderMutation.mutate,
    updateFolderMutation.mutate,
    deleteFolderMutation.mutate,
    addProductCatalogMutation.mutate,
    updateProductCatalogMutation.mutate,
    deleteProductCatalogMutation.mutate,
    openCallNoteModal,
    simulateIncomingCall,
    answerCall,
    declineCall,
    endCall,
    closeNoteModal,
    saveNote,
    getFormattedNoteTemplate,
    clearAllData,
    addFakeContactsMutation.mutate,
    addFakeContactsMutation.isPending,
    createReminderFromDetection,
    closeReminderSuggestionModal,
  ]);
});