type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  tags: string[];
};

type CacheStore = {
  entries: Map<string, CacheEntry<unknown>>;
  tagIndex: Map<string, Set<string>>;
  inflight: Map<string, Promise<unknown>>;
};

const globalForCache = globalThis as unknown as {
  __sitecoderKvCache?: CacheStore;
};

const store: CacheStore = globalForCache.__sitecoderKvCache ?? {
  entries: new Map(),
  tagIndex: new Map(),
  inflight: new Map(),
};

globalForCache.__sitecoderKvCache = store;

export type CacheOptions = {
  ttlMs: number;
  tags?: string[];
};

function indexTags(key: string, tags: string[]) {
  for (const tag of tags) {
    const keys = store.tagIndex.get(tag) ?? new Set<string>();
    keys.add(key);
    store.tagIndex.set(tag, keys);
  }
}

function removeFromIndexes(key: string, tags: string[]) {
  for (const tag of tags) {
    const keys = store.tagIndex.get(tag);
    if (!keys) continue;
    keys.delete(key);
    if (keys.size === 0) {
      store.tagIndex.delete(tag);
    }
  }
}

export async function kvRemember<T>(
  key: string,
  options: CacheOptions,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = store.entries.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inflight = store.inflight.get(key) as Promise<T> | undefined;
  if (inflight) {
    return inflight;
  }

  const promise = fetcher()
    .then((value) => {
      const tags = options.tags ?? [];
      if (cached) {
        removeFromIndexes(key, cached.tags);
      }
      store.entries.set(key, {
        value,
        tags,
        expiresAt: Date.now() + options.ttlMs,
      });
      indexTags(key, tags);
      return value;
    })
    .finally(() => {
      store.inflight.delete(key);
    });

  store.inflight.set(key, promise);
  return promise;
}

export function kvDelete(key: string) {
  const entry = store.entries.get(key);
  if (!entry) return;

  removeFromIndexes(key, entry.tags);
  store.entries.delete(key);
}

export function kvInvalidateTag(tag: string) {
  const keys = Array.from(store.tagIndex.get(tag) ?? []);
  for (const key of keys) {
    kvDelete(key);
  }
}

export function kvInvalidateTags(tags: string[]) {
  for (const tag of tags) {
    kvInvalidateTag(tag);
  }
}

export function kvClearPrefix(prefix: string) {
  for (const key of Array.from(store.entries.keys())) {
    if (key.startsWith(prefix)) {
      kvDelete(key);
    }
  }
}

export function kvStats() {
  return {
    entries: store.entries.size,
    tags: store.tagIndex.size,
    inflight: store.inflight.size,
  };
}
