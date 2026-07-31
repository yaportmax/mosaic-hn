import { Alert, Platform } from 'react-native';

export function confirmAction({
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm
}: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm(): void | Promise<void>;
}): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) void onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => void onConfirm() }
  ]);
}
