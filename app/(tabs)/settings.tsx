import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking, Modal, TextInput, KeyboardAvoidingView, SafeAreaView, Switch, Share } from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Download, Users, Settings as SettingsIcon, Trash2, Info, Edit3, X, Save, Check, ChevronRight, Tag, Crown, FileText, Archive, Star } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import AddContactModal from '@/components/AddContactModal';

interface TemplateSection {
  id: string;
  label: string;
  enabled: boolean;
  custom?: boolean;
}

export default function SettingsScreen() {
  const { contacts, notes, orders, reminders, addContact, importContacts, isImporting, clearAllData, noteTemplate, updateNoteTemplate, addFakeContacts, isAddingFakeContacts, presetTags, updatePresetTags, noteSettings, updateNoteSettings } = useContacts();
  const [showAddModal, setShowAddModal] = useState(false);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [editableTags, setEditableTags] = useState<string[]>([]);
  const [newTagText, setNewTagText] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Parse existing template or use default sections
  const parseTemplateToSections = (template: string): TemplateSection[] => {
    const defaultSections: TemplateSection[] = [
      { id: 'purpose', label: 'Purpose of call', enabled: true },
      { id: 'keypoints', label: 'Key points discussed', enabled: true },
      { id: 'action', label: 'Action items', enabled: true },
      { id: 'nextsteps', label: 'Next steps', enabled: true },
      { id: 'additional', label: 'Additional notes', enabled: true },
    ];
    
    // Check which sections exist in the current template
    defaultSections.forEach(section => {
      section.enabled = template.toLowerCase().includes(section.label.toLowerCase());
    });
    
    return defaultSections;
  };
  
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>(() => 
    parseTemplateToSections(noteTemplate)
  );
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [newPromptText, setNewPromptText] = useState('');
  const [showAddPrompt, setShowAddPrompt] = useState(false);

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

  const handleAddFakeContacts = async () => {
    try {
      const result = await new Promise<{ added: number; total: number }>((resolve, reject) => {
        addFakeContacts(undefined, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      if (result.added > 0) {
        Alert.alert(
          'Fake Contacts Added',
          `Successfully added ${result.added} fake contacts for testing. You now have ${result.total} total contacts.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No New Contacts',
          'All fake contacts are already in the app.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Failed to Add Contacts',
        error.message || 'Failed to add fake contacts. Please try again.',
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

  const handleEditTemplate = () => {
    setTemplateSections(parseTemplateToSections(noteTemplate));
    setShowTemplateModal(true);
  };

  const handleEditTags = () => {
    setEditableTags([...presetTags]);
    setShowTagsModal(true);
  };

  const handleSaveTemplate = () => {
    // Build template from enabled sections
    let template = 'Call with [CONTACT_NAME] - [DATE]\n\n';
    
    templateSections.forEach(section => {
      if (section.enabled) {
        template += `${section.label}:\n\n`;
      }
    });
    
    // Add custom prompts
    customPrompts.forEach(prompt => {
      template += `${prompt}:\n\n`;
    });
    
    updateNoteTemplate(template.trim());
    setShowTemplateModal(false);
    Alert.alert('Template Updated', 'Your call note template has been updated successfully.');
  };

  const handleCloseTemplate = () => {
    setShowTemplateModal(false);
    setTemplateSections(parseTemplateToSections(noteTemplate));
    setCustomPrompts([]);
    setNewPromptText('');
    setShowAddPrompt(false);
  };
  
  const toggleSection = (id: string) => {
    setTemplateSections(prev => 
      prev.map(section => 
        section.id === id ? { ...section, enabled: !section.enabled } : section
      )
    );
  };
  
  const addCustomPrompt = () => {
    if (newPromptText.trim()) {
      setCustomPrompts(prev => [...prev, newPromptText.trim()]);
      setNewPromptText('');
      setShowAddPrompt(false);
    }
  };
  
  const removeCustomPrompt = (index: number) => {
    setCustomPrompts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveTags = () => {
    updatePresetTags(editableTags);
    setShowTagsModal(false);
    Alert.alert('Tags Updated', 'Your preset tags have been updated successfully.');
  };

  const handleCloseTags = () => {
    setShowTagsModal(false);
    setEditableTags([...presetTags]);
    setNewTagText('');
    setShowAddTag(false);
  };

  const addTag = () => {
    if (newTagText.trim() && !editableTags.includes(newTagText.trim())) {
      setEditableTags(prev => [...prev, newTagText.trim()]);
      setNewTagText('');
      setShowAddTag(false);
    }
  };

  const removeTag = (index: number) => {
    setEditableTags(prev => prev.filter((_, i) => i !== index));
  };

  const handleExportLogs = async () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    setIsExporting(true);
    try {
      const exportData = {
        contacts,
        notes,
        orders,
        reminders,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `call-notes-export-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // Web export
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Export Complete', 'Your data has been downloaded successfully.');
      } else {
        // Mobile share
        await Share.share({
          message: jsonString,
          title: 'Call Notes Export'
        });
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveLogs = async () => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    try {
      // In a real app, this would save to cloud storage
      // For now, we'll just show a success message
      Alert.alert(
        'Logs Saved',
        'Your call logs have been saved to secure cloud storage. You can access them anytime from any device.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Save Failed', 'Failed to save logs. Please try again.');
    }
  };

  const handleUpgradeToPremium = () => {
    Alert.alert(
      'Upgrade to Premium',
      'Premium features include:\n\n• Cloud backup and sync\n• Export all data\n• Password protected notes\n• Advanced analytics\n• Priority support\n• Unlimited storage',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: () => {
            // In a real app, this would open the payment flow
            setIsPremium(true);
            setShowPremiumModal(false);
            Alert.alert('Welcome to Premium!', 'You now have access to all premium features.');
          }
        }
      ]
    );
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
    <SafeAreaView style={styles.container}>
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
            <SettingItem
              icon={<Users />}
              title={isAddingFakeContacts ? 'Adding...' : 'Add Fake Contacts'}
              subtitle="Add sample contacts for testing the app"
              onPress={handleAddFakeContacts}
              disabled={isAddingFakeContacts}
            />
          </View>
        </View>



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <InfoCard
            title="How it works"
            description="This app helps you manage contacts and take call notes. All data is stored locally on your device."
          />
          <InfoCard
            title="Contact Management"
            description="The app helps you organize contacts and manage call-related notes and reminders."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call Notes</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon={<Edit3 />}
              title="Edit Note Template"
              subtitle="Customize the default structure for call notes"
              onPress={handleEditTemplate}
            />
            <SettingItem
              icon={<Tag />}
              title="Manage Tags"
              subtitle={`Customize preset tags for call notes (${presetTags.length} tags)`}
              onPress={handleEditTags}
            />
          </View>
          
          <View style={[styles.settingsGroup, { marginTop: 12 }]}>
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleTitle}>Show Call Duration</Text>
                <Text style={styles.toggleSubtitle}>Display duration in call notes</Text>
              </View>
              <Switch
                value={noteSettings?.showDuration ?? true}
                onValueChange={(value) => updateNoteSettings({ showDuration: value })}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={Platform.OS === 'android' ? '#f4f3f4' : undefined}
              />
            </View>
            
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleTitle}>Show Call Direction</Text>
                <Text style={styles.toggleSubtitle}>Display incoming/outgoing status</Text>
              </View>
              <Switch
                value={noteSettings?.showDirection ?? true}
                onValueChange={(value) => updateNoteSettings({ showDirection: value })}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={Platform.OS === 'android' ? '#f4f3f4' : undefined}
              />
            </View>
            

          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.premiumSectionHeader}>
            <Crown size={20} color="#FFD700" />
            <Text style={styles.sectionTitle}>Premium Features</Text>
            {!isPremium && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => setShowPremiumModal(true)}
              >
                <Star size={16} color="#FFD700" />
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.settingsGroup, !isPremium && styles.settingsGroupDisabled]}>
            <SettingItem
              icon={<Archive />}
              title={isExporting ? 'Exporting...' : 'Export All Data'}
              subtitle={`Export contacts, notes, orders & reminders (${contacts.length + notes.length + orders.length + reminders.length} items)`}
              onPress={handleExportLogs}
              disabled={isExporting}
            />
            <SettingItem
              icon={<FileText />}
              title="Save Logs to Cloud"
              subtitle="Backup your data to secure cloud storage"
              onPress={handleSaveLogs}
            />
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleTitle}>Password Protected Notes</Text>
                <Text style={styles.toggleSubtitle}>Require password to view notes</Text>
              </View>
              <Switch
                value={noteSettings?.passwordProtected ?? false}
                onValueChange={(value) => {
                  if (!isPremium) {
                    setShowPremiumModal(true);
                    return;
                  }
                  if (value) {
                    setShowPasswordModal(true);
                  } else {
                    Alert.alert(
                      'Remove Password Protection',
                      'Are you sure you want to remove password protection from your notes?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            updateNoteSettings({ passwordProtected: false, password: undefined });
                          },
                        },
                      ]
                    );
                  }
                }}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={Platform.OS === 'android' ? '#f4f3f4' : undefined}
                disabled={!isPremium}
              />
            </View>
          </View>
          {!isPremium && (
            <View style={styles.premiumOverlay}>
              <Crown size={24} color="#FFD700" />
              <Text style={styles.premiumOverlayText}>Premium Feature</Text>
              <Text style={styles.premiumOverlaySubtext}>Upgrade to access cloud backup, export, and password protection</Text>
            </View>
          )}
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

      <Modal
        visible={showTemplateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.templateModalContainer}>
          <View style={styles.templateHeader}>
            <TouchableOpacity onPress={handleCloseTemplate}>
              <X size={24} color="#007AFF" />
            </TouchableOpacity>
            
            <Text style={styles.templateTitle}>Template Settings</Text>
            
            <TouchableOpacity onPress={handleSaveTemplate}>
              <Save size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.templateContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.templateSectionTitle}>Default Sections</Text>
            <Text style={styles.templateDescription}>
              Select which sections to include in your call notes
            </Text>
            
            <View style={styles.templateSections}>
              {templateSections.map(section => (
                <TouchableOpacity
                  key={section.id}
                  style={styles.templateSectionItem}
                  onPress={() => toggleSection(section.id)}
                >
                  <View style={styles.templateSectionLeft}>
                    <View style={[styles.checkbox, section.enabled && styles.checkboxChecked]}>
                      {section.enabled && <Check size={16} color="#fff" />}
                    </View>
                    <Text style={styles.templateSectionLabel}>{section.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.customPromptsSection}>
              <Text style={styles.templateSectionTitle}>Custom Prompts</Text>
              <Text style={styles.templateDescription}>
                Add your own custom prompts to the template
              </Text>
              
              {customPrompts.map((prompt, index) => (
                <View key={index} style={styles.customPromptItem}>
                  <Text style={styles.customPromptText}>{prompt}</Text>
                  <TouchableOpacity onPress={() => removeCustomPrompt(index)}>
                    <X size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {showAddPrompt ? (
                <View style={styles.addPromptContainer}>
                  <TextInput
                    style={styles.addPromptInput}
                    placeholder="Enter custom prompt..."
                    placeholderTextColor="#999"
                    value={newPromptText}
                    onChangeText={setNewPromptText}
                    autoFocus
                    onSubmitEditing={addCustomPrompt}
                  />
                  <View style={styles.addPromptButtons}>
                    <TouchableOpacity 
                      style={styles.addPromptButton} 
                      onPress={() => {
                        setShowAddPrompt(false);
                        setNewPromptText('');
                      }}
                    >
                      <Text style={styles.addPromptButtonCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.addPromptButton, styles.addPromptButtonPrimary]} 
                      onPress={addCustomPrompt}
                    >
                      <Text style={styles.addPromptButtonAdd}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addCustomPromptButton}
                  onPress={() => setShowAddPrompt(true)}
                >
                  <Plus size={20} color="#007AFF" />
                  <Text style={styles.addCustomPromptText}>Add Custom Prompt</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.templatePreviewSection}>
              <Text style={styles.templateSectionTitle}>Preview</Text>
              <View style={styles.templatePreview}>
                <Text style={styles.templatePreviewText}>Call with [CONTACT_NAME] - [DATE]</Text>
                <Text style={styles.templatePreviewText}>\n</Text>
                {templateSections.filter(s => s.enabled).map(section => (
                  <Text key={section.id} style={styles.templatePreviewText}>
                    {section.label}:\n\n
                  </Text>
                ))}
                {customPrompts.map((prompt, index) => (
                  <Text key={`custom-${index}`} style={styles.templatePreviewText}>
                    {prompt}:\n\n
                  </Text>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.templateFooter}>
            <TouchableOpacity style={styles.templateSaveButton} onPress={handleSaveTemplate}>
              <Text style={styles.templateSaveButtonText}>Save Template</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showTagsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.templateModalContainer}>
          <View style={styles.templateHeader}>
            <TouchableOpacity onPress={handleCloseTags}>
              <X size={24} color="#007AFF" />
            </TouchableOpacity>
            
            <Text style={styles.templateTitle}>Manage Tags</Text>
            
            <TouchableOpacity onPress={handleSaveTags}>
              <Save size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.templateContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.templateSectionTitle}>Preset Tags</Text>
            <Text style={styles.templateDescription}>
              These tags will be available as quick options when adding call notes
            </Text>
            
            <View style={styles.tagsGrid}>
              {editableTags.map((tag, index) => (
                <View key={index} style={styles.editableTag}>
                  <Text style={styles.editableTagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(index)} style={styles.editableTagRemove}>
                    <X size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {showAddTag ? (
                <View style={styles.addTagInputContainer}>
                  <TextInput
                    style={styles.addTagInput}
                    placeholder="Enter tag name..."
                    placeholderTextColor="#999"
                    value={newTagText}
                    onChangeText={setNewTagText}
                    onSubmitEditing={addTag}
                    onBlur={() => {
                      if (newTagText.trim()) {
                        addTag();
                      } else {
                        setShowAddTag(false);
                      }
                    }}
                    autoFocus
                  />
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.addTagButton}
                  onPress={() => setShowAddTag(true)}
                >
                  <Plus size={16} color="#007AFF" />
                  <Text style={styles.addTagButtonText}>Add Tag</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.tagPreviewSection}>
              <Text style={styles.templateSectionTitle}>Preview</Text>
              <Text style={styles.templateDescription}>
                These tags will appear as quick selection options in call notes
              </Text>
              <View style={styles.tagPreview}>
                {editableTags.map((tag, index) => (
                  <View key={index} style={styles.previewTag}>
                    <Text style={styles.previewTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.templateFooter}>
            <TouchableOpacity style={styles.templateSaveButton} onPress={handleSaveTags}>
              <Text style={styles.templateSaveButtonText}>Save Tags</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.templateModalContainer}>
          <View style={styles.templateHeader}>
            <TouchableOpacity onPress={() => {
              setShowPasswordModal(false);
              setPassword('');
              setConfirmPassword('');
            }}>
              <X size={24} color="#007AFF" />
            </TouchableOpacity>
            
            <Text style={styles.templateTitle}>Set Password</Text>
            
            <View style={{ width: 24 }} />
          </View>

          <KeyboardAvoidingView 
            style={styles.passwordContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Text style={styles.passwordDescription}>
              Set a password to protect your call notes. You'll need to enter this password to view notes.
            </Text>
            
            <View style={styles.passwordInputContainer}>
              <Text style={styles.passwordLabel}>Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.passwordInputContainer}>
              <Text style={styles.passwordLabel}>Confirm Password</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            {password && confirmPassword && password !== confirmPassword && (
              <Text style={styles.passwordError}>Passwords do not match</Text>
            )}
            
            <TouchableOpacity
              style={[
                styles.passwordSaveButton,
                (!password || !confirmPassword || password !== confirmPassword) && styles.passwordSaveButtonDisabled
              ]}
              onPress={() => {
                if (password && confirmPassword && password === confirmPassword) {
                  updateNoteSettings({ passwordProtected: true, password });
                  setShowPasswordModal(false);
                  setPassword('');
                  setConfirmPassword('');
                  Alert.alert('Password Set', 'Your notes are now password protected.');
                }
              }}
              disabled={!password || !confirmPassword || password !== confirmPassword}
            >
              <Text style={[
                styles.passwordSaveButtonText,
                (!password || !confirmPassword || password !== confirmPassword) && styles.passwordSaveButtonTextDisabled
              ]}>
                Set Password
              </Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showPremiumModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.premiumModalContainer}>
          <View style={styles.premiumModalHeader}>
            <TouchableOpacity onPress={() => setShowPremiumModal(false)}>
              <X size={24} color="#007AFF" />
            </TouchableOpacity>
            
            <View style={styles.premiumTitleContainer}>
              <Crown size={24} color="#FFD700" />
              <Text style={styles.premiumModalTitle}>Premium Features</Text>
            </View>
            
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.premiumModalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.premiumHero}>
              <Crown size={48} color="#FFD700" />
              <Text style={styles.premiumHeroTitle}>Unlock Premium</Text>
              <Text style={styles.premiumHeroSubtitle}>Get access to advanced features and cloud storage</Text>
            </View>

            <View style={styles.premiumFeatures}>
              <View style={styles.premiumFeature}>
                <Archive size={24} color="#007AFF" />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>Export All Data</Text>
                  <Text style={styles.premiumFeatureDescription}>Export contacts, notes, orders, and reminders in JSON format</Text>
                </View>
              </View>
              
              <View style={styles.premiumFeature}>
                <FileText size={24} color="#007AFF" />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>Cloud Backup</Text>
                  <Text style={styles.premiumFeatureDescription}>Automatically save your logs to secure cloud storage</Text>
                </View>
              </View>
              
              <View style={styles.premiumFeature}>
                <Users size={24} color="#007AFF" />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>Unlimited Storage</Text>
                  <Text style={styles.premiumFeatureDescription}>Store unlimited contacts, notes, and call history</Text>
                </View>
              </View>
              
              <View style={styles.premiumFeature}>
                <SettingsIcon size={24} color="#007AFF" />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>Password Protection</Text>
                  <Text style={styles.premiumFeatureDescription}>Secure your call notes with password protection</Text>
                </View>
              </View>
              
              <View style={styles.premiumFeature}>
                <Star size={24} color="#007AFF" />
                <View style={styles.premiumFeatureContent}>
                  <Text style={styles.premiumFeatureTitle}>Priority Support</Text>
                  <Text style={styles.premiumFeatureDescription}>Get priority customer support and feature requests</Text>
                </View>
              </View>
            </View>

            <View style={styles.premiumStats}>
              <Text style={styles.premiumStatsTitle}>Your Current Usage</Text>
              <View style={styles.premiumStatsGrid}>
                <View style={styles.premiumStat}>
                  <Text style={styles.premiumStatNumber}>{contacts.length}</Text>
                  <Text style={styles.premiumStatLabel}>Contacts</Text>
                </View>
                <View style={styles.premiumStat}>
                  <Text style={styles.premiumStatNumber}>{notes.length}</Text>
                  <Text style={styles.premiumStatLabel}>Notes</Text>
                </View>
                <View style={styles.premiumStat}>
                  <Text style={styles.premiumStatNumber}>{orders.length}</Text>
                  <Text style={styles.premiumStatLabel}>Orders</Text>
                </View>
                <View style={styles.premiumStat}>
                  <Text style={styles.premiumStatNumber}>{reminders.length}</Text>
                  <Text style={styles.premiumStatLabel}>Reminders</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.premiumModalFooter}>
            <TouchableOpacity style={styles.premiumUpgradeButton} onPress={handleUpgradeToPremium}>
              <Crown size={20} color="#fff" />
              <Text style={styles.premiumUpgradeButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.premiumCancelButton} 
              onPress={() => setShowPremiumModal(false)}
            >
              <Text style={styles.premiumCancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
    paddingVertical: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
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
  templateModalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  templateContent: {
    flex: 1,
  },
  templateSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    marginHorizontal: 20,
    lineHeight: 20,
  },
  templateSections: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  templateSectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  templateSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  templateSectionLabel: {
    fontSize: 16,
    color: '#000',
  },
  customPromptsSection: {
    marginTop: 8,
  },
  customPromptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
  },
  customPromptText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  addCustomPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed' as const,
  },
  addCustomPromptText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
  addPromptContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  addPromptInput: {
    fontSize: 16,
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  addPromptButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  addPromptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPromptButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  addPromptButtonCancel: {
    fontSize: 15,
    color: '#666',
  },
  addPromptButtonAdd: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  templatePreviewSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  templatePreview: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  templatePreviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  templateFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  templateSaveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  templateSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  editableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  editableTagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  editableTagRemove: {
    padding: 2,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addTagButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addTagInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  addTagInput: {
    fontSize: 14,
    color: '#333',
    minWidth: 80,
    paddingVertical: 4,
  },
  tagPreviewSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  tagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  previewTag: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewTagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleLeft: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  passwordContent: {
    flex: 1,
    padding: 20,
  },
  passwordDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 32,
  },
  passwordInputContainer: {
    marginBottom: 20,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  passwordError: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: -12,
    marginBottom: 20,
  },
  passwordSaveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  passwordSaveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  passwordSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  passwordSaveButtonTextDisabled: {
    color: '#999',
  },
  premiumSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
    gap: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 'auto',
    gap: 4,
  },
  upgradeButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsGroupDisabled: {
    opacity: 0.6,
  },
  premiumOverlay: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  premiumOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  premiumOverlaySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  premiumModalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  premiumModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  premiumTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  premiumModalContent: {
    flex: 1,
  },
  premiumHero: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    gap: 12,
  },
  premiumHeroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  premiumHeroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumFeatures: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  premiumFeatureContent: {
    flex: 1,
  },
  premiumFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  premiumFeatureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  premiumStats: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  premiumStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  premiumStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  premiumStat: {
    alignItems: 'center',
    gap: 4,
  },
  premiumStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  premiumStatLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  premiumModalFooter: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    gap: 12,
  },
  premiumUpgradeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  premiumUpgradeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumCancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  premiumCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});