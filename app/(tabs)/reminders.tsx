import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { Bell, CheckCircle, Circle, Calendar, User, AlertCircle, Plus, X, Edit3, Trash2 } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { Contact } from '@/types/contact';

export default function RemindersScreen() {
  const { reminders, contacts, addReminder, updateReminder, deleteReminder } = useContacts();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [newReminderTitle, setNewReminderTitle] = useState<string>('');
  const [newReminderDescription, setNewReminderDescription] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleAddReminder = () => {
    if (!newReminderTitle.trim() || !selectedContactId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) {
      Alert.alert('Error', 'Selected contact not found');
      return;
    }

    addReminder({
      contactId: contact.id,
      contactName: contact.name,
      title: newReminderTitle.trim(),
      description: newReminderDescription.trim(),
      dueDate: selectedDate,
      isCompleted: false,
    });

    setNewReminderTitle('');
    setNewReminderDescription('');
    setSelectedContactId('');
    setSelectedDate(new Date());
    setShowAddModal(false);
  };

  const handleQuickAdd = () => {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Add some contacts first to create reminders.');
      return;
    }
    const contact = contacts[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    addReminder({
      contactId: contact.id,
      contactName: contact.name,
      title: `Follow up with ${contact.name}`,
      description: 'Follow up on recent call',
      dueDate: tomorrow,
      isCompleted: false,
    });
  };

  const ContactPicker = ({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) => (
    <View style={styles.contactPicker}>
      <Text style={styles.inputLabel}>Contact *</Text>
      {contacts.length === 0 ? (
        <View style={styles.noContactsContainer}>
          <Text style={styles.noContactsText}>No contacts available. Add contacts first.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactScrollView}>
          {contacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={[
                styles.contactChip,
                selectedId === contact.id && styles.selectedContactChip
              ]}
              onPress={() => onSelect(contact.id)}
            >
              <Text style={[
                styles.contactChipText,
                selectedId === contact.id && styles.selectedContactChipText
              ]}>
                {contact.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const DatePicker = ({ date, onDateChange }: { date: Date; onDateChange: (date: Date) => void }) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const quickDates = [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: 'Next Week', date: nextWeek },
    ];

    return (
      <View style={styles.datePicker}>
        <Text style={styles.inputLabel}>Due Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollView}>
          {quickDates.map((quickDate) => {
            const isSelected = date.toDateString() === quickDate.date.toDateString();
            return (
              <TouchableOpacity
                key={quickDate.label}
                style={[
                  styles.dateChip,
                  isSelected && styles.selectedDateChip
                ]}
                onPress={() => onDateChange(quickDate.date)}
              >
                <Text style={[
                  styles.dateChipText,
                  isSelected && styles.selectedDateChipText
                ]}>
                  {quickDate.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={styles.selectedDateText}>
          Selected: {date.toLocaleDateString()}
        </Text>
      </View>
    );
  };

  const AddReminderModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <X size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Reminder</Text>
          <TouchableOpacity onPress={handleAddReminder}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={newReminderTitle}
              onChangeText={setNewReminderTitle}
              placeholder="Enter reminder title"
              multiline={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={newReminderDescription}
              onChangeText={setNewReminderDescription}
              placeholder="Enter description (optional)"
              multiline={true}
              numberOfLines={3}
            />
          </View>

          <ContactPicker selectedId={selectedContactId} onSelect={setSelectedContactId} />
          <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
        </ScrollView>
      </View>
    </Modal>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Bell size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Reminders Yet</Text>
      <Text style={styles.emptyText}>
        Create reminders to follow up with your contacts after calls
      </Text>
      <TouchableOpacity 
        style={styles.emptyActionButton}
        onPress={() => {
          if (contacts.length === 0) {
            Alert.alert('No Contacts', 'Add some contacts first to create reminders.');
            return;
          }
          setShowAddModal(true);
        }}
      >
        <Plus size={20} color="#fff" />
        <Text style={styles.emptyActionButtonText}>Create First Reminder</Text>
      </TouchableOpacity>
    </View>
  );

  const sortedReminders = reminders.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const pendingReminders = reminders.filter(r => !r.isCompleted);
  const completedReminders = reminders.filter(r => r.isCompleted);
  const overdueReminders = pendingReminders.filter(r => new Date(r.dueDate) < new Date());
  const todayReminders = pendingReminders.filter(r => new Date(r.dueDate).toDateString() === new Date().toDateString());

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Reminders' }} />
      
      {reminders.length === 0 ? (
        renderEmpty()
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{pendingReminders.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#FF3B30' }]}>{overdueReminders.length}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#FF9500' }]}>{todayReminders.length}</Text>
                <Text style={styles.statLabel}>Today</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#34C759' }]}>{completedReminders.length}</Text>
                <Text style={styles.statLabel}>Done</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Reminders</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.remindersList}>
              {sortedReminders.map((reminder) => {
                const isOverdue = new Date(reminder.dueDate) < new Date() && !reminder.isCompleted;
                const isToday = new Date(reminder.dueDate).toDateString() === new Date().toDateString();
                const contact = contacts.find(c => c.id === reminder.contactId);
                
                return (
                  <View key={reminder.id} style={[
                    styles.reminderCard,
                    reminder.isCompleted && styles.completedReminderCard,
                    isOverdue && styles.overdueReminderCard
                  ]}>
                    <TouchableOpacity 
                      style={styles.reminderCheckbox}
                      onPress={() => updateReminder({ 
                        id: reminder.id, 
                        updates: { isCompleted: !reminder.isCompleted } 
                      })}
                    >
                      {reminder.isCompleted ? (
                        <CheckCircle size={24} color="#34C759" />
                      ) : (
                        <Circle size={24} color={isOverdue ? "#FF3B30" : "#8E8E93"} />
                      )}
                    </TouchableOpacity>
                    
                    <View style={styles.reminderContent}>
                      <Text style={[
                        styles.reminderTitle,
                        reminder.isCompleted && styles.completedReminderTitle
                      ]}>
                        {reminder.title}
                      </Text>
                      
                      <View style={styles.reminderMeta}>
                        <View style={styles.reminderMetaItem}>
                          <User size={14} color="#8E8E93" />
                          <Text style={styles.reminderMetaText}>
                            {contact ? contact.name : reminder.contactName}
                            {contact && contact.phoneNumber && (
                              <Text style={styles.phoneText}> • {contact.phoneNumber}</Text>
                            )}
                          </Text>
                        </View>
                        
                        <View style={styles.reminderMetaItem}>
                          <Calendar size={14} color={isOverdue ? "#FF3B30" : isToday ? "#FF9500" : "#8E8E93"} />
                          <Text style={[
                            styles.reminderMetaText,
                            isOverdue && styles.overdueText,
                            isToday && styles.todayText
                          ]}>
                            {isToday ? 'Today' : new Date(reminder.dueDate).toLocaleDateString()}
                          </Text>
                        </View>
                        
                        {isOverdue && !reminder.isCompleted && (
                          <View style={styles.reminderMetaItem}>
                            <AlertCircle size={14} color="#FF3B30" />
                            <Text style={styles.overdueText}>Overdue</Text>
                          </View>
                        )}
                      </View>
                      
                      {reminder.description && (
                        <Text style={[
                          styles.reminderDescription,
                          reminder.isCompleted && styles.completedReminderDescription
                        ]}>
                          {reminder.description}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.reminderActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => {
                          Alert.alert(
                            'Delete Reminder',
                            'Are you sure you want to delete this reminder?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(reminder.id) }
                            ]
                          );
                        }}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Bell size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Set reminders to follow up with contacts after calls. Reminders help you maintain better relationships and never miss important follow-ups.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      <AddReminderModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingVertical: 16,
  },
  statsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  remindersList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedReminderCard: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  overdueReminderCard: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30' + '08',
  },
  reminderCheckbox: {
    marginTop: 2,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  completedReminderTitle: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  reminderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  reminderMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderMetaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  overdueText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  todayText: {
    color: '#FF9500',
    fontWeight: '500',
  },
  reminderDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  completedReminderDescription: {
    color: '#8E8E93',
  },
  reminderActions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  contactPicker: {
    marginBottom: 20,
  },
  contactScrollView: {
    maxHeight: 50,
  },
  contactChip: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedContactChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  contactChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedContactChipText: {
    color: '#fff',
  },
  datePicker: {
    marginBottom: 20,
  },
  dateScrollView: {
    maxHeight: 50,
    marginBottom: 8,
  },
  dateChip: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedDateChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dateChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedDateChipText: {
    color: '#fff',
  },
  selectedDateText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  noContactsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  noContactsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  phoneText: {
    fontSize: 11,
    color: '#999',
  },
});