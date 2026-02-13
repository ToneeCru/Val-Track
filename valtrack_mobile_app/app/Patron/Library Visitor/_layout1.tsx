import { Stack } from 'expo-router';

export default function LibraryVisitorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
