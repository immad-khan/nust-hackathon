type MemoryUpload = {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  createdAt: Date;
};

const globalForStore = globalThis as typeof globalThis & {
  __memoryStore?: {
    uploads: MemoryUpload[];
    nextUploadId: number;
  };
};

function getStore() {
  if (!globalForStore.__memoryStore) {
    globalForStore.__memoryStore = {
      uploads: [],
      nextUploadId: 1,
    };
  }

  return globalForStore.__memoryStore;
}

export function addMemoryUpload(payload: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
}): MemoryUpload {
  const store = getStore();
  const upload: MemoryUpload = {
    id: store.nextUploadId++,
    originalName: payload.originalName,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    dataBase64: payload.dataBase64,
    createdAt: new Date(),
  };
  store.uploads.push(upload);
  return upload;
}

export function getMemoryUpload(id: number): MemoryUpload | null {
  const store = getStore();
  return store.uploads.find((u) => u.id === id) ?? null;
}