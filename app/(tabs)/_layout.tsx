import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Icon, Label } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="cup.and.saucer" />
        <Label>Today</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="log">
        <Icon sf="plus.circle" />
        <Label>Log</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Icon sf="gearshape" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
