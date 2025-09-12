import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { ShoppingBag, FileText, Plus, Download, Package, DollarSign, User, Calendar, Clock, CheckCircle, X, Minus, Search, ChevronDown, Edit3, Trash2, Upload } from 'lucide-react-native';
import { useContacts } from '@/hooks/contacts-store';
import { OrderItem, Order, Product } from '@/types/contact';
import ProductCatalogModal from '@/components/ProductCatalogModal';

export default function StoreScreen() {
  const { contacts, orders, addOrder, updateOrder, deleteOrder, productCatalogs, deleteProductCatalog } = useContacts();
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemDescription, setNewItemDescription] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState<string>('1');
  const [contactSearch, setContactSearch] = useState<string>('');
  const [showContactDropdown, setShowContactDropdown] = useState<boolean>(false);
  const [showProductCatalogModal, setShowProductCatalogModal] = useState<boolean>(false);
  const [editingCatalog, setEditingCatalog] = useState<any>(null);
  const [selectingProductsForOrder, setSelectingProductsForOrder] = useState<boolean>(false);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const completedOrders = orders.filter(order => order.status === 'delivered').length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  const resetOrderForm = () => {
    setSelectedContactId('');
    setOrderItems([]);
    setOrderNotes('');
    setNewItemName('');
    setNewItemDescription('');
    setNewItemPrice('');
    setNewItemQuantity('1');
    setContactSearch('');
    setShowContactDropdown(false);
    setEditingOrder(null);
  };

  const addItemToOrder = () => {
    if (!newItemName.trim() || !newItemPrice.trim()) {
      Alert.alert('Error', 'Please enter item name and price');
      return;
    }

    const price = parseFloat(newItemPrice);
    const quantity = parseInt(newItemQuantity) || 1;

    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      description: newItemDescription.trim() || undefined,
      price,
      quantity,
    };

    setOrderItems([...orderItems, newItem]);
    setNewItemName('');
    setNewItemDescription('');
    setNewItemPrice('');
    setNewItemQuantity('1');
  };

  const removeItemFromOrder = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(itemId);
      return;
    }
    setOrderItems(orderItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.phoneNumber.toLowerCase().includes(contactSearch.toLowerCase())
    );
  }, [contacts, contactSearch]);

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setSelectedContactId(order.contactId);
    setOrderItems([...order.items]);
    setOrderNotes(order.notes || '');
    const contact = contacts.find(c => c.id === order.contactId);
    if (contact) {
      setContactSearch(contact.name);
    }
    setShowOrderModal(true);
  };

  const selectContact = (contact: any) => {
    setSelectedContactId(contact.id);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  const handleProductsSelected = (products: Product[]) => {
    // Add selected products to order items
    const newItems: OrderItem[] = products.map(product => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: 1,
    }));
    setOrderItems(prev => [...prev, ...newItems]);
    setSelectingProductsForOrder(false);
  };

  const createOrder = () => {
    if (!selectedContactId) {
      Alert.alert('Error', 'Please select a contact');
      return;
    }

    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    const selectedContact = contacts.find(c => c.id === selectedContactId);
    if (!selectedContact) {
      Alert.alert('Error', 'Selected contact not found');
      return;
    }

    const totalAmount = calculateTotal();

    if (editingOrder) {
      // Update existing order
      updateOrder({
        id: editingOrder.id,
        updates: {
          contactId: selectedContactId,
          contactName: selectedContact.name,
          items: orderItems,
          totalAmount,
          notes: orderNotes.trim() || undefined,
        }
      });
      Alert.alert('Success', 'Order updated successfully!');
    } else {
      // Create new order
      addOrder({
        contactId: selectedContactId,
        contactName: selectedContact.name,
        items: orderItems,
        totalAmount,
        status: 'pending',
        notes: orderNotes.trim() || undefined,
      });
      Alert.alert('Success', 'Order created successfully!');
    }

    setShowOrderModal(false);
    resetOrderForm();
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    updateOrder({ id: orderId, updates: { status: newStatus } });
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'confirmed': return '#007AFF';
      case 'shipped': return '#5856D6';
      case 'delivered': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return 'Unknown';
    }
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
        {React.cloneElement(icon as React.ReactElement, { color: color, size: 24 } as any)}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Store' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<ShoppingBag />}
              title="Total Orders"
              value={totalOrders}
              color="#007AFF"
            />
            <StatCard
              icon={<Clock />}
              title="Pending"
              value={pendingOrders}
              color="#FF9500"
            />
          </View>
          
          <View style={styles.statsGrid}>
            <StatCard
              icon={<CheckCircle />}
              title="Completed"
              value={completedOrders}
              color="#34C759"
            />
            <StatCard
              icon={<DollarSign />}
              title="Revenue"
              value={`$${totalRevenue.toFixed(2)}`}
              color="#5856D6"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Catalogs</Text>
          <View style={styles.catalogContainer}>
            <View style={styles.catalogHeader}>
              <View style={styles.catalogTitleContainer}>
                <FileText size={24} color="#FF6B35" />
                <Text style={styles.catalogTitle}>Product Lists</Text>
              </View>
              <TouchableOpacity 
                style={styles.addCatalogButton}
                onPress={() => {
                  setEditingCatalog(null);
                  setSelectingProductsForOrder(false);
                  setShowProductCatalogModal(true);
                }}
              >
                <Upload size={16} color="#fff" />
                <Text style={styles.addCatalogButtonText}>Upload PDF</Text>
              </TouchableOpacity>
            </View>
            
            {productCatalogs.length === 0 ? (
              <View style={styles.emptyCatalogs}>
                <Package size={48} color="#ccc" />
                <Text style={styles.emptyCatalogsTitle}>No Product Catalogs</Text>
                <Text style={styles.emptyCatalogsText}>
                  Upload a PDF with your product list or create one manually
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.catalogGrid}>
                  {productCatalogs.map((catalog) => (
                    <View key={catalog.id} style={styles.catalogCard}>
                      <View style={styles.catalogIconContainer}>
                        <FileText size={32} color="#FF6B35" />
                      </View>
                      <Text style={styles.catalogCardTitle}>{catalog.name}</Text>
                      <Text style={styles.catalogSubtitle}>
                        {catalog.products.length} products
                      </Text>
                      <View style={styles.catalogActions}>
                        <TouchableOpacity 
                          style={styles.catalogActionButton}
                          onPress={() => {
                            setEditingCatalog(catalog);
                            setSelectingProductsForOrder(false);
                            setShowProductCatalogModal(true);
                          }}
                        >
                          <Edit3 size={14} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.catalogActionButton}
                          onPress={() => {
                            Alert.alert(
                              'Delete Catalog',
                              'Are you sure you want to delete this catalog?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                  text: 'Delete', 
                                  style: 'destructive',
                                  onPress: () => deleteProductCatalog(catalog.id)
                                }
                              ]
                            );
                          }}
                        >
                          <Trash2 size={14} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
                
                <View style={styles.catalogInfo}>
                  <Text style={styles.catalogInfoText}>
                    Your product catalogs are saved and can be used when creating orders. Upload PDFs to automatically extract products and prices.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.ordersHeader}>
            <Text style={styles.sectionTitle}>Orders</Text>
            <TouchableOpacity 
              style={styles.createOrderButton}
              onPress={() => {
                if (contacts.length === 0) {
                  Alert.alert('No Contacts', 'Add some contacts first to create orders.');
                  return;
                }
                setShowOrderModal(true);
              }}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.createOrderButtonText}>New Order</Text>
            </TouchableOpacity>
          </View>
          
          {orders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Package size={48} color="#ccc" />
              <Text style={styles.emptyOrdersTitle}>No Orders Yet</Text>
              <Text style={styles.emptyOrdersText}>
                Create your first order by tapping the "New Order" button above
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {orders
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderTitle}>Order #{order.id.slice(-6)}</Text>
                        <View style={styles.orderMeta}>
                          <User size={12} color="#8E8E93" />
                          <Text style={styles.orderMetaText}>{order.contactName}</Text>
                        </View>
                      </View>
                      <View style={styles.orderStatus}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '15' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                            {getStatusText(order.status)}
                          </Text>
                        </View>
                        <Text style={styles.orderAmount}>${order.totalAmount.toFixed(2)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.orderItems}>
                      {order.items.map((item, index) => (
                        <Text key={index} style={styles.orderItem}>
                          {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      ))}
                    </View>
                    
                    {order.notes && (
                      <Text style={styles.orderNotes}>{order.notes}</Text>
                    )}
                    
                    <View style={styles.orderFooter}>
                      <View style={styles.orderDate}>
                        <Calendar size={12} color="#8E8E93" />
                        <Text style={styles.orderDateText}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      <View style={styles.orderActions}>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
                          onPress={() => handleEditOrder(order)}
                        >
                          <Edit3 size={14} color="#fff" />
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </TouchableOpacity>
                        
                        {order.status === 'pending' && (
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                            onPress={() => updateOrderStatus(order.id, 'confirmed')}
                          >
                            <Text style={styles.actionButtonText}>Confirm</Text>
                          </TouchableOpacity>
                        )}
                        {order.status === 'confirmed' && (
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#5856D6' }]}
                            onPress={() => updateOrderStatus(order.id, 'shipped')}
                          >
                            <Text style={styles.actionButtonText}>Ship</Text>
                          </TouchableOpacity>
                        )}
                        {order.status === 'shipped' && (
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#34C759' }]}
                            onPress={() => updateOrderStatus(order.id, 'delivered')}
                          >
                            <Text style={styles.actionButtonText}>Deliver</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                          onPress={() => {
                            Alert.alert(
                              'Delete Order',
                              'Are you sure you want to delete this order?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteOrder(order.id) }
                              ]
                            );
                          }}
                        >
                          <Trash2 size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingOrder ? 'Edit Order' : 'Create New Order'}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowOrderModal(false);
                resetOrderForm();
              }}
            >
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent} 
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Select Contact</Text>
              <View style={styles.contactSearchContainer}>
                <TouchableOpacity 
                  style={styles.contactSearchInput}
                  onPress={() => setShowContactDropdown(!showContactDropdown)}
                >
                  <View style={styles.searchInputContent}>
                    <Search size={16} color="#666" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search contacts..."
                      value={contactSearch}
                      onChangeText={(text) => {
                        setContactSearch(text);
                        setShowContactDropdown(true);
                        if (!text.trim()) {
                          setSelectedContactId('');
                        }
                      }}
                      onFocus={() => setShowContactDropdown(true)}
                    />
                    <ChevronDown size={16} color="#666" />
                  </View>
                </TouchableOpacity>
                
                {showContactDropdown && (
                  <View style={styles.contactDropdown}>
                    <ScrollView style={styles.contactDropdownScroll} nestedScrollEnabled>
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact) => (
                          <TouchableOpacity
                            key={contact.id}
                            style={[
                              styles.contactDropdownItem,
                              selectedContactId === contact.id && styles.selectedContactDropdownItem
                            ]}
                            onPress={() => selectContact(contact)}
                          >
                            <View style={styles.contactDropdownItemContent}>
                              <Text style={[
                                styles.contactDropdownItemName,
                                selectedContactId === contact.id && styles.selectedContactDropdownItemText
                              ]}>
                                {contact.name}
                              </Text>
                              <Text style={[
                                styles.contactDropdownItemPhone,
                                selectedContactId === contact.id && styles.selectedContactDropdownItemText
                              ]}>
                                {contact.phoneNumber}
                              </Text>
                            </View>
                            {selectedContactId === contact.id && (
                              <CheckCircle size={16} color="#007AFF" />
                            )}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <View style={styles.noContactsFound}>
                          <Text style={styles.noContactsText}>No contacts found</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {selectedContact && (
                <View style={styles.selectedContactDisplay}>
                  <Text style={styles.selectedContactLabel}>Order for:</Text>
                  <View style={styles.selectedContactInfo}>
                    <User size={16} color="#007AFF" />
                    <Text style={styles.selectedContactName}>{selectedContact.name}</Text>
                    <Text style={styles.selectedContactPhone}>{selectedContact.phoneNumber}</Text>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.formSection}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>Add Items</Text>
                {productCatalogs.length > 0 && (
                  <TouchableOpacity
                    style={styles.fromCatalogButton}
                    onPress={() => {
                      setSelectingProductsForOrder(true);
                      setShowProductCatalogModal(true);
                    }}
                  >
                    <FileText size={14} color="#007AFF" />
                    <Text style={styles.fromCatalogButtonText}>From Catalog</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.addItemForm}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Item name"
                  value={newItemName}
                  onChangeText={setNewItemName}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Description (optional)"
                  value={newItemDescription}
                  onChangeText={setNewItemDescription}
                  multiline
                />
                <View style={styles.priceQuantityRow}>
                  <TextInput
                    style={[styles.textInput, styles.priceInput]}
                    placeholder="Price"
                    value={newItemPrice}
                    onChangeText={setNewItemPrice}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.textInput, styles.quantityInput]}
                    placeholder="Qty"
                    value={newItemQuantity}
                    onChangeText={setNewItemQuantity}
                    keyboardType="number-pad"
                  />
                </View>
                <TouchableOpacity style={styles.addItemButton} onPress={addItemToOrder}>
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addItemButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>
              
              {orderItems.length > 0 && (
                <View style={styles.orderItemsList}>
                  <Text style={styles.orderItemsTitle}>Order Items:</Text>
                  {orderItems.map((item) => (
                    <View key={item.id} style={styles.orderItemRow}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.orderItemDescription}>{item.description}</Text>
                        )}
                        <Text style={styles.orderItemPrice}>
                          ${item.price.toFixed(2)} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.orderItemActions}>
                        <TouchableOpacity 
                          style={styles.quantityButton}
                          onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus size={16} color="#007AFF" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity 
                          style={styles.quantityButton}
                          onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus size={16} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeItemButton}
                          onPress={() => removeItemFromOrder(item.id)}
                        >
                          <X size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  
                  <View style={styles.orderTotal}>
                    <Text style={styles.orderTotalText}>Total: ${calculateTotal().toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </View>
            
            <View style={[styles.formSection, { marginBottom: 8 }]}>
              <Text style={styles.formLabel}>Order Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Add any special instructions or notes..."
                value={orderNotes}
                onChangeText={setOrderNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                scrollEnabled={true}
              />
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setShowOrderModal(false);
                resetOrderForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={createOrder}
            >
              <Text style={styles.createButtonText}>{editingOrder ? 'Update Order' : 'Create Order'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ProductCatalogModal
        visible={showProductCatalogModal}
        onClose={() => {
          setShowProductCatalogModal(false);
          setEditingCatalog(null);
          setSelectingProductsForOrder(false);
        }}
        editingCatalog={editingCatalog}
        onSelectProducts={selectingProductsForOrder ? handleProductsSelected : undefined}
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
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  catalogContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  catalogTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catalogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addCatalogButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addCatalogButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  catalogGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  catalogCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  catalogIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#FF6B35' + '15',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  catalogCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  catalogSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF6B35',
    gap: 4,
  },
  downloadButtonText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '500',
  },
  catalogInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  catalogInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  emptyCatalogs: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCatalogsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyCatalogsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  catalogActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  catalogActionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fromCatalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF15',
  },
  fromCatalogButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  createOrderButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createOrderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
  },
  emptyOrdersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyOrdersText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  ordersList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderMetaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  orderStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  orderNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDateText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
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
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  contactSearchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  contactSearchInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  searchInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  contactDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1001,
  },
  contactDropdownScroll: {
    maxHeight: 200,
  },
  contactDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedContactDropdownItem: {
    backgroundColor: '#f0f8ff',
  },
  contactDropdownItemContent: {
    flex: 1,
  },
  contactDropdownItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  contactDropdownItemPhone: {
    fontSize: 14,
    color: '#666',
  },
  selectedContactDropdownItemText: {
    color: '#007AFF',
  },
  noContactsFound: {
    padding: 20,
    alignItems: 'center',
  },
  noContactsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  selectedContactDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF' + '30',
  },
  selectedContactLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  selectedContactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedContactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectedContactPhone: {
    fontSize: 14,
    color: '#666',
    marginLeft: 'auto',
  },
  addItemForm: {
    gap: 12,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  priceQuantityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 2,
  },
  quantityInput: {
    flex: 1,
  },
  addItemButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  orderItemsList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  orderItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  orderItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  orderItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    minWidth: 20,
    textAlign: 'center',
  },
  removeItemButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30' + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'flex-end',
  },
  orderTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  notesInput: {
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});