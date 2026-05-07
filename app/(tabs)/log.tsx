import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { getCaffeineMg, addLog, getLogs, deleteLog, LogEntry } from "@/utils/caffeine";

export default function LogScreen() {
  const [drink, setDrink] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLogs().then(setLogs);
  }, []);

  async function handleAdd() {
    const name = drink.trim();
    if (!name) return;
    setLoading(true);
    try {
      const mg = await getCaffeineMg(name);
      const entry = await addLog(name, mg);
      setLogs((prev) => [entry, ...prev]);
      setDrink("");
    } catch {
      Alert.alert("Error", "Could not fetch caffeine info. Check your API key.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  const totalMg = logs
    .filter((l) => {
      const today = new Date();
      const d = new Date(l.timestamp);
      return d.toDateString() === today.toDateString();
    })
    .reduce((sum, l) => sum + l.mg, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Log Drink</Text>

        <View style={styles.todayBadge}>
          <Text style={styles.todayLabel}>TODAY</Text>
          <Text style={styles.todayMg}>{totalMg} mg</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Oat Milk Latte"
            placeholderTextColor={Colors.textTertiary}
            value={drink}
            onChangeText={setDrink}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            editable={!loading}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.addBtnText}>+</Text>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>No drinks logged yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.logItem}>
              <View style={styles.logLeft}>
                <Text style={styles.logDrink}>{item.drink}</Text>
                <Text style={styles.logTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <View style={styles.logRight}>
                <Text style={styles.logMg}>{item.mg} mg</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text, letterSpacing: -0.5 },

  todayBadge: {
    marginTop: 20,
    backgroundColor: Colors.text,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  todayLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 1.5 },
  todayMg: { fontSize: 28, fontWeight: "800", color: "#fff" },

  inputRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    width: 50,
    height: 50,
    backgroundColor: Colors.text,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { fontSize: 24, color: "#fff", lineHeight: 28 },

  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logLeft: { gap: 2 },
  logDrink: { fontSize: 15, fontWeight: "600", color: Colors.text },
  logTime: { fontSize: 12, color: Colors.textTertiary },
  logRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  logMg: { fontSize: 15, fontWeight: "700", color: Colors.text },
  deleteBtn: { fontSize: 13, color: Colors.textTertiary },

  empty: { marginTop: 40, textAlign: "center", color: Colors.textTertiary, fontSize: 14 },
});
