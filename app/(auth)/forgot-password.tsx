import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, CheckCircle } from "lucide-react-native";
import { supabase } from "@/utils/supabase";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setError("");
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft color="#000" size={26} strokeWidth={2} />
          </TouchableOpacity>

          {sent ? (
            <View style={styles.successWrap}>
              <CheckCircle color="#000" size={64} strokeWidth={1} />
              <Text style={styles.title}>Reset link sent</Text>
              <Text style={styles.subtitle}>Check your email for a password reset link.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a reset link
              </Text>

              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#aaa"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSend}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center", marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "800", color: "#000", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 40, lineHeight: 22 },
  form: { gap: 14 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#000",
    backgroundColor: "#fff",
  },
  error: { fontSize: 13, color: "#dc2626", marginTop: 4 },
  button: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
});
