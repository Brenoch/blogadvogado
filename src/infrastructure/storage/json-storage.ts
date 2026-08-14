export class JsonStorage {
  public constructor(private readonly storage: Storage) {}

  public get<T>(key: string, fallback: T): T {
    try {
      const value = this.storage.getItem(key);
      return value ? JSON.parse(value) as T : fallback;
    } catch {
      return fallback;
    }
  }

  public set<T>(key: string, value: T): void {
    try {
      this.storage.setItem(key, JSON.stringify(value));
    } catch {
      // Supabase remains the source of truth.
    }
  }

  public remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      // Storage may be blocked by the browser.
    }
  }
}

export const localJsonStorage = new JsonStorage(localStorage);
export const sessionJsonStorage = new JsonStorage(sessionStorage);
