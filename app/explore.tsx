import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, Modal, Pressable, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X, Heart, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react-native";
import { supabase } from "@/utils/supabase";
import coffeeData from "@/constants/coffee_data.json";
import { useRouter } from "expo-router";

const W = Dimensions.get("window").width;
const SIDEBAR_FULL = 88;
const SIDEBAR_MINI = 48;

type Drink = {
  id: string; name: string; description: string;
  caffeine_mg: { min: number; max: number; typical: number };
  serving_ml: number; serving_oz: number;
  caffeine_level: string; pct_daily_limit: number;
  served_hot: boolean; served_iced: boolean;
  milk: boolean; origin: string | null;
};

type Category = { id: string; label: string; drinks: Drink[] };

const CATEGORIES: Category[] = (coffeeData as any).categories;
const ALL_DRINKS: Drink[] = CATEGORIES.flatMap(c => c.drinks);

const LEVEL_LABEL: Record<string, string> = {
  "very low": "Very Low", "low": "Low", "moderate": "Moderate",
  "high": "High", "very high": "Very High", "extreme": "Extreme",
};

const CAT_SHORT: Record<string, string> = {
  espresso_based:    "ESP",
  brewed_filter:     "BRW",
  cold_brew:         "CBR",
  iced_espresso:     "ICE",
  blended_specialty: "BLD",
  instant_low_caff:  "INS",
};

const CAT_LABEL_SHORT: Record<string, string> = {
  espresso_based:    "Espresso",
  brewed_filter:     "Brewed",
  cold_brew:         "Cold Brew",
  iced_espresso:     "Iced",
  blended_specialty: "Blended",
  instant_low_caff:  "Instant",
};

// ── Drink Detail Modal ───────────────────────────────────────
function DrinkModal({ drink, visible, onClose, onLog, favourites, onToggleFav }: {
  drink: Drink | null; visible: boolean; onClose: () => void;
  onLog: (d: Drink) => void; favourites: Set<string>; onToggleFav: (id: string) => void;
}) {
  if (!drink) return null;
  const isFav = favourites.has(drink.id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={md.sheet}>
        <View style={md.handle} />
        <View style={md.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={md.name}>{drink.name}</Text>
            <Text style={md.origin}>{drink.origin ?? "Unknown origin"}</Text>
          </View>
          <TouchableOpacity onPress={() => onToggleFav(drink.id)} style={md.iconBtn} activeOpacity={0.7}>
            <Heart size={18} color="#111" fill={isFav ? "#111" : "none"} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={md.iconBtn} activeOpacity={0.7}>
            <X size={18} color="#bbb" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
          <View style={md.cafCard}>
            <View style={md.cafItem}>
              <Text style={md.cafNum}>{drink.caffeine_mg.min}</Text>
              <Text style={md.cafLbl}>min</Text>
            </View>
            <View style={md.cafSep} />
            <View style={[md.cafItem, { flex: 1.4 }]}>
              <Text style={[md.cafNum, { fontSize: 34 }]}>{drink.caffeine_mg.typical}</Text>
              <Text style={md.cafLbl}>typical mg</Text>
            </View>
            <View style={md.cafSep} />
            <View style={md.cafItem}>
              <Text style={md.cafNum}>{drink.caffeine_mg.max}</Text>
              <Text style={md.cafLbl}>max</Text>
            </View>
          </View>
          <View style={md.metaCard}>
            {[
              ["Caffeine level", LEVEL_LABEL[drink.caffeine_level]],
              ["Serving", `${drink.serving_ml} ml`],
              ["Temperature", [drink.served_hot && "Hot", drink.served_iced && "Iced"].filter(Boolean).join(", ")],
              ["Milk", drink.milk ? "Yes" : "No"],
              ["Daily limit", `${drink.pct_daily_limit}% of 400mg`],
              ...(drink.origin ? [["Origin", drink.origin]] : []),
            ].map(([k, v], i, arr) => (
              <View key={k} style={[md.metaRow, i < arr.length - 1 && md.metaRowBorder]}>
                <Text style={md.metaKey}>{k}</Text>
                <Text style={md.metaVal}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={md.desc}>{drink.description}</Text>
          <TouchableOpacity style={md.logBtn} onPress={() => { onLog(drink); onClose(); }} activeOpacity={0.85}>
            <Text style={md.logBtnTxt}>Add to today's log</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────
export default function ExploreScreen() {
  const router = useRouter();
  const mainScrollRef = useRef<ScrollView>(null);

  const [activeCatId, setActiveCatId] = useState(CATEGORIES[0].id);
  const [query, setQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(SIDEBAR_FULL)).current;

  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [activeDrink, setActiveDrink] = useState<Drink | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  function toggleSidebar() {
    const toValue = sidebarCollapsed ? SIDEBAR_FULL : SIDEBAR_MINI;
    Animated.spring(sidebarAnim, { toValue, damping: 20, stiffness: 200, useNativeDriver: false }).start();
    setSidebarCollapsed(c => !c);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) return;
      setSession(s); setUserId(s.user.id);
      supabase.from("favourites").select("drink_id").eq("user_id", s.user.id).then(({ data }) => {
        if (data) setFavourites(new Set(data.map((r: any) => r.drink_id)));
      });
    });
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    if (!userId) return;
    const next = new Set(favourites);
    if (next.has(id)) {
      next.delete(id);
      await supabase.from("favourites").delete().eq("user_id", userId).eq("drink_id", id);
    } else {
      next.add(id);
      await supabase.from("favourites").insert({ user_id: userId, drink_id: id });
    }
    setFavourites(next);
  }, [userId, favourites]);

  const logDrink = useCallback(async (drink: Drink) => {
    if (!session) return;
    await supabase.from("daily_logs").insert({
      user_id: session.user.id, drink_name: drink.name,
      caffeine_mg: drink.caffeine_mg.typical, quantity: 1,
      consumed_at: new Date().toISOString(),
    });
  }, [session]);

  const activeCat = CATEGORIES.find(c => c.id === activeCatId) ?? CATEGORIES[0];

  const displayDrinks = useMemo(() => {
    if (query.trim()) return ALL_DRINKS.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
    return activeCat.drinks;
  }, [query, activeCat]);

  function selectCategory(id: string) {
    setActiveCatId(id);
    setQuery("");
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const sidebarW = sidebarCollapsed ? SIDEBAR_MINI : SIDEBAR_FULL;
  const CARD_W = (W - sidebarW - 32) / 2;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color="#111" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.title}>Explore</Text>
        <View style={s.searchBox}>
          <Search size={13} color="#c0c0c0" strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search…"
            placeholderTextColor="#ccc"
            value={query}
            onChangeText={setQuery}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={12} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Body */}
      <View style={s.body}>

        {/* Sidebar */}
        <Animated.View style={[s.sidebar, { width: sidebarAnim }]}>
          <TouchableOpacity style={s.collapseBtn} onPress={toggleSidebar} activeOpacity={0.6}>
            {sidebarCollapsed
              ? <ChevronRight size={14} color="#999" strokeWidth={2.5} />
              : <ChevronLeft size={14} color="#999" strokeWidth={2.5} />}
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {CATEGORIES.map(cat => {
              const active = cat.id === activeCatId && !query;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catItem, active && s.catItemActive]}
                  onPress={() => selectCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  {active && <View style={s.catBar} />}
                  <View style={[s.catBadge, active && s.catBadgeActive]}>
                    <Text style={[s.catBadgeTxt, active && s.catBadgeTxtActive]}>
                      {CAT_SHORT[cat.id]}
                    </Text>
                  </View>
                  {!sidebarCollapsed && (
                    <Text style={[s.catLabel, active && s.catLabelActive]} numberOfLines={1}>
                      {CAT_LABEL_SHORT[cat.id]}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Main */}
        <ScrollView
          ref={mainScrollRef}
          style={s.main}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 6 }}
        >
          {/* Section header */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {query.trim() ? `"${query}"` : CAT_LABEL_SHORT[activeCatId]}
            </Text>
            <Text style={s.sectionCount}>{displayDrinks.length}</Text>
          </View>

          {displayDrinks.length === 0 ? (
            <Text style={s.empty}>No drinks found</Text>
          ) : (
            <View style={s.grid}>
              {displayDrinks.map(drink => (
                <TouchableOpacity
                  key={drink.id}
                  style={[s.card, { width: CARD_W }]}
                  onPress={() => { setActiveDrink(drink); setShowDetail(true); }}
                  activeOpacity={0.75}
                >
                  <View style={s.cardTop}>
                    <View style={s.levelDot} />
                    <Text style={s.levelTxt}>{LEVEL_LABEL[drink.caffeine_level]}</Text>
                  </View>
                  <Text style={s.cardName} numberOfLines={2}>{drink.name}</Text>
                  <Text style={s.cardMg}>
                    {drink.caffeine_mg.typical}
                    <Text style={s.cardMgUnit}> mg</Text>
                  </Text>
                  <View style={s.cardFooter}>
                    <Text style={s.cardTemp}>
                      {drink.served_hot && drink.served_iced ? "Hot · Iced" : drink.served_hot ? "Hot" : "Iced"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => toggleFav(drink.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Heart
                        size={12}
                        color={favourites.has(drink.id) ? "#111" : "#ddd"}
                        fill={favourites.has(drink.id) ? "#111" : "none"}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <DrinkModal
        drink={activeDrink} visible={showDetail}
        onClose={() => setShowDetail(false)}
        onLog={logDrink} favourites={favourites} onToggleFav={toggleFav}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f7f7f7" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10,
    backgroundColor: "#f7f7f7",
  },
  backBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: "#ececec", alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 16, fontWeight: "800", color: "#111", letterSpacing: -0.3 },
  searchBox:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#f0f0f0" },
  searchInput:{ flex: 1, fontSize: 13, color: "#111", padding: 0 },

  body:    { flex: 1, flexDirection: "row" },

  sidebar: { backgroundColor: "#fff", borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "#e8e8e8", overflow: "hidden" },
  collapseBtn: { height: 40, alignItems: "center", justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" },

  catItem:       { alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, position: "relative" },
  catItemActive: { backgroundColor: "#fafafa" },
  catBar:        { position: "absolute", left: 0, top: 12, bottom: 12, width: 2.5, borderRadius: 2, backgroundColor: "#111" },
  catBadge:      { width: 34, height: 26, borderRadius: 6, backgroundColor: "#f2f2f2", alignItems: "center", justifyContent: "center", marginBottom: 5 },
  catBadgeActive:{ backgroundColor: "#111" },
  catBadgeTxt:   { fontSize: 8, fontWeight: "800", color: "#999", letterSpacing: 0.5 },
  catBadgeTxtActive: { color: "#fff" },
  catLabel:      { fontSize: 9.5, fontWeight: "500", color: "#aaa", textAlign: "center" },
  catLabelActive:{ color: "#111", fontWeight: "700" },

  main:    { flex: 1, backgroundColor: "#f7f7f7" },

  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: "800", color: "#111", letterSpacing: -0.3 },
  sectionCount:  { fontSize: 12, fontWeight: "500", color: "#bbb" },

  grid:  { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, gap: 8 },
  card:  {
    backgroundColor: "#fff", borderRadius: 14, padding: 13,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTop:    { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  levelDot:   { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#d0d0d0" },
  levelTxt:   { fontSize: 9, fontWeight: "600", color: "#bbb", letterSpacing: 0.4 },
  cardName:   { fontSize: 12, fontWeight: "700", color: "#111", lineHeight: 16, marginBottom: 6 },
  cardMg:     { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5, marginBottom: 8 },
  cardMgUnit: { fontSize: 11, fontWeight: "400", color: "#ccc" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTemp:   { fontSize: 10, color: "#ccc", fontWeight: "500" },

  empty: { textAlign: "center", color: "#ccc", fontSize: 13, marginTop: 60 },
});

const md = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet:    { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: "88%" },
  handle:   { width: 32, height: 3.5, borderRadius: 2, backgroundColor: "#e8e8e8", alignSelf: "center", marginBottom: 22 },
  topRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  name:     { fontSize: 20, fontWeight: "800", color: "#111", letterSpacing: -0.5, lineHeight: 26 },
  origin:   { fontSize: 12, color: "#bbb", fontWeight: "500", marginTop: 4 },
  iconBtn:  { width: 34, height: 34, alignItems: "center", justifyContent: "center" },

  cafCard:  { flexDirection: "row", alignItems: "center", backgroundColor: "#f8f8f8", borderRadius: 14, padding: 18, marginBottom: 12 },
  cafItem:  { flex: 1, alignItems: "center", gap: 4 },
  cafSep:   { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: "#e8e8e8" },
  cafNum:   { fontSize: 22, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  cafLbl:   { fontSize: 10, color: "#bbb", fontWeight: "500" },

  metaCard:     { backgroundColor: "#f8f8f8", borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  metaRow:      { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  metaRowBorder:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#efefef" },
  metaKey:      { fontSize: 13, color: "#aaa", fontWeight: "500" },
  metaVal:      { fontSize: 13, color: "#111", fontWeight: "600" },

  desc:      { fontSize: 13, color: "#888", lineHeight: 21, marginBottom: 22 },
  logBtn:    { height: 50, borderRadius: 14, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  logBtnTxt: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.2 },
});
