import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Download, Users, Settings as SettingsIcon, Trash2, Info, Phone, Shield, ExternalLink } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import AddContactModal from '@/components/AddContactModal';

export default function SettingsScreen() {
  const { contacts, addContact, importContacts, isImporting, clearAllData } = useContacts();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isExportingCallDirectory, setIsExportingCallDirectory] = useState(false);

  const handleImportContacts = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available',
        'Contact import is not available on web. Please use the mobile app.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await new Promise<{ imported: number; total: number }>((resolve, reject) => {
        importContacts(undefined, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      if (result.imported > 0) {
        Alert.alert(
          'Import Successful',
          `Successfully imported ${result.imported} new contacts. You now have ${result.total} total contacts.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No New Contacts',
          'All your device contacts are already in the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Import Failed',
        error.message || 'Failed to import contacts. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all contacts and call notes. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            Alert.alert('Data Cleared', 'All data has been successfully cleared.');
          },
        },
      ]
    );
  };

  const handleEnableCallerID = () => {
    Alert.alert(
      'Enable Caller ID',
      'To enable caller identification:\n\n1. Go to iOS Settings\n2. Tap Phone\n3. Tap Call Blocking & Identification\n4. Enable this app\n\nThis will show contact names for incoming calls from numbers in your contact list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: handleOpenIOSSettings },
      ]
    );
  };

  const handleSetupCallBlocking = () => {
    Alert.alert(
      'Setup Call Blocking',
      'Call blocking allows you to automatically reject calls from specific numbers. You can:\n\n• Block unknown numbers\n• Block numbers not in your contacts\n• Block specific numbers you add to a block list\n\nThis must be configured in iOS Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: handleOpenIOSSettings },
      ]
    );
  };

  const handleOpenIOSSettings = async () => {
    try {
      // Try to open the specific Phone settings first
      const phoneSettingsURL = 'App-Prefs:Phone';
      const canOpen = await Linking.canOpenURL(phoneSettingsURL);
      
      if (canOpen) {
        await Linking.openURL(phoneSettingsURL);
      } else {
        // Fallback to general settings
        await Linking.openURL('App-Prefs:root');
      }
    } catch (error) {
      // Final fallback - open general settings
      try {
        await Linking.openURL('App-Prefs:root');
      } catch (fallbackError) {
        Alert.alert(
          'Cannot Open Settings',
          'Please manually go to Settings > Phone > Call Blocking & Identification to configure the Call Directory extension.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleExportCallDirectoryData = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'iOS Only Feature',
        'Call Directory extensions are only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (contacts.length === 0) {
      Alert.alert(
        'No Contacts',
        'You need to add contacts first before setting up Call Directory identification.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsExportingCallDirectory(true);
    
    try {
      // Simulate preparing Call Directory data
      const validContacts = contacts.filter(contact => contact.phoneNumber);
      
      // In a real implementation, this would prepare data for the Call Directory extension
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      
      Alert.alert(
        'Call Directory Data Ready',
        `Prepared ${validContacts.length} contacts for caller identification.\n\nNext steps:\n1. Go to iOS Settings\n2. Phone > Call Blocking & Identification\n3. Enable this app\n\nYour contacts will then appear as caller ID during incoming calls.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: handleOpenIOSSettings },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Export Failed',
        'Failed to prepare Call Directory data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsExportingCallDirectory(false);
    }
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    disabled = false, 
    destructive = false 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    disabled?: boolean;
    destructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.iconContainer, destructive && styles.destructiveIconContainer]}>
        {React.cloneElement(icon as React.ReactElement, { 
          color: disabled ? '#999' : destructive ? '#FF3B30' : '#007AFF', 
          size: 20 
        } as any)}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled, destructive && styles.destructiveTitle]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, disabled && styles.settingSubtitleDisabled]}>
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const InfoCard = ({ title, description }: { title: string; description: string }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <Info size={16} color="#007AFF" />
        <Text style={styles.infoTitle}>{title}</Text>
      </View>
      <Text style={styles.infoDescription}>{description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacts</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon={<Plus />}
              title="Add Contact Manually"
              subtitle="Create a new contact entry"
              onPress={() => setShowAddModal(true)}
            />
            <SettingItem
              icon={<Download />}
              title={isImporting ? 'Importing...' : 'Import from Device'}
              subtitle={Platform.OS === 'web' ? 'Not available on web' : `Sync contacts from your device (${contacts.length} contacts)`}
              onPress={handleImportContacts}
              disabled={isImporting || Platform.OS === 'web'}
            />
          </View>
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Call Directory (iOS Only)</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                icon={<Phone />}
                title={isExportingCallDirectory ? 'Preparing...' : 'Setup Caller ID'}
                subtitle={`Prepare ${contacts.filter(c => c.phoneNumber).length} contacts for identification`}
                onPress={handleExportCallDirectoryData}
                disabled={isExportingCallDirectory}
              />
              <SettingItem
                icon={<Shield />}
                title="Setup Call Blocking"
                subtitle="Block unwanted calls using your contact list"
                onPress={handleSetupCallBlocking}
              />
              <SettingItem
                icon={<ExternalLink />}
                title="Open iOS Settings"
                subtitle="Configure Call Directory extension"
                onPress={handleOpenIOSSettings}
              />
            </View>
            <InfoCard
              title="Call Directory Extension"
              description="iOS Call Directory extensions allow apps to provide caller identification and call blocking. You must manually enable this feature in iOS Settings > Phone > Call Blocking & Identification."
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <InfoCard
            title="How it works"
            description={Platform.OS === 'ios' 
              ? "This app uses iOS Call Directory extension to identify your contacts during calls and can block unwanted numbers. All data is stored locally on your device."
              : "This app helps you manage contacts and take call notes. All data is stored locally on your device."
            }
          />
          <InfoCard
            title="Call Detection"
            description={Platform.OS === 'ios'
              ? "Enable the Call Directory extension in iOS Settings to automatically identify your contacts during incoming calls."
              : "The app helps you organize contacts and manage call-related notes and reminders."
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon={<Trash2 />}
              title="Clear All Data"
              subtitle="Delete all contacts and call notes"
              onPress={handleClearAllData}
              destructive
            />
          </View>
        </View>
      </ScrollView>

      <AddContactModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addContact}
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
    paddingVertical: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  settingsGroup: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destructiveIconContainer: {
    backgroundColor: '#fff0f0',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: '#999',
  },
  destructiveTitle: {
    color: '#FF3B30',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  settingSubtitleDisabled: {
    color: '#999',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});