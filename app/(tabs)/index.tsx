import React, { useEffect, useState, useCallback, useRef } from "react";
import { PanResponder } from "react-native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Polyline, Polygon, Line, Text as SvgText,
  Path, Defs, ClipPath, Rect,
} from "react-native-svg";
import { Bell, LogOut, Flame, Clock, Minus, Plus, X, Coffee } from "lucide-react-native";
import { supabase } from "@/utils/supabase";
import coffeeData from "@/constants/coffee_data.json";
import { useRouter } from "expo-router";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const ALL_DRINKS = (coffeeData as any).categories.flatMap((c: any) => c.drinks);
const W = Dimensions.get("window").width;

type Drink    = { id: string; name: string; caffeine_mg: { typical: number } };
type LogEntry = { id: string; drink_name: string; caffeine_mg: number; quantity: number; consumed_at: string };

function fmt(d: Date) {
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${m < 10 ? "0" + m : m} ${h >= 12 ? "PM" : "AM"}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function caffeineAt(logs: LogEntry[], t: Date) {
  return logs.reduce((sum, l) => {
    const h = (t.getTime() - new Date(l.consumed_at).getTime()) / 3600000;
    return h < 0 ? sum : sum + l.caffeine_mg * l.quantity * Math.pow(0.5, h / 5);
  }, 0);
}

// ── Animated coffee cup ──────────────────────────────────────
type CupStyle = "mug" | "takeaway" | "iced";

const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

function CoffeeCup({ pct, color, size = 120, style = "mug", mgLabel }: { pct: number; color: string; size?: number; style?: CupStyle; mgLabel?: number }) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, { toValue: Math.min(pct, 1), duration: 1000, useNativeDriver: false }).start();
  }, [pct]);

  // Mug: fill from y=40 to y=82
  const MUG_TOP = 40, MUG_BOT = 82, MUG_H = MUG_BOT - MUG_TOP;
  const mugFillH = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, MUG_H] });
  const mugFillY = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [MUG_BOT, MUG_TOP] });
  // label sits 6px above the fill waterline
  const mugLabelY = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [MUG_BOT - 4, MUG_TOP + 8] });

  // Takeaway / Iced cup: fill from y=42 to y=84
  const CUP_TOP = 42, CUP_BOT = 84, CUP_H = CUP_BOT - CUP_TOP;
  const cupFillH = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, CUP_H] });
  const cupFillY = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [CUP_BOT, CUP_TOP] });
  const cupLabelY = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [CUP_BOT - 4, CUP_TOP + 8] });

  if (style === "mug") {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="mugClip">
            <Path d="M 20 40 Q 20 38 22 38 L 64 38 Q 66 38 66 40 L 66 80 Q 66 84 62 84 L 24 84 Q 20 84 20 80 Z" />
          </ClipPath>
        </Defs>
        <AnimatedRect x={20} y={mugFillY} width={46} height={mugFillH} fill={color} clipPath="url(#mugClip)" opacity={0.9} />
        <Path d="M 18 38 Q 18 36 20 36 L 66 36 Q 68 36 68 38 L 68 80 Q 68 86 62 86 L 24 86 Q 18 86 18 80 Z" stroke="#1a1a1a" strokeWidth={2.2} fill="none" />
        <Path d="M 68 50 C 84 50 84 72 68 72" stroke="#1a1a1a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Path d="M 32 30 Q 29 25 32 20 Q 35 15 32 10" stroke="#d0d0d0" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d="M 43 28 Q 40 23 43 18 Q 46 13 43 8"  stroke="#d0d0d0" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d="M 54 30 Q 51 25 54 20 Q 57 15 54 10" stroke="#d0d0d0" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        {mgLabel != null && pct > 0 && (
          <AnimatedSvgText x={43} y={mugLabelY} fontSize={9} fontWeight="700" fill="#fff" textAnchor="middle" opacity={0.9}>
            {`${mgLabel}mg`}
          </AnimatedSvgText>
        )}
      </Svg>
    );
  }

  if (style === "takeaway") {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="takeawayClip">
            <Path d="M 26 42 L 30 84 Q 30 86 32 86 L 58 86 Q 60 86 60 84 L 64 42 Z" />
          </ClipPath>
        </Defs>
        <AnimatedRect x={24} y={cupFillY} width={42} height={cupFillH} fill={color} clipPath="url(#takeawayClip)" opacity={0.9} />
        <Path d="M 26 42 L 30 84 Q 30 86 32 86 L 58 86 Q 60 86 60 84 L 64 42 Z" stroke="#1a1a1a" strokeWidth={2.2} fill="none" />
        <Path d="M 23 38 Q 23 36 25 36 L 65 36 Q 67 36 67 38 L 67 42 L 23 42 Z" stroke="#1a1a1a" strokeWidth={2.2} fill="none" />
        <Path d="M 30 36 Q 30 30 35 30 L 55 30 Q 60 30 60 36" stroke="#1a1a1a" strokeWidth={2.2} fill="none" />
        <Path d="M 52 30 L 62 10" stroke="#1a1a1a" strokeWidth={2.5} strokeLinecap="round" />
        {mgLabel != null && pct > 0 && (
          <AnimatedSvgText x={45} y={cupLabelY} fontSize={9} fontWeight="700" fill="#fff" textAnchor="middle" opacity={0.9}>
            {`${mgLabel}mg`}
          </AnimatedSvgText>
        )}
      </Svg>
    );
  }

  // iced
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="icedClip">
          <Path d="M 24 38 L 28 84 Q 28 87 31 87 L 59 87 Q 62 87 62 84 L 66 38 Z" />
        </ClipPath>
      </Defs>
      <AnimatedRect x={22} y={cupFillY} width={46} height={cupFillH} fill={color} clipPath="url(#icedClip)" opacity={0.9} />
      <Path d="M 24 38 L 28 84 Q 28 87 31 87 L 59 87 Q 62 87 62 84 L 66 38 Z" stroke="#1a1a1a" strokeWidth={2.2} fill="none" />
      <Path d="M 22 40 Q 22 32 45 32 Q 68 32 68 40 L 22 40 Z" stroke="#1a1a1a" strokeWidth={2.2} fill="none" />
      <Path d="M 50 32 L 58 8" stroke="#1a1a1a" strokeWidth={2.5} strokeLinecap="round" />
      <Rect x={30} y={55} width={12} height={10} rx={2} stroke="#1a1a1a" strokeWidth={1.5} fill="none" opacity={0.4} />
      <Rect x={48} y={60} width={11} height={10} rx={2} stroke="#1a1a1a" strokeWidth={1.5} fill="none" opacity={0.4} />
      <Rect x={36} y={68} width={13} height={10} rx={2} stroke="#1a1a1a" strokeWidth={1.5} fill="none" opacity={0.4} />
      {mgLabel != null && pct > 0 && (
        <AnimatedSvgText x={45} y={cupLabelY} fontSize={9} fontWeight="700" fill="#fff" textAnchor="middle" opacity={0.9}>
          {`${mgLabel}mg`}
        </AnimatedSvgText>
      )}
    </Svg>
  );
}



// ── Log sheet ────────────────────────────────────────────────
function LogSheet({ visible, onClose, session, fetchLogs }: {
  visible: boolean;
  onClose: () => void;
  session: any;
  fetchLogs: () => void;
}) {
  const slideY  = useRef(new Animated.Value(600)).current;
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<Drink[]>([]);
  const [selected, setSelected] = useState<Drink | null>(null);
  const [qty,      setQty]      = useState(1);
  const [time,     setTime]     = useState(new Date());
  const [logging,  setLogging]  = useState(false);
  const [logError, setLogError] = useState("");

  useEffect(() => {
    if (visible) {
      setTime(new Date());
      Animated.spring(slideY, { toValue: 0, damping: 18, stiffness: 160, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideY, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleLog = async () => {
    if (!selected || !session) return;
    setLogging(true); setLogError("");
    const { error } = await supabase.from("daily_logs").insert({
      user_id: session.user.id,
      drink_name: selected.name,
      caffeine_mg: selected.caffeine_mg.typical,
      quantity: qty,
      consumed_at: time.toISOString(),
    });
    if (error) {
      setLogError("Failed to log. Please try again.");
    } else {
      fetchLogs();
      setSelected(null); setQuery(""); setQty(1); setTime(new Date());
      onClose();
    }
    setLogging(false);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={bs.backdrop} onPress={onClose} />
      <Animated.View style={[bs.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={bs.handle} />
        <Text style={ls.title}>Log a drink</Text>

        <View style={{ zIndex: 10 }}>
          <TextInput
            style={ls.input}
            placeholder="Search coffee, tea, energy drinks…"
            placeholderTextColor="#c0c0c0"
            value={query}
            onChangeText={t => {
              setQuery(t);
              setResults(t.length ? ALL_DRINKS.filter((d: Drink) => d.name.toLowerCase().includes(t.toLowerCase())).slice(0, 5) : []);
            }}
          />
          {results.length > 0 && (
            <View style={ls.dropdown}>
              {results.map((d, i) => (
                <TouchableOpacity
                  key={d.id}
                  style={[ls.dropRow, i < results.length - 1 && ls.dropBorder]}
                  onPress={() => { setSelected(d); setQuery(""); setResults([]); }}
                >
                  <Text style={ls.dropName}>{d.name}</Text>
                  <Text style={ls.dropMg}>{d.caffeine_mg.typical}mg</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {selected && (
          <View style={ls.selectedRow}>
            <View style={ls.selectedDot} />
            <Text style={ls.selectedName}>{selected.name}</Text>
            <Text style={ls.selectedMg}>{selected.caffeine_mg.typical}mg</Text>
            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={13} color="#c0c0c0" />
            </TouchableOpacity>
          </View>
        )}

        <View style={ls.controlRow}>
          <View style={ls.controlCol}>
            <Text style={ls.controlLbl}>Quantity</Text>
            <View style={ls.stepper}>
              <TouchableOpacity style={ls.stepBtn} onPress={() => setQty(q => Math.max(1, q - 1))}>
                <Minus size={13} color="#111" />
              </TouchableOpacity>
              <Text style={ls.stepVal}>{qty}</Text>
              <TouchableOpacity style={ls.stepBtn} onPress={() => setQty(q => Math.min(10, q + 1))}>
                <Plus size={13} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={ls.controlCol}>
            <Text style={ls.controlLbl}>Time</Text>
            <View style={ls.stepper}>
              <TouchableOpacity style={ls.stepBtn} onPress={() => setTime(t => new Date(t.getTime() - 900000))}>
                <Minus size={13} color="#111" />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Clock size={10} color="#aaa" />
                <Text style={ls.stepVal}>{fmt(time)}</Text>
              </View>
              <TouchableOpacity style={ls.stepBtn} onPress={() => setTime(t => new Date(t.getTime() + 900000))}>
                <Plus size={13} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[ls.logBtn, !selected && ls.logBtnOff]}
          onPress={handleLog}
          disabled={!selected || logging}
          activeOpacity={0.85}
        >
          {logging
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[ls.logBtnTxt, !selected && ls.logBtnTxtOff]}>Log drink</Text>
          }
        </TouchableOpacity>
        {logError ? <Text style={ls.logError}>{logError}</Text> : null}
      </Animated.View>
    </Modal>
  );
}

// ── Details bottom sheet ─────────────────────────────────────
function DetailsSheet({ visible, onClose, logs, fetchLogs }: {
  visible: boolean;
  onClose: () => void;
  logs: LogEntry[];
  fetchLogs: () => void;
}) {
  const [tab, setTab] = useState<"curve" | "log">("curve");
  const slideY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, damping: 18, stiffness: 160, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideY, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const gw = W - 48, gh = 140, pl = 24, pt = 8;
  const now = new Date();
  const pts = Array.from({ length: 21 }, (_, i) => {
    const t = new Date(now.getTime() + i * 30 * 60000);
    return { i, mg: caffeineAt(logs, t), t };
  });
  const maxY = Math.max(...pts.map(p => p.mg), 100);
  const tx = (i: number) => pl + (i / 20) * (gw - pl - 8);
  const ty = (mg: number) => pt + gh - (mg / maxY) * gh;
  const line = pts.map(p => `${tx(p.i)},${ty(p.mg)}`).join(" ");
  const fillPts = [`${tx(0)},${ty(0)}`, ...pts.map(p => `${tx(p.i)},${ty(p.mg)}`), `${tx(20)},${ty(0)}`].join(" ");

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={bs.backdrop} onPress={onClose} />
      <Animated.View style={[bs.sheet, { transform: [{ translateY: slideY }] }]}>

        {/* Handle */}
        <View style={bs.handle} />

        {/* Tabs */}
        <View style={bs.tabs}>
          <TouchableOpacity style={[bs.tab, tab === "curve" && bs.tabActive]} onPress={() => setTab("curve")} activeOpacity={0.8}>
            <Text style={[bs.tabText, tab === "curve" && bs.tabTextActive]}>Decay Curve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[bs.tab, tab === "log" && bs.tabActive]} onPress={() => setTab("log")} activeOpacity={0.8}>
            <Text style={[bs.tabText, tab === "log" && bs.tabTextActive]}>Today's Log</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={bs.content} showsVerticalScrollIndicator={false}>
          {tab === "curve" ? (
            <View>
              <Text style={bs.sheetSub}>Estimated caffeine in your system over the next 10 hours</Text>
              {logs.length === 0
                ? <View style={bs.empty}><Text style={bs.emptyText}>Log a drink to see your curve</Text></View>
                : (
                  <View style={{ marginTop: 16 }}>
                    <Svg width={gw} height={gh + pt + 24}>
                      <Line x1={pl} y1={ty(maxY * 0.5)} x2={gw - 8} y2={ty(maxY * 0.5)} stroke="#f0f0f0" strokeWidth={1} strokeDasharray="3 3" />
                      <SvgText x={8} y={ty(maxY * 0.5) + 4} fontSize={9} fill="#d0d0d0">{Math.round(maxY * 0.5)}mg</SvgText>
                      {[0, 5, 10, 15, 20].map(idx => (
                        <SvgText key={idx} x={tx(idx)} y={gh + pt + 18} textAnchor="middle" fontSize={10} fill="#c0c0c0">
                          {(() => { const h = pts[idx].t.getHours(); return `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "p" : "a"}`; })()}
                        </SvgText>
                      ))}
                      <Polygon points={fillPts} fill="rgba(0,0,0,0.04)" />
                      <Polyline points={line} fill="none" stroke="#111" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    </Svg>
                  </View>
                )
              }
            </View>
          ) : (
            <View>
              <Text style={bs.sheetSub}>{logs.length} drink{logs.length !== 1 ? "s" : ""} logged today</Text>
              {logs.length === 0
                ? <View style={bs.empty}><Text style={bs.emptyText}>Nothing logged yet today</Text></View>
                : logs.map((l, i) => (
                  <View key={l.id}>
                    {i > 0 && <View style={bs.rowDivider} />}
                    <View style={bs.logRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={bs.logName}>{l.drink_name}</Text>
                        <Text style={bs.logMeta}>{fmt(new Date(l.consumed_at))}{l.quantity > 1 ? `  ×${l.quantity}` : ""}</Text>
                      </View>
                      <Text style={bs.logMg}>{Math.round(l.caffeine_mg * l.quantity)}mg</Text>
                      <TouchableOpacity
                        onPress={async () => { await supabase.from("daily_logs").delete().eq("id", l.id); fetchLogs(); }}
                        style={{ marginLeft: 16 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={13} color="#d0d0d0" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              }
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [loading,   setLoading]   = useState(true);
  const [username,  setUsername]  = useState("there");
  const [dailyLimit,setDailyLimit]= useState(400);
  const [logs,      setLogs]      = useState<LogEntry[]>([]);
  const [session,   setSession]   = useState<any>(null);
  const [userId,    setUserId]    = useState<string | null>(null);
  const [streak,      setStreak]      = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showLog,     setShowLog]     = useState(false);
  const [cupStyle,    setCupStyle]    = useState<CupStyle>("mug");

  const CUP_STYLES: CupStyle[] = ["mug", "takeaway", "iced"];

  const cupPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -30) {
          setCupStyle(s => { const i = CUP_STYLES.indexOf(s); return CUP_STYLES[(i + 1) % CUP_STYLES.length]; });
        } else if (g.dx > 30) {
          setCupStyle(s => { const i = CUP_STYLES.indexOf(s); return CUP_STYLES[(i - 1 + CUP_STYLES.length) % CUP_STYLES.length]; });
        }
      },
    })
  ).current;

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const sess = s?.session;
      if (!sess) { setLoading(false); return; }
      setSession(sess); setUserId(sess.user.id);
      const { data: p } = await supabase.from("profiles").select("username, daily_limit_mg").eq("id", sess.user.id).single();
      if (p) { setUsername(p.username ?? "there"); setDailyLimit(p.daily_limit_mg ?? 400); }
    })();
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.from("daily_logs").select("*")
        .eq("user_id", userId).gte("consumed_at", start.toISOString())
        .order("consumed_at", { ascending: false });
      if (!error && data) setLogs(data as LogEntry[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { if (userId) fetchLogs(); }, [userId, fetchLogs]);

  const fetchStreak = useCallback(async () => {
    if (!userId) return;
    const ago = new Date(); ago.setDate(ago.getDate() - 30); ago.setHours(0, 0, 0, 0);
    const { data } = await supabase.from("daily_logs").select("*")
      .eq("user_id", userId).gte("consumed_at", ago.toISOString());
    if (!data) return;
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const day = data.filter((l: LogEntry) => new Date(l.consumed_at).toDateString() === d.toDateString());
      if (i === 0 && day.length === 0) break;
      const total = day.reduce((s: number, l: LogEntry) => s + l.caffeine_mg * l.quantity, 0);
      if (total <= dailyLimit) count++; else break;
    }
    setStreak(count);
  }, [userId, dailyLimit]);

  useEffect(() => { if (userId) fetchStreak(); }, [userId, fetchStreak, logs]);

  const totalToday = logs.reduce((s, l) => s + l.caffeine_mg * l.quantity, 0);
  const pct         = Math.min(dailyLimit > 0 ? totalToday / dailyLimit : 0, 1);
  const statusColor = "#111";
  const statusLabel = pct >= 0.85 ? "Over limit" : pct >= 0.6 ? "Approaching" : "On track";

  const bedtime = new Date(); bedtime.setHours(23, 0, 0, 0);
  const atBed   = caffeineAt(logs, bedtime);

  const cutoff = (() => {
    for (let h = new Date().getHours(); h <= 22; h++) {
      if (63 * Math.pow(0.5, (23 - h) / 5) < 50)
        return `${h % 12 === 0 ? 12 : h % 12}:00 ${h >= 12 ? "PM" : "AM"}`;
    }
    return null;
  })();

  // #5 — time since last drink
  const timeSinceLast = (() => {
    if (!logs.length) return null;
    const mins = Math.floor((Date.now() - new Date(logs[0].consumed_at).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
  })();

  // #3 — what you can still have
  const canStillHave = (() => {
    const rem = dailyLimit - totalToday;
    if (rem <= 0) return "You've hit your limit";
    const espresso = 63, drip = 95, energy = 160;
    if (rem >= energy) return `${Math.floor(rem / energy)} energy drink${Math.floor(rem / energy) > 1 ? "s" : ""}`;
    if (rem >= drip)   return `${Math.floor(rem / drip)} drip coffee`;
    if (rem >= espresso) return `${Math.floor(rem / espresso)} espresso shot${Math.floor(rem / espresso) > 1 ? "s" : ""}`;
    return "Go easy — nearly there";
  })();

  // #4 — sparkline points (last 12h, every 30 min)


  if (loading) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#000" />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoCircle}>
            <Image source={require("../../assets/logo.png")} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
          </View>
          <View>
            <Text style={s.appName}>caffeine</Text>
            <Text style={s.headerSub}>Hey, {username}!</Text>
          </View>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Bell size={17} color="#111" strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtn} activeOpacity={0.7}
            onPress={async () => { await supabase.auth.signOut(); router.replace("/onboarding"); }}
          >
            <LogOut size={17} color="#111" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Date + streak ── */}
        <View style={s.dateRow}>
          <Text style={s.dateText}>{todayLabel()}</Text>
          {streak > 0 && (
            <View style={s.streakBadge}>
              <Flame size={11} color="#111" />
              <Text style={s.streakText}>{streak}d streak</Text>
            </View>
          )}
        </View>

        {/* ── Main summary card ── */}
        <View style={s.card}>

          {/* Row 1: label + status */}
          <View style={s.cardTopRow}>
            <Text style={s.cupLabel}>Today's intake</Text>
            <View style={s.statusChip}>
              <View style={s.statusDot} />
              <Text style={s.statusChipText}>{statusLabel}</Text>
            </View>
          </View>

          {/* Row 2: cup + right stats */}
          <View style={s.cupSection}>
            {/* Cup with swipe dots */}
            <View style={{ alignItems: "center", gap: 10 }} {...cupPan.panHandlers}>
              <CoffeeCup pct={pct} color={statusColor} size={(W - 96) / 2} style={cupStyle} mgLabel={Math.round(totalToday)} />
              <View style={{ flexDirection: "row", gap: 5 }}>
                {CUP_STYLES.map(cs => (
                  <TouchableOpacity key={cs} onPress={() => setCupStyle(cs)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <View style={{ width: cs === cupStyle ? 16 : 5, height: 5, borderRadius: 3, backgroundColor: cs === cupStyle ? "#111" : "#e0e0e0" }} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Right: mg hero + 2 stats */}
            <View style={{ flex: 1, gap: 12 }}>
              <View>
                <Text style={s.heroMg}>{Math.round(totalToday)}<Text style={s.heroMgUnit}> mg</Text></Text>
                <Text style={s.limitNote}>{Math.round(pct * 100)}% of {dailyLimit}mg</Text>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.min(pct * 100, 100)}%` as any }]} />
                </View>
              </View>
              <View style={s.tileCol}>
                <View style={s.tileItem}>
                  <Text style={s.tileVal}>{Math.max(0, Math.round(dailyLimit - totalToday))}<Text style={s.tileUnit}> mg</Text></Text>
                  <Text style={s.tileLbl}>remaining</Text>
                </View>
                <View style={s.tileItemDivider} />
                <View style={s.tileItem}>
                  <Text style={s.tileVal}>{atBed > 50 ? "Poor" : "Good"}</Text>
                  <Text style={s.tileLbl}>sleep outlook</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Row 3: bottom stats */}
          <View style={s.statsRow}>
            <View style={s.statCol}>
              <Text style={s.statVal}>{logs.length}</Text>
              <Text style={s.statLbl}>Drinks today</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.statCol}>
              <Text style={s.statVal}>{Math.round(atBed)}<Text style={s.statValSm}>mg</Text></Text>
              <Text style={s.statLbl}>At bedtime</Text>
            </View>
            {cutoff && <>
              <View style={s.statSep} />
              <View style={s.statCol}>
                <Text style={s.statVal}>{cutoff}</Text>
                <Text style={s.statLbl}>Last safe coffee</Text>
              </View>
            </>}
          </View>

          <View style={s.divider} />

          {/* Row 4: insights */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={s.insightItem}>
              <Text style={s.insightIcon}>☕</Text>
              <View>
                <Text style={s.insightLabel}>Can still have</Text>
                <Text style={s.insightVal}>{canStillHave}</Text>
              </View>
            </View>
            {timeSinceLast && (
              <View style={s.insightItem}>
                <Text style={s.insightIcon}>⏱</Text>
                <View>
                  <Text style={s.insightLabel}>Last drink</Text>
                  <Text style={s.insightVal}>{timeSinceLast}</Text>
                </View>
              </View>
            )}
          </View>

        </View>

        {/* ── Actions card ── */}
        <View style={s.actionsCard}>
          <TouchableOpacity style={s.actionRow} onPress={() => setShowLog(true)} activeOpacity={0.8}>
            <View style={s.actionRowLeft}>
              <View style={s.actionIcon}><Plus size={15} color="#fff" strokeWidth={2.5} /></View>
              <Text style={s.actionTxt}>Log a drink</Text>
            </View>
            <Text style={s.actionSub}>›</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity style={s.actionRow} onPress={() => setShowDetails(true)} activeOpacity={0.8}>
            <View style={s.actionRowLeft}>
              <View style={s.actionIcon}><Text style={{ fontSize: 13, color: "#fff" }}>↗</Text></View>
              <Text style={s.actionTxt}>View details</Text>
            </View>
            <Text style={s.actionSub}>›</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity style={s.actionRow} onPress={() => router.push("/explore")} activeOpacity={0.8}>
            <View style={s.actionRowLeft}>
              <View style={s.actionIcon}><Coffee size={14} color="#fff" strokeWidth={1.8} /></View>
              <Text style={s.actionTxt}>Explore drinks</Text>
            </View>
            <Text style={s.actionSub}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <LogSheet
        visible={showLog}
        onClose={() => setShowLog(false)}
        session={session}
        fetchLogs={fetchLogs}
      />
      <DetailsSheet
        visible={showDetails}
        onClose={() => setShowDetails(false)}
        logs={logs}
        fetchLogs={fetchLogs}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f2f2" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12,
  },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle:  { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  appName:     { fontSize: 15, fontWeight: "800", color: "#111", letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: "#aaa", marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 2, backgroundColor: "#fff", borderRadius: 22, paddingHorizontal: 4, paddingVertical: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  actionBtn:   { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16 },

  content: { paddingHorizontal: 16, paddingBottom: 110 },

  dateRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  dateText:    { fontSize: 13, color: "#999", fontWeight: "500" },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0f0f0", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#e0e0e0" },
  streakText:  { fontSize: 11, fontWeight: "700", color: "#111" },

  // Shared card shell
  card: {
    backgroundColor: "#fff", borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 18,
    marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },

  // Card band (dark top)
  cardBand:         { backgroundColor: "#111", borderRadius: 40, paddingHorizontal: 18, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch" },
  bandLabel:        { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: 1.2 },
  bandMg:           { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  bandMgUnit:       { fontSize: 12, fontWeight: "400", color: "rgba(255,255,255,0.4)" },
  bandProgressTrack:{ height: 2, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 2, marginTop: 6, marginBottom: 2, overflow: "hidden" },
  bandProgressFill: { height: 2, backgroundColor: "#fff", borderRadius: 2 },

  // Status chip (inside band — white style)
  statusChip:       { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  statusDot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  statusChipText:   { fontSize: 11, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },

  // Tile row
  tileRow:         { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 14, paddingVertical: 14 },
  tile:            { flex: 1, alignItems: "center", gap: 3 },
  tileDivider:     { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.12)" },
  tileVal:         { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
  tileUnit:        { fontSize: 10, fontWeight: "500", color: "rgba(255,255,255,0.4)" },
  tileLbl:         { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: "500" },

  tileCol:         { flex: 1, backgroundColor: "#111", borderRadius: 14, overflow: "hidden" },
  tileItem:        { flex: 1, alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12 },
  tileItemDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 14 },

  cupSection:  { flexDirection: "row", alignItems: "center", gap: 16 },
  cupLabel:    { fontSize: 11, color: "#aaa", fontWeight: "500", letterSpacing: 0.2 },
  limitNote:   { fontSize: 12, color: "#bbb", fontWeight: "500", marginTop: 4 },
  heroMg:        { fontSize: 38, fontWeight: "800", color: "#111", letterSpacing: -1.5, lineHeight: 42 },
  heroMgUnit:    { fontSize: 15, fontWeight: "500", color: "#bbb" },
  progressTrack: { height: 4, backgroundColor: "#f0f0f0", borderRadius: 4, marginTop: 8, overflow: "hidden" },
  progressFill:  { height: 4, backgroundColor: "#111", borderRadius: 4 },

  divider:     { height: 1, backgroundColor: "#f2f2f2", marginVertical: 14 },

  // Stats
  statsRow:    { flexDirection: "row", alignItems: "center" },
  statCol:     { flex: 1, alignItems: "center", gap: 3 },
  statSep:     { width: 1, height: 26, backgroundColor: "#efefef" },
  statVal:     { fontSize: 15, fontWeight: "700", color: "#111" },
  statValSm:   { fontSize: 11, fontWeight: "500", color: "#bbb" },
  statLbl:     { fontSize: 11, color: "#bbb", fontWeight: "500" },

  // Cutoff
  cutoffRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  cutoffText:  { fontSize: 12, color: "#aaa" },
  cutoffTime:  { fontWeight: "600", color: "#555" },

  // Section headers
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 8 },
  sectionTitle:  { fontSize: 13, fontWeight: "700", color: "#111" },
  sectionHint:   { fontSize: 12, color: "#bbb" },

  // Log form
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: "#f0f0f0", paddingHorizontal: 14, fontSize: 14, color: "#111", backgroundColor: "#fafafa" },
  dropdown: { position: "absolute", top: 48, left: 0, right: 0, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#f0f0f0", zIndex: 20, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  dropRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  dropBorder:{ borderBottomWidth: 1, borderBottomColor: "#f8f8f8" },
  dropName:  { fontSize: 14, color: "#111", flex: 1 },
  dropMg:    { fontSize: 12, color: "#bbb", fontWeight: "600" },

  selectedRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  selectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#111" },
  selectedName:{ flex: 1, fontSize: 13, fontWeight: "600", color: "#111" },
  selectedMg:  { fontSize: 12, color: "#aaa", fontWeight: "600" },

  controlRow:  { flexDirection: "row", gap: 10, marginTop: 14 },
  controlCol:  { flex: 1, gap: 6 },
  controlLbl:  { fontSize: 11, fontWeight: "600", color: "#bbb", letterSpacing: 0.4 },
  stepper:     { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#f0f0f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#fafafa" },
  stepBtn:     { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  stepVal:     { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "700", color: "#111" },

  logBtn:      { height: 46, borderRadius: 12, backgroundColor: "#111", alignItems: "center", justifyContent: "center", marginTop: 14 },
  logBtnOff:   { backgroundColor: "#f0f0f0" },
  logBtnTxt:   { fontSize: 14, fontWeight: "700", color: "#fff" },
  logBtnTxtOff:{ color: "#ccc" },

  // Log list
  logRow:   { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  logDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: "#e0e0e0" },
  rowDivider:{ height: 1, backgroundColor: "#f8f8f8" },
  logName:  { fontSize: 13, fontWeight: "600", color: "#111" },
  logMeta:  { fontSize: 11, color: "#c0c0c0", marginTop: 2, fontWeight: "500" },
  logMg:    { fontSize: 13, fontWeight: "700", color: "#111" },
  empty:    { fontSize: 13, color: "#d0d0d0", textAlign: "center", paddingVertical: 20, fontWeight: "500" },
  logError:   { fontSize: 12, color: "#ef4444", textAlign: "center", marginTop: 8 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },

  detailsBtn: {
    backgroundColor: "#fff", borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 14, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  detailsBtnTxt: { fontSize: 14, fontWeight: "700", color: "#111" },
  detailsBtnSub: { fontSize: 12, color: "#aaa", fontWeight: "500" },

  logTrigger: {
    backgroundColor: "#111", borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 12,
  },
  logTriggerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logTriggerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  logTriggerTxt:  { fontSize: 14, fontWeight: "700", color: "#fff" },
  logTriggerSub:  { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: "500" },

  actionsCard:  { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  actionRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 16 },
  actionRowLeft:{ flexDirection: "row", alignItems: "center", gap: 12 },
  actionIcon:   { width: 30, height: 30, borderRadius: 15, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  actionTxt:    { fontSize: 14, fontWeight: "700", color: "#111" },
  actionSub:    { fontSize: 12, color: "#bbb", fontWeight: "500" },
  actionDivider:{ height: 1, backgroundColor: "#f4f4f4", marginHorizontal: 18 },

  sparkLabel:  { fontSize: 10, fontWeight: "600", color: "#bbb", letterSpacing: 0.4, marginBottom: 6, textTransform: "uppercase" },

  insightRow:  { flexDirection: "row", alignItems: "stretch", gap: 10, marginBottom: 4 },
  insightItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f7f7f7", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  insightSep:  { width: 1, backgroundColor: "transparent" },
  insightIcon: { fontSize: 18 },
  insightLabel:{ fontSize: 10, color: "#bbb", fontWeight: "600", letterSpacing: 0.2, marginBottom: 2 },
  insightVal:  { fontSize: 13, fontWeight: "700", color: "#111" },

});

const bs = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 40,
    maxHeight: "80%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#e0e0e0", alignSelf: "center", marginBottom: 20 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tab: { flex: 1, height: 38, borderRadius: 10, backgroundColor: "#f4f4f4", alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#111" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#aaa" },
  tabTextActive: { color: "#fff" },
  content: { paddingBottom: 24 },
  sheetSub: { fontSize: 12, color: "#aaa", fontWeight: "500", marginBottom: 4 },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { fontSize: 13, color: "#d0d0d0", fontWeight: "500" },
  rowDivider: { height: 1, backgroundColor: "#f8f8f8" },
  logRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 10 },
  logName: { fontSize: 13, fontWeight: "600", color: "#111" },
  logMeta: { fontSize: 11, color: "#c0c0c0", marginTop: 2, fontWeight: "500" },
  logMg: { fontSize: 13, fontWeight: "700", color: "#111" },
});

const ls = StyleSheet.create({
  title:       { fontSize: 17, fontWeight: "800", color: "#111", letterSpacing: -0.3, marginBottom: 20 },
  input:       { height: 46, borderRadius: 12, borderWidth: 1, borderColor: "#f0f0f0", paddingHorizontal: 14, fontSize: 14, color: "#111", backgroundColor: "#fafafa", marginBottom: 4 },
  dropdown:    { position: "absolute", top: 50, left: 0, right: 0, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#f0f0f0", zIndex: 20, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  dropRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13 },
  dropBorder:  { borderBottomWidth: 1, borderBottomColor: "#f8f8f8" },
  dropName:    { fontSize: 14, color: "#111", flex: 1 },
  dropMg:      { fontSize: 12, color: "#bbb", fontWeight: "600" },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f5f5f5" },
  selectedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#111" },
  selectedName:{ flex: 1, fontSize: 13, fontWeight: "600", color: "#111" },
  selectedMg:  { fontSize: 12, color: "#aaa", fontWeight: "600" },
  controlRow:  { flexDirection: "row", gap: 10, marginTop: 16 },
  controlCol:  { flex: 1, gap: 6 },
  controlLbl:  { fontSize: 11, fontWeight: "600", color: "#bbb", letterSpacing: 0.4 },
  stepper:     { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#f0f0f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#fafafa" },
  stepBtn:     { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  stepVal:     { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "700", color: "#111" },
  logBtn:      { height: 48, borderRadius: 13, backgroundColor: "#111", alignItems: "center", justifyContent: "center", marginTop: 20 },
  logBtnOff:   { backgroundColor: "#f0f0f0" },
  logBtnTxt:   { fontSize: 14, fontWeight: "700", color: "#fff" },
  logBtnTxtOff:{ color: "#ccc" },
  logError:    { fontSize: 12, color: "#ef4444", textAlign: "center", marginTop: 8 },
});
