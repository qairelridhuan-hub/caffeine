import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Modal, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart2, Clock, Coffee, ArrowRight, X, ChevronRight } from "lucide-react-native";
import { supabase } from "@/utils/supabase";

const W = Dimensions.get("window").width;
const CARD_P = 16;

type Log = {
  id: string;
  drink_name: string;
  caffeine_mg: number;
  quantity: number;
  consumed_at: string;
};

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function dayLabel(s: string) { return new Date(s).toLocaleDateString("en-US", { weekday: "short" }); }

export default function LogDashboard() {
  const router = useRouter();
  const [logs,  setLogs]  = useState<Log[]>([]);
  const [limit, setLimit] = useState(400);
  const [modal, setModal] = useState<"intake" | "hours" | "drinks" | null>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from("profiles").select("daily_limit_mg").eq("id", session.user.id).single(),
        supabase.from("daily_logs")
          .select("id, drink_name, caffeine_mg, quantity, consumed_at")
          .eq("user_id", session.user.id)
          .gte("consumed_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("consumed_at", { ascending: true }),
      ]);
      if (p?.daily_limit_mg) setLimit(p.daily_limit_mg);
      if (l) setLogs(l);
    })();
  }, []));

  const weekData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days[isoDate(d)] = 0;
    }
    logs.forEach(l => {
      const k = isoDate(new Date(l.consumed_at));
      if (k in days) days[k] += l.caffeine_mg * l.quantity;
    });
    return Object.entries(days).map(([date, mg]) => ({ date, mg: Math.round(mg) }));
  }, [logs]);

  const hourData = useMemo(() => {
    const counts = Array(24).fill(0);
    logs.forEach(l => { counts[new Date(l.consumed_at).getHours()] += l.caffeine_mg * l.quantity; });
    return counts.map((mg, h) => ({ hour: h, mg: Math.round(mg) }));
  }, [logs]);

  const topDrinks = useMemo(() => {
    const map: Record<string, { count: number; mg: number }> = {};
    logs.forEach(l => {
      if (!map[l.drink_name]) map[l.drink_name] = { count: 0, mg: l.caffeine_mg };
      map[l.drink_name].count += l.quantity;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [logs]);

  const today = weekData[weekData.length - 1]?.mg ?? 0;
  const avgWeek = Math.round(weekData.reduce((s, d) => s + d.mg, 0) / 7);
  const weekMax = Math.max(...weekData.map(d => d.mg), limit);
  const hourMax = Math.max(...hourData.map(d => d.mg), 1);
  const topMax  = topDrinks[0]?.[1].count ?? 1;

  const CARDS = [
    { key: "intake" as const,  icon: <BarChart2 size={13} color="#fff" strokeWidth={2} />, title: "Daily intake",  sub: `${today}mg today · ${avgWeek}mg avg` },
    { key: "hours"  as const,  icon: <Clock     size={13} color="#fff" strokeWidth={2} />, title: "Peak hours",    sub: logs.length ? "See when you caffeinate" : "No data yet" },
    { key: "drinks" as const,  icon: <Coffee    size={13} color="#fff" strokeWidth={2} />, title: "Most logged",   sub: topDrinks.length ? `${topDrinks[0][0]} leads` : "No data yet" },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.title}>Analytics</Text>
          <Text style={s.sub}>Last 7 days</Text>
        </View>

        {/* Summary chips */}
        <View style={s.chipRow}>
          <View style={s.chip}>
            <Text style={s.chipVal}>{today}<Text style={s.chipUnit}> mg</Text></Text>
            <Text style={s.chipLbl}>Today</Text>
          </View>
          <View style={s.chipDiv} />
          <View style={s.chip}>
            <Text style={s.chipVal}>{avgWeek}<Text style={s.chipUnit}> mg</Text></Text>
            <Text style={s.chipLbl}>Daily avg</Text>
          </View>
          <View style={s.chipDiv} />
          <View style={s.chip}>
            <Text style={s.chipVal}>{logs.length}</Text>
            <Text style={s.chipLbl}>Logged</Text>
          </View>
        </View>

        {/* Chart buttons */}
        {CARDS.map(card => (
          <TouchableOpacity key={card.key} style={s.card} onPress={() => setModal(card.key)} activeOpacity={0.75}>
            <View style={s.cardLeft}>
              <View style={s.iconBox}>{card.icon}</View>
              <View>
                <Text style={s.cardTitle}>{card.title}</Text>
                <Text style={s.cardSub}>{card.sub}</Text>
              </View>
            </View>
            <ChevronRight size={16} color="#ccc" strokeWidth={2} />
          </TouchableOpacity>
        ))}

        {/* Compare button */}
        <TouchableOpacity style={s.compareBtn} onPress={() => router.push("/compare")} activeOpacity={0.8}>
          <View>
            <Text style={s.compareBtnTitle}>Compare all drinks</Text>
            <Text style={s.compareBtnSub}>Bar · Dot · Table — 44 drinks</Text>
          </View>
          <ArrowRight size={18} color="#fff" strokeWidth={2} />
        </TouchableOpacity>

      </ScrollView>

      {/* ── Modals ── */}

      {/* Daily intake */}
      <ChartModal visible={modal === "intake"} title="Daily intake" onClose={() => setModal(null)}>
        {logs.length === 0 ? <EmptyState label="Log some drinks to see your intake" /> : (
          <View style={m.barChart}>
            <View style={[m.limitLine, { bottom: 24 + (limit / weekMax) * 110 }]} pointerEvents="none">
              <Text style={m.limitLbl}>{limit}mg</Text>
            </View>
            {weekData.map(({ date, mg }) => {
              const h = Math.max(4, (mg / weekMax) * 110);
              const isToday = date === isoDate(new Date());
              return (
                <View key={date} style={m.barCol}>
                  <Text style={m.barValLbl}>{mg > 0 ? mg : ""}</Text>
                  <View style={m.barBg}>
                    <View style={[m.barFill, { height: h }, mg > limit && { backgroundColor: "#f59e0b" }, isToday && { backgroundColor: "#111" }]} />
                  </View>
                  <Text style={[m.barDayLbl, isToday && { color: "#111", fontWeight: "700" }]}>{dayLabel(date)}</Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={m.legend}>
          <View style={m.legendItem}><View style={[m.legendDot, { backgroundColor: "#111" }]} /><Text style={m.legendTxt}>Today</Text></View>
          <View style={m.legendItem}><View style={[m.legendDot, { backgroundColor: "#f59e0b" }]} /><Text style={m.legendTxt}>Over limit</Text></View>
          <View style={m.legendItem}><View style={[m.legendDot, { backgroundColor: "#e0e0e0" }]} /><Text style={m.legendTxt}>Normal</Text></View>
        </View>
      </ChartModal>

      {/* Peak hours */}
      <ChartModal visible={modal === "hours"} title="Peak hours" onClose={() => setModal(null)}>
        {logs.length === 0 ? <EmptyState label="Log drinks to see your peak hours" /> : (
          <>
            <View style={m.hourGrid}>
              {hourData.map(({ hour, mg }) => {
                const opacity = mg === 0 ? 0.06 : 0.15 + (mg / hourMax) * 0.85;
                return (
                  <View key={hour} style={m.hourCell}>
                    <View style={[m.hourBlock, { opacity, backgroundColor: hour < 12 ? "#111" : "#f59e0b" }]} />
                    {hour % 6 === 0 && (
                      <Text style={m.hourLbl}>{hour === 0 ? "12a" : hour === 12 ? "12p" : hour > 12 ? `${hour - 12}p` : `${hour}a`}</Text>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={m.legend}>
              <View style={m.legendItem}><View style={[m.legendDot, { backgroundColor: "#111" }]} /><Text style={m.legendTxt}>AM</Text></View>
              <View style={m.legendItem}><View style={[m.legendDot, { backgroundColor: "#f59e0b" }]} /><Text style={m.legendTxt}>PM</Text></View>
            </View>
          </>
        )}
      </ChartModal>

      {/* Most logged */}
      <ChartModal visible={modal === "drinks"} title="Most logged" onClose={() => setModal(null)}>
        {topDrinks.length === 0 ? <EmptyState label="No drinks logged yet" /> : (
          <View style={m.topList}>
            {topDrinks.map(([name, { count, mg }], i) => {
              const bw = (count / topMax) * (W - 80);
              return (
                <View key={name} style={m.topRow}>
                  <Text style={m.topRank}>{i + 1}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={m.topLabelRow}>
                      <Text style={m.topName} numberOfLines={1}>{name}</Text>
                      <Text style={m.topCount}>×{count} · {mg}mg</Text>
                    </View>
                    <View style={m.topBarBg}>
                      <View style={[m.topBarFill, { width: bw }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ChartModal>

    </SafeAreaView>
  );
}

function ChartModal({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.backdrop} onPress={onClose} />
      <View style={m.sheet}>
        <View style={m.handle} />
        <View style={m.sheetHeader}>
          <Text style={m.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <X size={14} color="#888" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}

function EmptyState({ label }: { label: string }) {
  return <Text style={m.empty}>{label}</Text>;
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f2f2f2" },
  scroll: { paddingHorizontal: CARD_P, paddingBottom: 120 },

  header: { paddingTop: 12, paddingBottom: 10 },
  title:  { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.4 },
  sub:    { fontSize: 11, color: "#bbb", marginTop: 2 },

  chipRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, paddingVertical: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  chip:    { flex: 1, alignItems: "center" },
  chipDiv: { width: StyleSheet.hairlineWidth, backgroundColor: "#e8e8e8" },
  chipVal: { fontSize: 20, fontWeight: "800", color: "#111" },
  chipUnit:{ fontSize: 12, fontWeight: "500", color: "#aaa" },
  chipLbl: { fontSize: 10, color: "#bbb", marginTop: 2 },

  card:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox:  { width: 32, height: 32, borderRadius: 9, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  cardTitle:{ fontSize: 14, fontWeight: "700", color: "#111" },
  cardSub:  { fontSize: 11, color: "#bbb", marginTop: 2 },

  compareBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#111", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, marginTop: 4 },
  compareBtnTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  compareBtnSub:   { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
});

const m = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet:    { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 48, paddingTop: 14 },
  handle:   { width: 32, height: 3, borderRadius: 2, backgroundColor: "#e0e0e0", alignSelf: "center", marginBottom: 18 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  sheetTitle:  { fontSize: 16, fontWeight: "800", color: "#111", letterSpacing: -0.3 },
  closeBtn:    { width: 26, height: 26, borderRadius: 13, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" },

  empty: { fontSize: 12, color: "#ccc", textAlign: "center", paddingVertical: 24 },

  // Bar chart
  barChart:  { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 140, position: "relative", marginBottom: 12 },
  barCol:    { flex: 1, alignItems: "center", gap: 3 },
  barBg:     { flex: 1, width: "100%", justifyContent: "flex-end", backgroundColor: "#f5f5f5", borderRadius: 5, overflow: "hidden" },
  barFill:   { width: "100%", backgroundColor: "#e0e0e0", borderRadius: 5 },
  barValLbl: { fontSize: 8, color: "#bbb", fontWeight: "600" },
  barDayLbl: { fontSize: 9, color: "#bbb" },
  limitLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "#ccc" },
  limitLbl:  { position: "absolute", right: 0, fontSize: 8, color: "#bbb", top: -10 },

  // Hour heatmap
  hourGrid:  { flexDirection: "row", gap: 3, marginBottom: 12 },
  hourCell:  { flex: 1, alignItems: "center" },
  hourBlock: { width: "100%", height: 32, borderRadius: 4 },
  hourLbl:   { fontSize: 7, color: "#bbb", marginTop: 3 },

  // Top drinks
  topList:     { gap: 14 },
  topRow:      { flexDirection: "row", alignItems: "center", gap: 10 },
  topRank:     { fontSize: 11, fontWeight: "700", color: "#ddd", width: 14, textAlign: "center" },
  topLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  topName:     { fontSize: 13, fontWeight: "600", color: "#111", flex: 1 },
  topCount:    { fontSize: 11, color: "#bbb" },
  topBarBg:    { height: 5, backgroundColor: "#f0f0f0", borderRadius: 3, overflow: "hidden" },
  topBarFill:  { height: "100%" as any, backgroundColor: "#111", borderRadius: 3 },

  // Legend
  legend:     { flexDirection: "row", gap: 14, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:  { width: 6, height: 6, borderRadius: 3 },
  legendTxt:  { fontSize: 10, color: "#bbb" },
});
