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
  arrayUnion,
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
  numeros_vendidos: number[];
  numeros_apartados: number[];
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

/**
 * Atomically checks that all `numeros` are still available and appends them
 * to `numeros_apartados`. Throws if any number is already vendido or apartado.
 */
export async function reservarNumeros(rifaId: string, numeros: number[]): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const rifaRef = doc(db, "rifas", rifaId);
    const rifaSnap = await transaction.get(rifaRef);
    if (!rifaSnap.exists()) throw new Error("Rifa no encontrada.");

    const data = rifaSnap.data() as Rifa;
    const vendidosSet = new Set(data.numeros_vendidos ?? []);
    const apartadosSet = new Set(data.numeros_apartados ?? []);

    const conflicto = numeros.find((n) => vendidosSet.has(n) || apartadosSet.has(n));
    if (conflicto !== undefined) {
      throw new Error(`El número ${conflicto} ya no está disponible. Elige otro.`);
    }

    transaction.update(rifaRef, { numeros_apartados: arrayUnion(...numeros) });
  });
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

export async function markBoletoPagado(id: string): Promise<void> {
  await updateDoc(doc(db, "boletos", id), { status: "pagado" });
}

/** Apartado → Disponible: cancels a "pendiente" boleto and frees its numbers. */
export async function cancelApartado(boleto: { id: string; rifa_id: string; numeros: number[] }, rifa: { numeros_apartados: number[] }): Promise<void> {
  const nuevosApartados = rifa.numeros_apartados.filter((n) => !boleto.numeros.includes(n));
  await Promise.all([
    updateDoc(doc(db, "boletos", boleto.id), { status: "cancelado" }),
    updateDoc(doc(db, "rifas", boleto.rifa_id), { numeros_apartados: nuevosApartados }),
  ]);
}

/** Pagado → Apartado: reverts a "pagado" boleto back to "pendiente" and moves numbers. */
export async function revertPagadoToApartado(boleto: { id: string; rifa_id: string; numeros: number[] }, rifa: { numeros_vendidos: number[]; numeros_apartados: number[] }): Promise<void> {
  const nuevosVendidos = rifa.numeros_vendidos.filter((n) => !boleto.numeros.includes(n));
  const nuevosApartados = [...rifa.numeros_apartados, ...boleto.numeros];
  await Promise.all([
    updateDoc(doc(db, "boletos", boleto.id), { status: "pendiente" }),
    updateDoc(doc(db, "rifas", boleto.rifa_id), {
      numeros_vendidos: nuevosVendidos,
      numeros_apartados: nuevosApartados,
    }),
  ]);
}

/** Pagado → Disponible: cancels a "pagado" boleto and frees its numbers entirely. */
export async function cancelPagado(boleto: { id: string; rifa_id: string; numeros: number[] }, rifa: { numeros_vendidos: number[] }): Promise<void> {
  const nuevosVendidos = rifa.numeros_vendidos.filter((n) => !boleto.numeros.includes(n));
  await Promise.all([
    updateDoc(doc(db, "boletos", boleto.id), { status: "cancelado" }),
    updateDoc(doc(db, "rifas", boleto.rifa_id), { numeros_vendidos: nuevosVendidos }),
  ]);
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
