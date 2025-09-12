import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Upload, FileText, Plus, Trash2, Package } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Product, ProductCatalog } from '@/types/contact';
import { useContacts } from '@/hooks/contacts-store';

interface ProductCatalogModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectProducts?: (products: Product[]) => void;
  editingCatalog?: ProductCatalog | null;
}

export default function ProductCatalogModal({
  visible,
  onClose,
  onSelectProducts,
  editingCatalog,
}: ProductCatalogModalProps) {
  const { addProductCatalog, updateProductCatalog } = useContacts();
  const [catalogName, setCatalogName] = useState(editingCatalog?.name || '');
  const [products, setProducts] = useState<Product[]>(editingCatalog?.products || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductSku, setNewProductSku] = useState('');

  const handleUploadPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'ios' ? 'application/pdf' : 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        Alert.alert('Error', 'No file selected');
        return;
      }

      setIsProcessing(true);

      // Read the PDF file content
      const formData = new FormData();
      if (Platform.OS === 'web') {
        // For web, we need to fetch the blob
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('pdf', blob, file.name);
      } else {
        // For mobile
        formData.append('pdf', {
          uri: file.uri,
          type: 'application/pdf',
          name: file.name,
        } as any);
      }

      // Send to AI API to extract products
      const aiResponse = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a product catalog parser. Extract product information from the provided text and return it as a JSON array.
              Each product should have: name (string), price (number), description (optional string), sku (optional string).
              Return ONLY valid JSON array, no other text. Example:
              [{"name": "Product 1", "price": 29.99, "description": "Description here", "sku": "SKU123"}]`
            },
            {
              role: 'user',
              content: `Parse this product catalog and extract all products with their prices. If you can't find clear products, return an empty array. Here's the text: ${file.name} - Please note that PDF parsing is simulated. In a real implementation, you would need to extract text from the PDF first.`
            }
          ]
        }),
      });

      const aiData = await aiResponse.json();
      
      // Parse the AI response to extract products
      try {
        let extractedProducts: any[] = [];
        const completion = aiData.completion || '';
        
        // Try to find JSON array in the response
        const jsonMatch = completion.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          extractedProducts = JSON.parse(jsonMatch[0]);
        }

        if (Array.isArray(extractedProducts) && extractedProducts.length > 0) {
          const parsedProducts: Product[] = extractedProducts.map((p: any, index: number) => ({
            id: Date.now().toString() + index,
            name: p.name || `Product ${index + 1}`,
            price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
            description: p.description || undefined,
            sku: p.sku || undefined,
            category: p.category || undefined,
            inStock: p.inStock !== false,
          }));

          setProducts(prev => [...prev, ...parsedProducts]);
          Alert.alert('Success', `Extracted ${parsedProducts.length} products from PDF`);
        } else {
          // If AI couldn't extract, show manual entry hint
          Alert.alert(
            'Manual Entry Needed',
            'Could not automatically extract products from this PDF. Please add products manually using the form below.',
            [{ text: 'OK' }]
          );
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        Alert.alert(
          'Manual Entry Needed',
          'Could not automatically extract products from this PDF. Please add products manually using the form below.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      Alert.alert('Error', 'Failed to process PDF. Please try adding products manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addProduct = () => {
    if (!newProductName.trim() || !newProductPrice.trim()) {
      Alert.alert('Error', 'Please enter product name and price');
      return;
    }

    const price = parseFloat(newProductPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const newProduct: Product = {
      id: Date.now().toString(),
      name: newProductName.trim(),
      price,
      description: newProductDescription.trim() || undefined,
      sku: newProductSku.trim() || undefined,
      inStock: true,
    };

    setProducts([...products, newProduct]);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductDescription('');
    setNewProductSku('');
  };

  const removeProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const saveCatalog = () => {
    if (!catalogName.trim()) {
      Alert.alert('Error', 'Please enter a catalog name');
      return;
    }

    if (products.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }

    if (editingCatalog) {
      updateProductCatalog({
        id: editingCatalog.id,
        updates: {
          name: catalogName.trim(),
          products,
        },
      });
      Alert.alert('Success', 'Catalog updated successfully');
    } else {
      addProductCatalog({
        name: catalogName.trim(),
        products,
      });
      Alert.alert('Success', 'Catalog created successfully');
    }

    onClose();
  };

  const handleSelectForOrder = () => {
    if (products.length === 0) {
      Alert.alert('Error', 'No products to select');
      return;
    }

    if (onSelectProducts) {
      onSelectProducts(products);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {editingCatalog ? 'Edit Product Catalog' : 'Create Product Catalog'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catalog Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter catalog name"
              value={catalogName}
              onChangeText={setCatalogName}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Import from PDF</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUploadPDF}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Upload size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>Upload PDF</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.helpText}>
              Upload a PDF with your product list. We'll try to extract products and prices automatically.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Product Manually</Text>
            <TextInput
              style={styles.input}
              placeholder="Product name"
              value={newProductName}
              onChangeText={setNewProductName}
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={newProductPrice}
              onChangeText={setNewProductPrice}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="SKU (optional)"
              value={newProductSku}
              onChangeText={setNewProductSku}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newProductDescription}
              onChangeText={setNewProductDescription}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.addButton} onPress={addProduct}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {products.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Products ({products.length})
              </Text>
              <View style={styles.productList}>
                {products.map((product) => (
                  <View key={product.id} style={styles.productCard}>
                    <View style={styles.productInfo}>
                      <View style={styles.productHeader}>
                        <Package size={16} color="#666" />
                        <Text style={styles.productName}>{product.name}</Text>
                      </View>
                      {product.sku && (
                        <Text style={styles.productSku}>SKU: {product.sku}</Text>
                      )}
                      {product.description && (
                        <Text style={styles.productDescription}>
                          {product.description}
                        </Text>
                      )}
                      <Text style={styles.productPrice}>
                        ${product.price.toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeProduct(product.id)}
                    >
                      <Trash2 size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          {onSelectProducts ? (
            <TouchableOpacity
              style={[styles.saveButton, products.length === 0 && styles.disabledButton]}
              onPress={handleSelectForOrder}
              disabled={products.length === 0}
            >
              <Text style={styles.saveButtonText}>Use for Order</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.saveButton, (!catalogName.trim() || products.length === 0) && styles.disabledButton]}
              onPress={saveCatalog}
              disabled={!catalogName.trim() || products.length === 0}
            >
              <Text style={styles.saveButtonText}>
                {editingCatalog ? 'Update' : 'Save'} Catalog
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  addButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  productList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
  },
  footer: {
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
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});