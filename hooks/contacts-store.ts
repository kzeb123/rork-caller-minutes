import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Contact, CallNote, IncomingCall, ActiveCall, Reminder, Order } from '@/types/contact';

const CONTACTS_KEY = 'call_notes_contacts';
const NOTES_KEY = 'call_notes_notes';
const REMINDERS_KEY = 'call_notes_reminders';
const ORDERS_KEY = 'call_notes_orders';

export const [ContactsProvider, useContacts] = createContextHook(() => {
  // Always call hooks in the same order
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [currentCallContact, setCurrentCallContact] = useState<Contact | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callEndTime, setCallEndTime] = useState<Date | null>(null);
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('inbound');
  
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
      return stored ? JSON.parse(stored) : [];
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
  
  const { mutate: addNoteMutate } = addNoteMutation;

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

  const saveNote = useCallback((noteText: string) => {
    if (currentCallContact && callStartTime && callEndTime) {
      const duration = Math.floor((callEndTime.getTime() - callStartTime.getTime()) / 1000);
      const finalNote = noteText.trim() || 'No note was taken';
      
      addNoteMutate({
        contactId: currentCallContact.id,
        contactName: currentCallContact.name,
        note: finalNote,
        callStartTime,
        callEndTime,
        callDuration: duration,
        isAutoGenerated: !noteText.trim(),
        callDirection,
      });
    }
    closeNoteModal();
  }, [currentCallContact, callStartTime, callEndTime, callDirection, addNoteMutate, closeNoteModal]);

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
    isLoading: contactsQuery.isLoading || notesQuery.isLoading || remindersQuery.isLoading || ordersQuery.isLoading,
    incomingCall,
    activeCall,
    showNoteModal,
    currentCallContact,
    callStartTime,
    callEndTime,
    addContact: addContactMutation.mutate,
    deleteContact: deleteContactMutation.mutate,
    importContacts: importContactsMutation.mutate,
    isImporting: importContactsMutation.isPending,
    addReminder: addReminderMutation.mutate,
    updateReminder: updateReminderMutation.mutate,
    deleteReminder: deleteReminderMutation.mutate,
    addOrder: addOrderMutation.mutate,
    updateOrder: updateOrderMutation.mutate,
    deleteOrder: deleteOrderMutation.mutate,
    simulateIncomingCall,
    answerCall,
    declineCall,
    endCall,
    closeNoteModal,
    saveNote,
    clearAllData,
  }), [
    contactsQuery.data,
    notesQuery.data,
    remindersQuery.data,
    ordersQuery.data,
    contactsQuery.isLoading,
    notesQuery.isLoading,
    remindersQuery.isLoading,
    ordersQuery.isLoading,
    incomingCall,
    activeCall,
    showNoteModal,
    currentCallContact,
    callStartTime,
    callEndTime,
    addContactMutation.mutate,
    deleteContactMutation.mutate,
    importContactsMutation.mutate,
    importContactsMutation.isPending,
    addReminderMutation.mutate,
    updateReminderMutation.mutate,
    deleteReminderMutation.mutate,
    addOrderMutation.mutate,
    updateOrderMutation.mutate,
    deleteOrderMutation.mutate,
    simulateIncomingCall,
    answerCall,
    declineCall,
    endCall,
    closeNoteModal,
    saveNote,
    clearAllData,
  ]);
});