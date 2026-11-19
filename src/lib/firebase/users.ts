import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import type { UserProfile, UpdateProfileInput, RecentlyViewedItem } from "@/lib/types/user";
import type { DeliveryAddress } from "@/lib/types/nepal-address";

function mapUserDoc(docSnap: QueryDocumentSnapshot<DocumentData>): UserProfile {
  const data = docSnap.data();
  return {
    ...data,
    uid: docSnap.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as UserProfile;
}

export async function updateUserProfile(uid: string, input: UpdateProfileInput): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(ref, { ...input, updatedAt: serverTimestamp() });
}

export async function addUserAddress(uid: string, address: DeliveryAddress): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found");

  const data = snap.data();
  let addresses: DeliveryAddress[] = data.addresses || [];

  const newAddress: DeliveryAddress = { ...address, id: `addr_${Date.now()}` };

  if (newAddress.isDefault) {
    addresses = addresses.map((a) => ({ ...a, isDefault: false }));
  }

  await updateDoc(ref, {
    addresses: [...addresses, newAddress],
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserAddress(
  uid: string,
  addressId: string,
  updated: DeliveryAddress
): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found");

  const data = snap.data();
  let addresses: DeliveryAddress[] = data.addresses || [];

  if (updated.isDefault) {
    addresses = addresses.map((a) => ({ ...a, isDefault: false }));
  }
  addresses = addresses.map((a) => (a.id === addressId ? { ...updated, id: addressId } : a));

  await updateDoc(ref, { addresses, updatedAt: serverTimestamp() });
}

export async function removeUserAddress(uid: string, addressId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found");

  const data = snap.data();
  const addresses: DeliveryAddress[] = data.addresses || [];

  await updateDoc(ref, {
    addresses: addresses.filter((a) => a.id !== addressId),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleWishlistItem(uid: string, productId: string): Promise<boolean> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found");

  const data = snap.data();
  const wishlist: string[] = data.wishlist || [];
  const exists = wishlist.includes(productId);
  const updated = exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId];

  await updateDoc(ref, { wishlist: updated, updatedAt: serverTimestamp() });
  return !exists;
}

export async function recordRecentlyViewed(uid: string, productId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;

    const recentlyViewed: RecentlyViewedItem[] = snap.data().recentlyViewed || [];
    if (recentlyViewed[0]?.productId === productId) return;

    const filtered = recentlyViewed.filter((item) => item.productId !== productId);
    const updated: RecentlyViewedItem[] = [
      { productId, viewedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, 20);

    transaction.update(ref, { recentlyViewed: updated, updatedAt: serverTimestamp() });
  });
}

export async function getAllCustomers(): Promise<UserProfile[]> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where("role", "==", "customer"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapUserDoc);
}

export async function toggleCustomerActiveStatus(uid: string, isActive: boolean): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(ref, { isActive, updatedAt: serverTimestamp() });
}
