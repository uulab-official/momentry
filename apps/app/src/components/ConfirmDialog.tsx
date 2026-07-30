import { StyleSheet, Text, View } from 'react-native';

import { AnimatedDialog } from '@/src/components/AnimatedDialog';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { palette } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

/** Product-styled confirmation and notice dialog shared by recoverable app flows. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const { colors } = useAppTheme();
  const close = onCancel ?? onConfirm;

  return (
    <AnimatedDialog
      visible={visible}
      dismissible={Boolean(onCancel) && !busy}
      onRequestClose={() => {
        if (!busy) close();
      }}
      dialogStyle={[styles.dialog, { backgroundColor: colors.surface }]}
    >
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      <View style={styles.actions}>
        {cancelLabel && onCancel ? (
          <AnimatedPressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onCancel}
            style={[styles.button, { backgroundColor: colors.surfaceMuted, opacity: busy ? 0.45 : 1 }]}
            pressedOpacity={0.72}
            scaleTo={0.98}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>{cancelLabel}</Text>
          </AnimatedPressable>
        ) : null}
        <AnimatedPressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onConfirm}
          style={[
            styles.button,
            {
              backgroundColor: destructive ? palette.danger : colors.primary,
              opacity: busy ? 0.65 : 1,
            },
          ]}
          pressedOpacity={0.84}
          scaleTo={0.98}
        >
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </AnimatedPressable>
      </View>
    </AnimatedDialog>
  );
}

const styles = StyleSheet.create({
  dialog: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 22 },
  title: { fontSize: 20, fontWeight: '900' },
  message: { fontSize: 14, lineHeight: 21, marginTop: 9 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  button: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  cancelText: { fontSize: 14, fontWeight: '800' },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
