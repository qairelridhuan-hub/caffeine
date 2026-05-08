import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Mail } from "lucide-react-native";
import { supabase } from "@/utils/supabase";

export default function CheckEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") {
        router.replace("/(setup)");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleResend() {
    setResendError("");
    if (!params.email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: params.email });
    if (error) {
      setResendError(error.message);
    } else {
      setResent(true);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Mail color="#000" size={64} strokeWidth={1} />
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to your email. Click it to activate your account.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => Linking.openURL("message://").catch(() => Linking.openURL("mailto://").catch(() => {}))}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Open email app</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e0e0e0", marginTop: -8 }]}
          onPress={() => router.replace("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, { color: "#000" }]}>I've verified my email</Text>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendNote}>Didn't get it? Check your spam or </Text>
          <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
            <Text style={styles.resendLink}>{resent ? "Sent!" : "Resend email"}</Text>
          </TouchableOpacity>
        </View>

        {resendError ? <Text style={styles.error}>{resendError}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 20,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#000", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22 },
  button: {
    height: 54,
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  resendRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  resendNote: { fontSize: 13, color: "#666" },
  resendLink: { fontSize: 13, color: "#000", fontWeight: "600", textDecorationLine: "underline" },
  error: { fontSize: 13, color: "#dc2626" },
});
