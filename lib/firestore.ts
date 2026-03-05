import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  increment,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Rifa {
  id?: string;
  nombre: string;
  descripcion: string;
  precio_boleto: number;
  imagen_url: string;
  imagenes_url: string[];
  texto_inferior: string;
  num_inicio: number;
  num_fin: number;
  fecha_sorteo: string;
  activa: boolean;
  // Counters — derived from the `numeros` subcollection
  num_vendidos: number;
  num_apartados: number;
}

export interface Boleto {
  id?: string;
  folio: string;
  rifa_id: string;
  numeros: number[];
  nombre: string;
  apellidos: string;
  celular: string;
  estado: string;
  codigo_descuento: string;
  descuento_aplicado: number;
  precio_total: number;
  status: "pendiente" | "pagado" | "cancelado";
  created_at: Timestamp;
}

export interface DiscountCode {
  id?: string;
  codigo: string;
  porcentaje: number;
  activo: boolean;
  usos: number;
  max_usos: number;
}

export interface WhatsAppConfig {
  numeros: string[];
  intervalo_horas: number;
  indice_actual: number;
  ultima_rotacion: Timestamp;
}

export interface BankAccount {
  id?: string;
  banco: string;
  titular: string;
  clabe: string;
  num_cuenta: string;
  activo: boolean;
}

// ─── Rifas ────────────────────────────────────────────────────────────────────

export async function getRifas(): Promise<Rifa[]> {
  const snap = await getDocs(collection(db, "rifas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rifa));
}

export async function getRifa(id: string): Promise<Rifa | null> {
  const snap = await getDoc(doc(db, "rifas", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Rifa) : null;
}

export async function createRifa(data: Omit<Rifa, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "rifas"), data);
  return ref.id;
}

export async function updateRifa(id: string, data: Partial<Rifa>): Promise<void> {
  await updateDoc(doc(db, "rifas", id), data);
}

export async function deleteRifa(id: string): Promise<void> {
  await deleteDoc(doc(db, "rifas", id));
}

// ─── Numbers subcollection ────────────────────────────────────────────────────
// Each document key is the number (as string). Only occupied numbers exist.
// Disponible = no document present.

export async function getNumerosOcupados(rifaId: string): Promise<{ vendidos: number[]; apartados: number[] }> {
  const snap = await getDocs(collection(db, "rifas", rifaId, "numeros"));
  const vendidos: number[] = [];
  const apartados: number[] = [];
  snap.docs.forEach((d) => {
    const n = parseInt(d.id);
    if (!isNaN(n)) {
      if (d.data().status === "vendido") vendidos.push(n);
      else if (d.data().status === "apartado") apartados.push(n);
    }
  });
  return { vendidos, apartados };
}

/**
 * Atomically checks availability and marks numbers as "apartado".
 * Uses a transaction so two concurrent users cannot book the same number.
 */
export async function reservarNumeros(rifaId: string, numeros: number[]): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const refs = numeros.map((n) => doc(db, "rifas", rifaId, "numeros", String(n)));
    const snaps = await Promise.all(refs.map((ref) => transaction.get(ref)));

    const conflicto = numeros.find((_, i) => snaps[i].exists());
    if (conflicto !== undefined) {
      throw new Error(`El número ${conflicto} ya no está disponible. Elige otro.`);
    }

    refs.forEach((ref) => transaction.set(ref, { status: "apartado" }));
    transaction.update(doc(db, "rifas", rifaId), { num_apartados: increment(numeros.length) });
  });
}

/**
 * Marks a boleto as pagado and moves its numbers from apartado → vendido atomically.
 */
export async function markBoletoPagadoConNumeros(boleto: {
  id: string;
  rifa_id: string;
  numeros: number[];
}): Promise<void> {
  const batch = writeBatch(db);
  boleto.numeros.forEach((n) => {
    batch.set(doc(db, "rifas", boleto.rifa_id, "numeros", String(n)), { status: "vendido" });
  });
  batch.update(doc(db, "boletos", boleto.id), { status: "pagado" });
  batch.update(doc(db, "rifas", boleto.rifa_id), {
    num_apartados: increment(-boleto.numeros.length),
    num_vendidos: increment(boleto.numeros.length),
  });
  await batch.commit();
}

/** Cancels a "pendiente" boleto and frees its numbers. */
export async function cancelApartado(boleto: {
  id: string;
  rifa_id: string;
  numeros: number[];
}): Promise<void> {
  const batch = writeBatch(db);
  boleto.numeros.forEach((n) => {
    batch.delete(doc(db, "rifas", boleto.rifa_id, "numeros", String(n)));
  });
  batch.update(doc(db, "boletos", boleto.id), { status: "cancelado" });
  batch.update(doc(db, "rifas", boleto.rifa_id), {
    num_apartados: increment(-boleto.numeros.length),
  });
  await batch.commit();
}

/** Reverts a "pagado" boleto back to "pendiente" and moves numbers vendido → apartado. */
export async function revertPagadoToApartado(boleto: {
  id: string;
  rifa_id: string;
  numeros: number[];
}): Promise<void> {
  const batch = writeBatch(db);
  boleto.numeros.forEach((n) => {
    batch.set(doc(db, "rifas", boleto.rifa_id, "numeros", String(n)), { status: "apartado" });
  });
  batch.update(doc(db, "boletos", boleto.id), { status: "pendiente" });
  batch.update(doc(db, "rifas", boleto.rifa_id), {
    num_vendidos: increment(-boleto.numeros.length),
    num_apartados: increment(boleto.numeros.length),
  });
  await batch.commit();
}

/** Cancels a "pagado" boleto and frees its numbers entirely. */
export async function cancelPagado(boleto: {
  id: string;
  rifa_id: string;
  numeros: number[];
}): Promise<void> {
  const batch = writeBatch(db);
  boleto.numeros.forEach((n) => {
    batch.delete(doc(db, "rifas", boleto.rifa_id, "numeros", String(n)));
  });
  batch.update(doc(db, "boletos", boleto.id), { status: "cancelado" });
  batch.update(doc(db, "rifas", boleto.rifa_id), {
    num_vendidos: increment(-boleto.numeros.length),
  });
  await batch.commit();
}

/** Marks numbers directly as "vendido" (used for gift/regalo flow). */
export async function registrarNumerosVendidos(rifaId: string, numeros: number[]): Promise<void> {
  const batch = writeBatch(db);
  numeros.forEach((n) => {
    batch.set(doc(db, "rifas", rifaId, "numeros", String(n)), { status: "vendido" });
  });
  batch.update(doc(db, "rifas", rifaId), { num_vendidos: increment(numeros.length) });
  await batch.commit();
}

// ─── Boletos ──────────────────────────────────────────────────────────────────

export async function createBoleto(data: Omit<Boleto, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "boletos"), data);
  return ref.id;
}

export async function getBoletos(): Promise<Boleto[]> {
  const snap = await getDocs(query(collection(db, "boletos"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boleto));
}

export async function getBoletoByFolio(folio: string): Promise<Boleto | null> {
  const snap = await getDocs(query(collection(db, "boletos"), where("folio", "==", folio)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Boleto;
}

export async function getBoletosByCelular(celular: string): Promise<Boleto[]> {
  const snap = await getDocs(query(collection(db, "boletos"), where("celular", "==", celular)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boleto));
}

export async function getBoletosByNumero(numero: number): Promise<Boleto[]> {
  const snap = await getDocs(query(collection(db, "boletos"), where("numeros", "array-contains", numero)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boleto));
}

export async function getBoletosByRifa(rifaId: string): Promise<Boleto[]> {
  const snap = await getDocs(query(collection(db, "boletos"), where("rifa_id", "==", rifaId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Boleto));
}

// ─── Discount Codes ───────────────────────────────────────────────────────────

export async function getDiscountCodes(): Promise<DiscountCode[]> {
  const snap = await getDocs(collection(db, "discount_codes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiscountCode));
}

export async function validateDiscountCode(codigo: string): Promise<DiscountCode | null> {
  const snap = await getDocs(
    query(collection(db, "discount_codes"), where("codigo", "==", codigo), where("activo", "==", true))
  );
  if (snap.empty) return null;
  const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as DiscountCode;
  if (data.usos >= data.max_usos) return null;
  return data;
}

export async function incrementDiscountUse(id: string): Promise<void> {
  await updateDoc(doc(db, "discount_codes", id), { usos: increment(1) });
}

export async function createDiscountCode(data: Omit<DiscountCode, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "discount_codes"), data);
  return ref.id;
}

export async function updateDiscountCode(id: string, data: Partial<DiscountCode>): Promise<void> {
  await updateDoc(doc(db, "discount_codes", id), data);
}

export async function deleteDiscountCode(id: string): Promise<void> {
  await deleteDoc(doc(db, "discount_codes", id));
}

// ─── WhatsApp Config ──────────────────────────────────────────────────────────

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const snap = await getDoc(doc(db, "whatsapp_config", "config"));
  return snap.exists() ? (snap.data() as WhatsAppConfig) : null;
}

export async function setWhatsAppConfig(data: WhatsAppConfig): Promise<void> {
  await setDoc(doc(db, "whatsapp_config", "config"), data);
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function getBankAccounts(): Promise<BankAccount[]> {
  const snap = await getDocs(collection(db, "bank_accounts"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BankAccount));
}

export async function upsertBankAccount(id: string, data: Omit<BankAccount, "id">): Promise<void> {
  await setDoc(doc(db, "bank_accounts", id), data);
}
