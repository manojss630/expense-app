import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const STORAGE_DIR = `${FileSystem.documentDirectory || ''}app_storage/`;

/**
 * Standard persistent storage using @react-native-async-storage/async-storage
 * with sandboxed file-system fallback for cross-platform resilience.
 */
export const mobileStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // Fall through to file-system fallback
    }

    try {
      const fileUri = `${STORAGE_DIR}${key}.json`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        const fileVal = await FileSystem.readAsStringAsync(fileUri);
        try {
          await AsyncStorage.setItem(key, fileVal);
        } catch {}
        return fileVal;
      }
    } catch {}

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('[Storage] AsyncStorage setItem error:', e);
    }

    try {
      const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
      }
      await FileSystem.writeAsStringAsync(`${STORAGE_DIR}${key}.json`, value);
    } catch {}
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] AsyncStorage removeItem error:', e);
    }

    try {
      const fileUri = `${STORAGE_DIR}${key}.json`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
    } catch {}
  },
};

