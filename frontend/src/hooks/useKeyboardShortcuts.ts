import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const toggleChatSidebar = useAppStore((state) => state.toggleChatSidebar);
  const toggleFocusMode = useAppStore((state) => state.toggleFocusMode);
  const toggleStagingExpanded = useAppStore((state) => state.toggleStagingExpanded);
  const saveProject = useAppStore((state) => state.saveProject);
  const closeMetadataPanel = useAppStore((state) => state.closeMetadataPanel);
  const metadataPanelKey = useAppStore((state) => state.metadataPanelKey);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur from inputs
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Define shortcuts
      const shortcuts: ShortcutConfig[] = [
        {
          key: 's',
          ctrl: true,
          action: () => {
            saveProject().catch(console.error);
          },
          description: 'Save project',
        },
        {
          key: '/',
          ctrl: true,
          action: toggleChatSidebar,
          description: 'Toggle AI chat',
        },
        {
          key: 's',
          ctrl: true,
          shift: true,
          action: toggleStagingExpanded,
          description: 'Toggle staging area',
        },
        {
          key: 'Escape',
          action: () => {
            // Close any open panels
            if (metadataPanelKey) {
              closeMetadataPanel();
            }
          },
          description: 'Close panels',
        },
        {
          key: 'f',
          action: toggleFocusMode,
          description: 'Toggle focus mode',
        },
      ];

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [toggleChatSidebar, toggleFocusMode, toggleStagingExpanded, saveProject, closeMetadataPanel, metadataPanelKey]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Export shortcut list for displaying in UI (help modal, tooltips, etc.)
export const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl+S', description: 'Save project' },
  { keys: 'Ctrl+/', description: 'Toggle AI chat' },
  { keys: 'Ctrl+Shift+S', description: 'Toggle staging area' },
  { keys: 'F', description: 'Toggle focus mode' },
  { keys: 'Escape', description: 'Close panels / Deselect' },
];
