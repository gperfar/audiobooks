// Minimal IndexedDB wrapper. Each record is
// { id, kind: 'local' | 'cache', sourceUrl?, manifest, audio: Blob, cover: Blob | null }
// - 'local': created, imported or edited on this device; wins over the catalog.
// - 'cache': untouched copy of a catalog file, refreshed when sourceUrl changes.

const DATABASE_NAME = 'audiolibros'
const DATABASE_VERSION = 1
const STORE_NAME = 'stories'

let databasePromise = null

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    databasePromise.catch(() => {
      databasePromise = null
    })
  }

  return databasePromise
}

async function runRequest(mode, createRequest) {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = createRequest(transaction.objectStore(STORE_NAME))

    transaction.oncomplete = () => resolve(request.result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function getStoredStory(storyId) {
  return runRequest('readonly', (store) => store.get(storyId))
}

export function getAllStoredStories() {
  return runRequest('readonly', (store) => store.getAll())
}

export function putStoredStory(record) {
  return runRequest('readwrite', (store) => store.put(record))
}

export function deleteStoredStory(storyId) {
  return runRequest('readwrite', (store) => store.delete(storyId))
}

let hasRequestedPersistence = false

// Ask the browser not to evict our data under storage pressure. Safari also
// needs the app added to the home screen to keep data beyond ~7 days of disuse.
export function requestPersistentStorage() {
  if (hasRequestedPersistence || !navigator.storage?.persist) {
    return
  }

  hasRequestedPersistence = true
  navigator.storage.persist().catch(() => {})
}
