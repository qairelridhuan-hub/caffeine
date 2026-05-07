import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import Svg, { Path, Rect, Defs, ClipPath } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Coffee,
  Target,
  TrendingUp,
  Zap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";

const { width } = Dimensions.get("window");
const AnimatedRect = Animated.createAnimatedComponent(Rect);

function AnimatedCoffeeCup({
  fillAnim,
  stroke = "white",
  fill = "rgba(255,255,255,0.85)",
  clipId = "cupInterior",
  size = 90,
}: {
  fillAnim: Animated.Value;
  stroke?: string;
  fill?: string;
  clipId?: string;
  size?: number;
}) {
  const INTERIOR_TOP = 44;
  const INTERIOR_BOTTOM = 90;
  const INTERIOR_H = INTERIOR_BOTTOM - INTERIOR_TOP;

  const fillHeight = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0, INTERIOR_H] });
  const fillY      = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [INTERIOR_BOTTOM, INTERIOR_TOP] });

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clipId}>
          {/* cup interior */}
          <Path d="M 18 44 L 72 44 L 72 88 Q 72 91 69 91 L 21 91 Q 18 91 18 88 Z" />
        </ClipPath>
      </Defs>

      {/* Coffee fill */}
      <AnimatedRect x={18} y={fillY} width={54} height={fillHeight} fill={fill} clipPath={`url(#${clipId})`} />

      {/* Cup body */}
      <Path
        d="M 15 41 L 75 41 L 75 88 Q 75 93 70 93 L 20 93 Q 15 93 15 88 Z"
        stroke={stroke} strokeWidth={2.2} fill="none" strokeLinejoin="round"
      />

      {/* Handle */}
      <Path
        d="M 75 54 C 95 54 95 78 75 78"
        stroke={stroke} strokeWidth={2.2} fill="none" strokeLinecap="round"
      />

      {/* Steam wisps */}
      <Path d="M 32 37 Q 28 30 32 23 Q 36 16 32 9"  stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
      <Path d="M 45 35 Q 41 28 45 21 Q 49 14 45 7"  stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
      <Path d="M 58 37 Q 54 30 58 23 Q 62 16 58 9"  stroke={stroke} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}

const SLIDES = [
  {
    id: "1",
    Icon: Coffee,
    tag: "WELCOME",
    title: "Your caffeine\ncompanion",
    sub: "Caffeine is the world's most used stimulant. This app helps you stay informed and in control of your daily intake.",
  },
  {
    id: "2",
    Icon: Zap,
    tag: "LOG",
    title: "Log every\ndrink instantly",
    sub: "From espresso to energy drinks — search or tap to add any beverage. We've got the caffeine numbers ready for you.",
  },
  {
    id: "3",
    Icon: Target,
    tag: "LIMITS",
    title: "Know your\nsafe limit",
    sub: "Health experts recommend no more than 400 mg of caffeine per day. We'll track where you are against that limit in real time.",
  },
  {
    id: "4",
    Icon: TrendingUp,
    tag: "INSIGHTS",
    title: "Spot your\npatterns",
    sub: "See how your intake changes day to day. Understand your habits so you can make smarter choices without giving up what you love.",
  },
  {
    id: "5",
    Icon: ShieldCheck,
    tag: "HEALTH",
    title: "Feel better,\ndrink smarter",
    sub: "Too much caffeine causes anxiety, poor sleep, and crashes. Track it, manage it, and feel the difference.",
  },
];

type Phase = "slides" | "splash";

export default function Onboarding() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("slides");
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const busy = useRef(false);
  const dirRef = useRef<1 | -1>(1);

  // Outgoing layer
  const outX = useRef(new Animated.Value(0)).current;
  const outO = useRef(new Animated.Value(1)).current;
  // Incoming layer
  const inX  = useRef(new Animated.Value(0)).current;
  const inO  = useRef(new Animated.Value(0)).current;

  // Slide 1 coffee fill
  const slideFillAnim = useRef(new Animated.Value(0)).current;

  // Splash animations
  const logoScale    = useRef(new Animated.Value(0.4)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const wordOpacity  = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity   = useRef(new Animated.Value(0)).current;
  const btnTranslate = useRef(new Animated.Value(20)).current;
  const fillAnim     = useRef(new Animated.Value(0)).current;

  // Mount: show slide 0 fully + start fill
  useEffect(() => {
    inO.setValue(1);
    Animated.timing(slideFillAnim, { toValue: 1, duration: 1000, delay: 400, useNativeDriver: false }).start();
  }, []);

  // Start transition after prevIndex is set
  useEffect(() => {
    if (prevIndex === null) return;
    const dir = dirRef.current;
    const DIST = width;

    outX.setValue(0);   outO.setValue(1);
    inX.setValue(dir * DIST); inO.setValue(1);

    Animated.parallel([
      Animated.timing(outX, { toValue: dir * -DIST, duration: 320, useNativeDriver: true }),
      Animated.timing(inX,  { toValue: 0,           duration: 320, useNativeDriver: true }),
    ]).start(() => {
      setPrevIndex(null);
      busy.current = false;
      if (index === 0) {
        slideFillAnim.setValue(0);
        Animated.timing(slideFillAnim, { toValue: 1, duration: 1000, delay: 150, useNativeDriver: false }).start();
      }
    });
  }, [prevIndex]);

  function goTo(next: number, dir: 1 | -1) {
    if (busy.current) return;
    busy.current = true;
    dirRef.current = dir;
    setPrevIndex(index);
    setIndex(next);
  }

  function handleNext() {
    if (index < SLIDES.length - 1) {
      goTo(index + 1, 1);
    } else {
      setPhase("splash");
    }
  }

  function handlePrev() {
    if (index > 0) goTo(index - 1, -1);
  }

  useEffect(() => {
    if (phase !== "splash") return;

    fillAnim.setValue(0);
    Animated.timing(splashOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.timing(fillAnim, { toValue: 1, duration: 1000, delay: 300, useNativeDriver: false }).start();
    Animated.timing(wordOpacity, { toValue: 1, duration: 600, delay: 1200, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(btnTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 2200);
  }, [phase]);

  async function finish() {
    await AsyncStorage.setItem("onboarded", "1");
    router.replace("/(tabs)");
  }

  const slide = SLIDES[index];
  const Icon = slide.Icon;

  if (phase === "slides") {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />

        {/* Arrows + dots */}
        <View style={styles.arrowRow}>
          <TouchableOpacity style={styles.arrowBtn} onPress={handlePrev} activeOpacity={0.7} disabled={index === 0}>
            <ChevronLeft color={index === 0 ? "#ccc" : "#000"} size={22} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            style={styles.arrowBtn}
            onPress={() => index < SLIDES.length - 1 && goTo(index + 1, 1)}
            activeOpacity={0.7}
            disabled={index === SLIDES.length - 1}
          >
            <ChevronRight color={index === SLIDES.length - 1 ? "#ccc" : "#000"} size={22} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Slide layers — outgoing + incoming animate simultaneously */}
        <View style={styles.slideArea}>
          {/* Outgoing slide */}
          {prevIndex !== null && (() => {
            const prev = SLIDES[prevIndex];
            const PrevIcon = prev.Icon;
            return (
              <Animated.View style={[styles.slideInner, styles.slideAbsolute, { opacity: outO, transform: [{ translateX: outX }] }]}>
                <Text style={styles.tag}>{prev.tag}</Text>
                <View style={styles.iconRing}>
                  {prevIndex === 0
                    ? <AnimatedCoffeeCup fillAnim={slideFillAnim} stroke="#000" fill="rgba(0,0,0,0.1)" clipId="slideCupOut" size={68} />
                    : <PrevIcon color="#000" size={42} strokeWidth={1.2} />}
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.title}>{prev.title}</Text>
                  <Text style={styles.sub}>{prev.sub}</Text>
                </View>
              </Animated.View>
            );
          })()}

          {/* Incoming slide */}
          <Animated.View style={[styles.slideInner, styles.slideAbsolute, { opacity: inO, transform: [{ translateX: inX }] }]}>
            <Text style={styles.tag}>{slide.tag}</Text>
            <View style={styles.iconRing}>
              {index === 0
                ? <AnimatedCoffeeCup fillAnim={slideFillAnim} stroke="#000" fill="rgba(0,0,0,0.1)" clipId="slideCup" />
                : <Icon color="#000" size={42} strokeWidth={1.2} />}
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.sub}>{slide.sub}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Bottom buttons */}
        <View style={styles.bottom}>
          <TouchableOpacity onPress={() => setPhase("splash")} activeOpacity={0.6}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} activeOpacity={0.6}>
            <Text style={styles.nextText}>
              {index === SLIDES.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Splash
  return (
    <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
      <StatusBar style="light" />
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
        <AnimatedCoffeeCup fillAnim={fillAnim} />
      </Animated.View>
      <Animated.View style={[styles.splashWords, { opacity: wordOpacity }]}>
        <Text style={styles.splashTitle}>caffeine</Text>
        <Text style={styles.splashSub}>track what you drink</Text>
      </Animated.View>
      <Animated.View style={{ opacity: btnOpacity, transform: [{ translateY: btnTranslate }], width: "100%" }}>
        <TouchableOpacity style={styles.continueBtn} onPress={finish} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  arrowBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  dots: { flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e0e0e0" },
  dotActive: { width: 22, backgroundColor: "#000", borderRadius: 3 },

  slideArea: {
    flex: 1,
    overflow: "hidden",
  },
  slideAbsolute: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  slideInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
    paddingBottom: 60,
  },
  tag: { fontSize: 10, fontWeight: "700", color: "#999", letterSpacing: 2, textAlign: "center" },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { gap: 8, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#000", letterSpacing: -0.8, lineHeight: 34, textAlign: "center" },
  sub: { fontSize: 13, color: "#666", lineHeight: 21, textAlign: "center" },

  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  skipText: { fontSize: 15, fontWeight: "500", color: "#999" },
  nextText: { fontSize: 15, fontWeight: "700", color: "#000" },

  splash: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  splashWords: { alignItems: "center", gap: 6 },
  splashTitle: { fontSize: 36, fontWeight: "700", color: "#fff", letterSpacing: -0.5 },
  splashSub: { fontSize: 14, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  continueBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  continueBtnText: { fontSize: 16, fontWeight: "600", color: "#fff", letterSpacing: 0.3 },
});
