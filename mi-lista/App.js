// App.js - Versión offline con grid de listas, modo borrar y selector de color
import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  TextInput, Modal, Button, Alert, useColorScheme, SafeAreaView, StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@mis_listas_v2";
const DEFAULT_COLORS = ['#2B2B2B', '#4E4E50', '#6A91F2', '#3C8D2F', '#7A4C9E', '#855E42'];

export default function App() {
  const scheme = useColorScheme();
  const [listas, setListas] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedListId, setSelectedListId] = useState(null);
  const [showColorPickerFor, setShowColorPickerFor] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);

  // Cargar / guardar
  useEffect(() => {
    (async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setListas(JSON.parse(data));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(listas));
  }, [listas]);

  const createList = (name) => {
    const list = {
      id: Date.now().toString(),
      name: name || "Lista nueva",
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      items: [],
      markedForDelete: false,
    };
    setListas([list, ...listas]);
  };

  const updateList = (id, patch) => {
    setListas(listas.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const removeMarkedLists = () => {
    const marked = listas.filter(l => l.markedForDelete);
    if (marked.length === 0) {
      setDeleteMode(false);
      return;
    }
    Alert.alert(`Borrar ${marked.length} listas`, "¿Seguro que quieres borrarlas?", [
      { text: "Cancelar", onPress: () => setDeleteMode(false) },
      { text: "Borrar", style: "destructive", onPress: () => {
        setListas(listas.filter(l => !l.markedForDelete));
        setDeleteMode(false);
      } }
    ]);
  };

  // Grid data: añade tarjeta crear al final
  const gridData = [...listas, { id: "create-card", isCreate: true }];

  // Abrir vista lista
  const openList = (id) => {
    const list = listas.find(l => l.id === id);
    if (!list) return;
    setSelectedListId(id);
  };

  // Añadir item por texto
  const addItem = (listId, name, quantity = "1", category = "Otros") => {
    if (!name || name.trim() === "") return;
    const item = { id: Date.now().toString(), name: name.trim(), quantity: quantity || "1", category, bought: false };
    updateList(listId, { items: [item, ...listas.find(l => l.id === listId).items] });
  };

  // Toggle marcar para borrar en modo delete
  const toggleMarkForDelete = (id) => {
    updateList(id, { markedForDelete: !listas.find(l => l.id === id).markedForDelete });
  };

  // Render cuadrado
  const renderSquare = ({ item }) => {
    if (item.isCreate) {
      return (
        <TouchableOpacity style={[styles.square, scheme === 'dark' ? styles.squareDark : styles.squareLight, styles.createSquare]} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createText}>+ Crear nueva</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.square, { backgroundColor: item.color }]}
        onPress={() => deleteMode ? toggleMarkForDelete(item.id) : openList(item.id)}
      >
        <Text style={[styles.squareTitle, scheme === 'dark' ? { color: '#fff' } : { color: '#111' }]} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.squareCount}>{item.items.length} items</Text>

        <TouchableOpacity style={styles.smallDots} onPress={() => setShowColorPickerFor(item.id)}>
          <Text style={{ fontSize: 18 }}>⋯</Text>
        </TouchableOpacity>

        {deleteMode && item.markedForDelete && (
          <View style={styles.overlayDelete}><Text style={styles.overlayText}>BORRAR</Text></View>
        )}
      </TouchableOpacity>
    );
  };

  // Vista detalle lista (modal)
  const SelectedListModal = ({ list, onClose }) => {
    const [name, setName] = useState("");
    const [qty, setQty] = useState("");
    const [cat, setCat] = useState("Otros");

    if (!list) return null;
    return (
      <Modal visible={!!list} animationType="slide">
        <SafeAreaView style={[styles.container, scheme === 'dark' ? styles.darkBg : styles.lightBg]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose}><Text style={styles.headerText}>← Volver</Text></TouchableOpacity>
            <Text style={[styles.headerTitle, { color: list.color }]} numberOfLines={1}>{list.name}</Text>
            <TouchableOpacity onPress={() => setShowColorPickerFor(list.id)}><Text style={styles.headerText}>🎨</Text></TouchableOpacity>
          </View>

          <View style={{ padding: 12 }}>
            <TextInput placeholder="Producto" placeholderTextColor="#999" value={name} onChangeText={setName}
              style={[styles.input, scheme === 'dark' ? { backgroundColor: '#222', color: '#fff' } : {}]} />
            <TextInput placeholder="Cantidad" placeholderTextColor="#999" value={qty} onChangeText={setQty}
              style={[styles.input, { marginTop: 8 }, scheme === 'dark' ? { backgroundColor: '#222', color: '#fff' } : {}]} />
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <Button title="Añadir" onPress={() => { addItem(list.id, name, qty || '1', cat); setName(''); setQty(''); }} />
            </View>
          </View>

          <FlatList
            style={{ paddingHorizontal: 12 }}
            data={list.items}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16 }}>{item.name} ({item.quantity})</Text>
                  <Text style={{ color: '#666' }}>{item.category}</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  // toggle bought
                  updateList(list.id, { items: list.items.map(it => it.id === item.id ? { ...it, bought: !it.bought } : it) });
                }}>
                  <Text style={{ fontSize: 18 }}>{item.bought ? '✅' : '○'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  // delete item
                  updateList(list.id, { items: list.items.filter(it => it.id !== item.id) });
                }}>
                  <Text style={{ marginLeft: 12, color: '#b22222' }}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>La lista está vacía</Text>}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  const currentList = listas.find(l => l.id === selectedListId);

  return (
    <SafeAreaView style={[styles.container, scheme === 'dark' ? styles.darkBg : styles.lightBg]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.headerRow}>
        <Text style={[styles.appTitle, scheme === 'dark' ? { color: '#fff' } : { color: '#111' }]}>Mis listas</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {deleteMode ? (
            <TouchableOpacity onPress={removeMarkedLists} style={{ marginRight: 12 }}>
              <Text style={[styles.headerText, { color: '#b22222' }]}>Listo</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => {
            // entrar/salir modo borrar
            if (!deleteMode) {
              // reset marcas
              setListas(listas.map(l => ({ ...l, markedForDelete: false })));
              setDeleteMode(true);
            } else {
              // cancelar modo borrar
              setDeleteMode(false);
            }
          }}>
            <Text style={styles.headerText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={gridData}
        renderItem={renderSquare}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 12 }}
        contentContainerStyle={{ paddingTop: 12 }}
      />

      {/* Crear nueva lista modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, scheme === 'dark' ? styles.darkBg : styles.lightBg]}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Crear nueva lista</Text>
            <TextInput placeholder="Nombre de la lista" value={newListName} onChangeText={setNewListName}
              style={[styles.input, { marginBottom: 12 }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button title="Cancelar" onPress={() => { setShowCreateModal(false); setNewListName(''); }} />
              <View style={{ width: 12 }} />
              <Button title="Crear" onPress={() => { createList(newListName || 'Lista nueva'); setShowCreateModal(false); setNewListName(''); }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Selector de color para lista */}
      <Modal visible={!!showColorPickerFor} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { padding: 16 }, scheme === 'dark' ? styles.darkBg : styles.lightBg]}>
            <Text style={{ fontWeight: '700', marginBottom: 12 }}>Elegir color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {DEFAULT_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => {
                  updateList(showColorPickerFor, { color: c });
                  setShowColorPickerFor(null);
                }} style={[styles.colorSwatch, { backgroundColor: c }]} />
              ))}
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button title="Cerrar" onPress={() => setShowColorPickerFor(null)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Vista detalle lista */}
      <SelectedListModal list={currentList} onClose={() => setSelectedListId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  darkBg: { backgroundColor: '#0f0f10' },
  lightBg: { backgroundColor: '#f7f7f7' },

  headerRow: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appTitle: { fontSize: 22, fontWeight: '700' },
  headerText: { fontSize: 18, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  square: { width: '48%', height: 160, borderRadius: 10, marginBottom: 12, padding: 12, justifyContent: 'flex-end' },
  squareDark: { backgroundColor: '#2b2b2b' },
  squareLight: { backgroundColor: '#ddd' },
  createSquare: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#999', alignItems: 'center', justifyContent: 'center' },
  createText: { fontSize: 18, color: '#999' },
  squareTitle: { fontSize: 18, fontWeight: '700' },
  squareCount: { fontSize: 13, color: '#eee', marginTop: 8 },

  smallDots: { position: 'absolute', top: 8, right: 8, padding: 6 },

  overlayDelete: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,0,0,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  overlayText: { color: '#fff', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalBox: { borderRadius: 12, padding: 16, backgroundColor: '#fff' },

  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, height: 44 },

  colorSwatch: { width: 44, height: 44, borderRadius: 8, marginRight: 8, marginBottom: 8 },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
});
