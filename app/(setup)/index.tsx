import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  User,
  Calendar,
  ArrowUpDown,
  Weight,
  Zap,
  Coffee,
  AlertTriangle,
  Heart,
  ShieldOff,
} from "lucide-react-native";
import { supabase } from "@/utils/supabase";

const TOTAL_STEPS = 5;

const SENSITIVITY_OPTIONS = [
  { key: "none",     Icon: Coffee,       label: "None",      description: "I handle caffeine well",    limit: 400 },
  { key: "mild",     Icon: Zap,          label: "Mild",      description: "I get jittery sometimes",   limit: 200 },
  { key: "high",     Icon: ShieldOff,    label: "High",      description: "Caffeine hits me hard",     limit: 100 },
  { key: "pregnant", Icon: Heart,        label: "Pregnant",  description: "Pregnant or breastfeeding", limit: 200 },
  { key: "teen",     Icon: AlertTriangle,label: "Teen",      description: "Under 18",                  limit: 100 },
];

const STEP_ICONS = [User, Calendar, ArrowUpDown, Weight, Zap];

export default function Setup() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [age, setAge] = useState(25);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftin">("cm");
  const [heightCmInput, setHeightCmInput] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightInput, setWeightInput] = useState("");
  const [sensitivity, setSensitivity] = useState("none");
  const [dailyLimitMg, setDailyLimitMg] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function checkUsername(value: string) {
    if (value.length < 3) return;
    setUsernameChecking(true);
    const { data } = await supabase.from("profiles").select("id").eq("username", value).single();
    setUsernameChecking(false);
    setUsernameError(data ? "Username already taken" : "");
  }

  function validateUsername() {
    if (username.length < 3) { setUsernameError("Min 3 characters"); return false; }
    if (username.includes(" ")) { setUsernameError("No spaces allowed"); return false; }
    if (username !== username.toLowerCase()) { setUsernameError("Lowercase only"); return false; }
    if (usernameError === "Username already taken") return false;
    return true;
  }

  function getHeightCm() {
    if (heightUnit === "cm") return parseFloat(heightCmInput) || 0;
    return Math.round(((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * 2.54);
  }

  function getWeightKg() {
    const val = parseFloat(weightInput) || 0;
    return weightUnit === "kg" ? val : Math.round(val * 0.453592 * 10) / 10;
  }

  async function handleFinishSetup() {
    setSaveError(""); setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    const selectedOption = SENSITIVITY_OPTIONS.find(o => o.key === sensitivity);
    const weightKg = getWeightKg();
    const limit = Math.max(80, Math.min(Math.round(weightKg * 3), selectedOption?.limit ?? 400));
    setDailyLimitMg(limit);
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id, username, age,
      height_cm: getHeightCm(), weight_kg: weightKg,
      sensitivity_level: sensitivity, daily_limit_mg: limit,
      onboarding_complete: true,
    });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setStep(5);
  }

  function handleNext() {
    if (step === 0 && !validateUsername()) return;
    if (step < 4) setStep(step + 1);
    else handleFinishSetup();
  }

  const StepIcon = step < TOTAL_STEPS ? STEP_ICONS[step] : STEP_ICONS[0];
  const progress = step < 5 ? (step / TOTAL_STEPS) * 100 : 100;

  if (step === 5) {
    const espressos = Math.floor(dailyLimitMg / 63);
    const drip = Math.floor(dailyLimitMg / 95);
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.resultContainer}>
          <View style={styles.resultIconWrap}>
            <Coffee color="#000" size={32} strokeWidth={1} />
          </View>
          <Text style={styles.resultBigNumber}>{dailyLimitMg}<Text style={styles.resultUnit}>mg</Text></Text>
          <Text style={styles.resultLabel}>Your personal daily limit</Text>
          <View style={styles.divider} />
          <Text style={styles.resultEquiv}>
            ~{espressos} espresso{espressos !== 1 ? "s" : ""} or {drip} cups of drip coffee per day
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace("/(tabs)")} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Let's go</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
        </View>

        <View style={styles.topRow}>
          <TouchableOpacity style={[styles.backBtn, step === 0 && { opacity: 0 }]} onPress={() => step > 0 && setStep(step - 1)} disabled={step === 0} activeOpacity={0.7}>
            <ChevronLeft color="#000" size={22} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.stepCounter}>{step + 1} / {TOTAL_STEPS}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.stepIconWrap}>
            <StepIcon color="#000" size={28} strokeWidth={1.2} />
          </View>

          {step === 0 && <StepUsername username={username} setUsername={v => { setUsername(v); setUsernameError(""); }} onBlur={() => checkUsername(username)} error={usernameError} checking={usernameChecking} />}
          {step === 1 && <StepAge age={age} setAge={setAge} />}
          {step === 2 && <StepHeight unit={heightUnit} setUnit={setHeightUnit} cmInput={heightCmInput} setCmInput={setHeightCmInput} ftInput={heightFt} setFtInput={setHeightFt} inInput={heightIn} setInInput={setHeightIn} />}
          {step === 3 && <StepWeight unit={weightUnit} setUnit={setWeightUnit} input={weightInput} setInput={setWeightInput} />}
          {step === 4 && <StepSensitivity selected={sensitivity} setSelected={setSensitivity} age={age} />}

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.85} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{step === 4 ? "Finish" : "Continue"}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepUsername({ username, setUsername, onBlur, error, checking }: {
  username: string; setUsername: (v: string) => void;
  onBlur: () => void; error: string; checking: boolean;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.question}>What should we{"\n"}call you?</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="username"
        placeholderTextColor="#bbb"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        onBlur={onBlur}
      />
      {checking && <Text style={styles.hint}>Checking availability…</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function StepAge({ age, setAge }: { age: number; setAge: (v: number) => void }) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.question}>How old{"\n"}are you?</Text>
      <View style={styles.counterRow}>
        <TouchableOpacity style={styles.counterBtn} onPress={() => setAge(Math.max(13, age - 1))} activeOpacity={0.7}>
          <Text style={styles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterValue}>{age}</Text>
        <TouchableOpacity style={styles.counterBtn} onPress={() => setAge(Math.min(90, age + 1))} activeOpacity={0.7}>
          <Text style={styles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      {age < 18 && <Text style={styles.hint}>We'll set a safer caffeine limit for you.</Text>}
    </View>
  );
}

function StepHeight({ unit, setUnit, cmInput, setCmInput, ftInput, setFtInput, inInput, setInInput }: {
  unit: "cm" | "ftin"; setUnit: (v: "cm" | "ftin") => void;
  cmInput: string; setCmInput: (v: string) => void;
  ftInput: string; setFtInput: (v: string) => void;
  inInput: string; setInInput: (v: string) => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.question}>What's your{"\n"}height?</Text>
      <View style={styles.unitToggle}>
        <TouchableOpacity style={[styles.unitBtn, unit === "cm" && styles.unitBtnActive]} onPress={() => setUnit("cm")} activeOpacity={0.8}>
          <Text style={[styles.unitBtnText, unit === "cm" && styles.unitBtnTextActive]}>cm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.unitBtn, unit === "ftin" && styles.unitBtnActive]} onPress={() => setUnit("ftin")} activeOpacity={0.8}>
          <Text style={[styles.unitBtnText, unit === "ftin" && styles.unitBtnTextActive]}>ft · in</Text>
        </TouchableOpacity>
      </View>
      {unit === "cm" ? (
        <TextInput style={styles.input} placeholder="e.g. 170" placeholderTextColor="#bbb" keyboardType="numeric" value={cmInput} onChangeText={setCmInput} />
      ) : (
        <View style={styles.ftinRow}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="ft" placeholderTextColor="#bbb" keyboardType="numeric" value={ftInput} onChangeText={setFtInput} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="in" placeholderTextColor="#bbb" keyboardType="numeric" value={inInput} onChangeText={setInInput} />
        </View>
      )}
    </View>
  );
}

function StepWeight({ unit, setUnit, input, setInput }: {
  unit: "kg" | "lbs"; setUnit: (v: "kg" | "lbs") => void;
  input: string; setInput: (v: string) => void;
}) {
  return (
    <View style={styles.stepWrap}>
      <Text style={styles.question}>What's your{"\n"}weight?</Text>
      <View style={styles.unitToggle}>
        <TouchableOpacity style={[styles.unitBtn, unit === "kg" && styles.unitBtnActive]} onPress={() => setUnit("kg")} activeOpacity={0.8}>
          <Text style={[styles.unitBtnText, unit === "kg" && styles.unitBtnTextActive]}>kg</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.unitBtn, unit === "lbs" && styles.unitBtnActive]} onPress={() => setUnit("lbs")} activeOpacity={0.8}>
          <Text style={[styles.unitBtnText, unit === "lbs" && styles.unitBtnTextActive]}>lbs</Text>
        </TouchableOpacity>
      </View>
      <TextInput style={styles.input} placeholder={`e.g. ${unit === "kg" ? "70" : "154"}`} placeholderTextColor="#bbb" keyboardType="numeric" value={input} onChangeText={setInput} />
    </View>
  );
}

function StepSensitivity({ selected, setSelected, age }: {
  selected: string; setSelected: (v: string) => void; age: number;
}) {
  const options = age < 18 ? SENSITIVITY_OPTIONS : SENSITIVITY_OPTIONS.filter(o => o.key !== "teen");

  useEffect(() => { if (age < 18) setSelected("teen"); }, [age]);

  return (
    <View style={styles.stepWrap}>
      <Text style={styles.question}>Any caffeine{"\n"}sensitivity?</Text>
      <View style={{ gap: 10 }}>
        {options.map(({ key, Icon, label, description }) => {
          const isSelected = selected === key;
          return (
            <TouchableOpacity key={key} style={[styles.sensitivityCard, isSelected && styles.sensitivityCardSelected]} onPress={() => setSelected(key)} activeOpacity={0.8}>
              <View style={[styles.sensitivityIconWrap, isSelected && styles.sensitivityIconWrapSelected]}>
                <Icon color={isSelected ? "#fff" : "#000"} size={18} strokeWidth={1.5} />
              </View>
              <View style={styles.sensitivityTextWrap}>
                <Text style={[styles.sensitivityLabel, isSelected && { color: "#000" }]}>{label}</Text>
                <Text style={styles.sensitivityDesc}>{description}</Text>
              </View>
              {isSelected && <View style={styles.checkDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  progressBarBg: { height: 2, backgroundColor: "#f0f0f0", width: "100%" },
  progressBarFill: { height: 2, backgroundColor: "#000" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  stepCounter: { fontSize: 13, fontWeight: "600", color: "#bbb", letterSpacing: 0.5 },
  content: { paddingHorizontal: 24, paddingBottom: 48, gap: 28 },
  stepIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1, borderColor: "#e8e8e8",
    alignItems: "center", justifyContent: "center",
  },
  stepWrap: { gap: 20 },
  question: { fontSize: 32, fontWeight: "800", color: "#000", letterSpacing: -0.8, lineHeight: 40 },
  input: {
    height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: "#e8e8e8",
    paddingHorizontal: 16, fontSize: 16, color: "#000", backgroundColor: "#fff",
  },
  inputError: { borderColor: "#dc2626" },
  error: { fontSize: 13, color: "#dc2626" },
  hint: { fontSize: 13, color: "#999" },
  button: { height: 54, borderRadius: 14, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },
  counterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 36 },
  counterBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: "#e8e8e8", alignItems: "center", justifyContent: "center" },
  counterBtnText: { fontSize: 26, fontWeight: "300", color: "#000" },
  counterValue: { fontSize: 80, fontWeight: "800", color: "#000", letterSpacing: -3, minWidth: 100, textAlign: "center" },
  unitToggle: { flexDirection: "row", borderRadius: 10, borderWidth: 1.5, borderColor: "#e8e8e8", overflow: "hidden", alignSelf: "flex-start" },
  unitBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#fff" },
  unitBtnActive: { backgroundColor: "#000" },
  unitBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
  unitBtnTextActive: { color: "#fff" },
  ftinRow: { flexDirection: "row", gap: 12 },
  sensitivityCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#e8e8e8",
    paddingHorizontal: 14, paddingVertical: 14,
  },
  sensitivityCardSelected: { borderColor: "#000" },
  sensitivityIconWrap: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: "#e8e8e8", alignItems: "center", justifyContent: "center" },
  sensitivityIconWrapSelected: { backgroundColor: "#000", borderColor: "#000" },
  sensitivityTextWrap: { flex: 1, gap: 2 },
  sensitivityLabel: { fontSize: 15, fontWeight: "700", color: "#000" },
  sensitivityDesc: { fontSize: 12, color: "#999" },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#000" },
  resultContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  resultIconWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: "#e8e8e8", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  resultBigNumber: { fontSize: 80, fontWeight: "800", color: "#000", letterSpacing: -3 },
  resultUnit: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  resultLabel: { fontSize: 15, color: "#666", marginBottom: 4 },
  divider: { width: "100%", height: 1, backgroundColor: "#f0f0f0", marginVertical: 8 },
  resultEquiv: { fontSize: 14, color: "#999", textAlign: "center", lineHeight: 22, marginBottom: 12 },
});
