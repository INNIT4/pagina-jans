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
  limit,
  startAfter,
  Timestamp,
  setDoc,
  increment,
  runTransaction,
  writeBatch,
  DocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Ganador {
  numero: number;
  nombre: string;
  apellidos: string;
  folio: string;
  anunciado_at: string; // ISO timestamp
}

export interface Premio {
  id: string;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  es_principal: boolean;
  condicion?: string; // e.g. "Si compras más de 10 boletos"
}

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
  oportunidades?: number;
  // Counters — derived from the `numeros` subcollection
  num_vendidos: number;
  num_apartados: number;
  premios?: Premio[];
  ganador?: Ganador;
}

export interface Boleto {
  id?: string;
  folio: string;
  rifa_id: string;
  numeros: number[];
  numeros_completos?: number[]; // Almacena todos (principal + derivados)
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
  rifa_ids?: string[]; // vacío o undefined = válido para todas las rifas
}

export interface WhatsAppConfig {
  numeros: string[];
  indice_actual: number;
  ayuda_numero?: string; // Global support number
}

export interface BankAccount {
  id?: string;
  banco: string;
  titular: string;
  clabe: string;
  num_cuenta: string;
  activo: boolean;
  color?: string; // gradient key from CARD_COLORS
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
 * Busca el boleto pagado que contiene el número ganador,
 * guarda el ganador en el documento de la rifa y la marca como inactiva.
 * Lanza error si el número no corresponde a ningún boleto pagado.
 */
export async function anunciarGanador(rifaId: string, numero_ganador: number): Promise<Ganador> {
  const rifaSnap = await getDoc(doc(db, "rifas", rifaId));
  const rifa = rifaSnap.data() as Rifa;
  
  let p = numero_ganador;
  if (rifa.oportunidades && rifa.oportunidades > 1) {
    const rango_secundario = (rifa.num_fin - rifa.num_inicio) + 1;
    p = numero_ganador % rango_secundario;
    if (p < rifa.num_inicio) p += rango_secundario;
    
    const maxNumber = rifa.num_fin + ((rifa.oportunidades - 1) * rango_secundario);
    if (numero_ganador < rifa.num_inicio || numero_ganador > maxNumber) {
      throw new Error(`El número ${numero_ganador} ganador está fuera de rango para esta rifa (${rifa.num_inicio} – ${maxNumber}).`);
    }
  }

  const snap = await getDocs(
    query(collection(db, "boletos"), where("rifa_id", "==", rifaId), where("numeros", "array-contains", p))
  );
  const boletoPagado = snap.docs.find((d) => d.data().status === "pagado");
  if (!boletoPagado) {
    throw new Error(`No se encontró un boleto pagado con el número ganador asociado al ${p} principal.`);
  }
  const data = boletoPagado.data() as Boleto;
  const ganador: Ganador = {
    numero: numero_ganador,
    nombre: data.nombre,
    apellidos: data.apellidos,
    folio: data.folio,
    anunciado_at: new Date().toISOString(),
  };
  await updateDoc(doc(db, "rifas", rifaId), { ganador });
  return ganador;
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

    // Solo bloquear números ya vendidos (pagados); los apartados se pueden tomar
    const conflicto = numeros.find((_, i) => snaps[i].exists() && snaps[i].data()?.status === "vendido");
    if (conflicto !== undefined) {
      throw new Error(`El número ${conflicto} ya no está disponible. Elige otro.`);
    }

    // Solo incrementar el contador por números que aún no están apartados
    const nuevos = numeros.filter((_, i) => !snaps[i].exists()).length;
    refs.forEach((ref) => transaction.set(ref, { status: "apartado" }));
    if (nuevos > 0) {
      transaction.update(doc(db, "rifas", rifaId), { num_apartados: increment(nuevos) });
    }
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

export interface BoletosPage {
  boletos: Boleto[];
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

/**
 * Carga boletos con filtros server-side y paginación por cursor.
 * - status y rifaId se aplican en Firestore (where).
 * - Cuando search está activo (pasado desde el componente), se omite el limit
 *   para que el llamador pueda filtrar por texto sobre el conjunto completo.
 */
export async function getBoletosPaginados(opts: {
  status?: string;
  rifaId?: string;
  pageSize: number;
  cursor?: DocumentSnapshot | null;
  loadAll?: boolean; // true cuando hay búsqueda de texto activa
}): Promise<BoletosPage> {
  const hasFilters = !!(opts.status || opts.rifaId);
  // Cuando hay filtros where+orderBy en campos distintos Firestore requiere un índice
  // compuesto. Para evitarlo: si hay filtros, cargamos todo sin orderBy (el sort es
  // client-side). Solo usamos orderBy+cursor cuando no hay filtros (vista "todos").
  const constraints: Parameters<typeof query>[1][] = [];
  if (opts.status) constraints.push(where("status", "==", opts.status));
  if (opts.rifaId) constraints.push(where("rifa_id", "==", opts.rifaId));
  if (!hasFilters) constraints.push(orderBy("created_at", "desc"));
  if (!hasFilters && !opts.loadAll) constraints.push(limit(opts.pageSize + 1));
  if (!hasFilters && opts.cursor) constraints.push(startAfter(opts.cursor));

  const snap = await getDocs(query(collection(db, "boletos"), ...constraints));
  const hasMore = !hasFilters && !opts.loadAll && snap.docs.length > opts.pageSize;
  const docs = hasMore ? snap.docs.slice(0, opts.pageSize) : snap.docs;
  return {
    boletos: docs.map((d) => ({ id: d.id, ...d.data() } as Boleto)),
    hasMore,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
  };
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

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  mostrar_apartados: boolean;
  cancelacion_activa: boolean;
  cancelacion_horas: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  mostrar_apartados: true,
  cancelacion_activa: false,
  cancelacion_horas: 24,
};

export async function getAppSettings(): Promise<AppSettings> {
  const snap = await getDoc(doc(db, "settings", "config"));
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AppSettings>) } : DEFAULT_SETTINGS;
}

export async function setAppSettings(data: Partial<AppSettings>): Promise<void> {
  await setDoc(doc(db, "settings", "config"), data, { merge: true });
}

/**
 * Cancela todos los boletos "pendiente" cuya fecha de creación supera `horas` horas.
 * Libera sus números y actualiza los contadores de la rifa.
 * Devuelve el número de boletos cancelados.
 */
export async function cancelarBoletosExpirados(horas: number): Promise<number> {
  const corte = new Date(Date.now() - horas * 60 * 60 * 1000);
  const corteTs = Timestamp.fromDate(corte);

  const snap = await getDocs(
    query(
      collection(db, "boletos"),
      where("status", "==", "pendiente"),
      where("created_at", "<", corteTs)
    )
  );

  if (snap.empty) return 0;

  // Agrupar por rifa para actualizar los contadores de forma eficiente
  const porRifa = new Map<string, { boletoId: string; numeros: number[] }[]>();
  snap.docs.forEach((d) => {
    const b = d.data() as Boleto;
    const entry = { boletoId: d.id, numeros: b.numeros };
    const arr = porRifa.get(b.rifa_id) ?? [];
    arr.push(entry);
    porRifa.set(b.rifa_id, arr);
  });

  // Firestore batch tiene límite de 500 ops; procesamos en lotes
  const BATCH_LIMIT = 400;
  let batch = writeBatch(db);
  let opCount = 0;
  const batches: ReturnType<typeof writeBatch>[] = [batch];

  function addOp(fn: (b: ReturnType<typeof writeBatch>) => void) {
    if (opCount >= BATCH_LIMIT) {
      batch = writeBatch(db);
      batches.push(batch);
      opCount = 0;
    }
    fn(batch);
    opCount++;
  }

  porRifa.forEach((boletos, rifaId) => {
    let totalNums = 0;
    boletos.forEach(({ boletoId, numeros }) => {
      // Cancelar boleto
      addOp((b) => b.update(doc(db, "boletos", boletoId), { status: "cancelado" }));
      // Liberar números
      numeros.forEach((n) => {
        addOp((b) => b.delete(doc(db, "rifas", rifaId, "numeros", String(n))));
      });
      totalNums += numeros.length;
    });
    // Decrementar contador de apartados
    addOp((b) => b.update(doc(db, "rifas", rifaId), { num_apartados: increment(-totalNums) }));
  });

  await Promise.all(batches.map((b) => b.commit()));
  return snap.size;
}

// ─── WhatsApp Config ──────────────────────────────────────────────────────────

export async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const snap = await getDoc(doc(db, "whatsapp_config", "config"));
  if (!snap.exists()) return null;
  const data = snap.data();
  // Migración automática del formato viejo { numero: string }
  if (typeof data.numero === "string" && !data.numeros) {
    return { numeros: data.numero ? [data.numero] : [], indice_actual: 0 };
  }
  return data as WhatsAppConfig;
}

export async function setWhatsAppConfig(data: WhatsAppConfig): Promise<void> {
  await setDoc(doc(db, "whatsapp_config", "config"), data);
}

/**
 * Lee el número activo actual y rota al siguiente de forma atómica.
 * Devuelve el número que debe usar el usuario actual (antes de rotar).
 * Si no hay números configurados devuelve null.
 */
export async function getAndRotateWhatsApp(): Promise<string | null> {
  const ref = doc(db, "whatsapp_config", "config");
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    // Soporte formato viejo en caliente
    const numeros: string[] =
      data.numeros ?? (data.numero ? [data.numero] : []);
    if (!numeros.length) return null;
    const indice = (data.indice_actual ?? 0) % numeros.length;
    const numero = numeros[indice];
    tx.update(ref, { indice_actual: (indice + 1) % numeros.length });
    return numero;
  });
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function getBankAccounts(): Promise<BankAccount[]> {
  const snap = await getDocs(collection(db, "bank_accounts"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BankAccount));
}

export async function upsertBankAccount(id: string, data: Omit<BankAccount, "id">): Promise<void> {
  await setDoc(doc(db, "bank_accounts", id), data);
}

export async function deleteBankAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, "bank_accounts", id));
}

// ─── Site Content (CMS) ───────────────────────────────────────────────────────

export interface FaqItem {
  q: string;
  a: string;
}

export interface HowItWorksStep {
  title: string;
  desc: string;
}

export interface ValueCard {
  icon: string;
  title: string;
  desc: string;
}

export interface SiteTexts {
  hero_title: string;
  hero_subtitle: string;
  hero_banks_text: string;
  how_it_works_title: string;
  how_it_works_steps: HowItWorksStep[];
  about_mission_title: string;
  about_mission_text: string;
  about_values: ValueCard[];
  about_why_title: string;
  about_why_items: string[];
  faq_title: string;
  faq_subtitle: string;
  faq_items: FaqItem[];
}

export const DEFAULT_SITE_TEXTS: SiteTexts = {
  hero_title: "Gana con Sorteos Jans",
  hero_subtitle:
    "Participa en nuestras rifas en línea. Elige tus números de la suerte, apártalos y paga fácilmente por transferencia bancaria.",
  hero_banks_text: "Azteca · Nu · BBVA",
  how_it_works_title: "¿Cómo participar?",
  how_it_works_steps: [
    { title: "Elige tu rifa", desc: "Navega las rifas disponibles y selecciona la que más te guste." },
    { title: "Selecciona números", desc: "Elige tus números de la suerte en la cuadrícula interactiva." },
    { title: "Aparta y paga", desc: "Completa el formulario y realiza tu pago por transferencia bancaria." },
    { title: "Espera el sorteo", desc: "Recibirás confirmación por WhatsApp. ¡Buena suerte!" },
  ],
  about_mission_title: "Nuestra misión",
  about_mission_text:
    "En Sorteos Jans creemos en la transparencia y la confianza. Nuestro objetivo es brindarte una experiencia de compra de boletos segura, sencilla y emocionante desde la comodidad de tu hogar.",
  about_values: [
    { icon: "🔒", title: "Seguridad", desc: "Tus datos están protegidos y nunca compartimos tu información con terceros." },
    { icon: "✅", title: "Transparencia", desc: "Los sorteos se realizan de forma pública y verificable. Todo queda registrado." },
    { icon: "💬", title: "Soporte", desc: "Estamos disponibles por WhatsApp para resolver cualquier duda antes, durante y después del sorteo." },
  ],
  about_why_title: "¿Por qué elegirnos?",
  about_why_items: [
    "Sistema completamente en línea — disponible 24/7",
    "Múltiples opciones de pago bancario",
    "Confirmación inmediata por WhatsApp",
    "Historial completo de rifas anteriores",
    "Códigos de descuento exclusivos para nuestros clientes frecuentes",
  ],
  faq_title: "Preguntas Frecuentes",
  faq_subtitle: "Respuestas a las dudas más comunes.",
  faq_items: [
    {
      q: "¿Cómo aparto mis boletos?",
      a: "Selecciona los números que deseas en la cuadrícula, haz clic en 'Apartar', llena el formulario con tus datos y confirma. Te llegará un folio de confirmación.",
    },
    {
      q: "¿Cómo realizo el pago?",
      a: "Después de apartar, serás redirigido a la página de tarjetas con los datos bancarios. Realiza la transferencia por el monto exacto e indica tu folio en el concepto.",
    },
    {
      q: "¿Cuánto tiempo tengo para pagar?",
      a: "Tienes 24 horas para realizar el pago después de apartar. Pasado ese tiempo, los números pueden liberarse.",
    },
    {
      q: "¿Cómo sé si mi pago fue confirmado?",
      a: "Puedes consultar el estado de tu boleto en la sección 'Consultar Boleto' usando tu folio o número de celular. También te notificaremos por WhatsApp.",
    },
    {
      q: "¿Puedo apartar varios números?",
      a: "Sí, puedes seleccionar todos los números que quieras en la cuadrícula antes de apartar.",
    },
    {
      q: "¿Cómo funciona el sorteo?",
      a: "El sorteo se realiza en la fecha indicada en cada rifa. El ganador se notifica públicamente y por WhatsApp.",
    },
    {
      q: "¿Tienen códigos de descuento?",
      a: "Sí, en ocasiones especiales emitimos códigos de descuento. Introdúcelos en el formulario de apartado para ver si aplican.",
    },
    {
      q: "¿Cómo contactarlos?",
      a: "Puedes contactarnos por WhatsApp usando el botón verde en la esquina inferior derecha, o enviar un mensaje directamente.",
    },
  ],
};

export async function getSiteTexts(): Promise<SiteTexts> {
  try {
    const snap = await getDoc(doc(db, "site_content", "texts"));
    if (!snap.exists()) return DEFAULT_SITE_TEXTS;
    return { ...DEFAULT_SITE_TEXTS, ...(snap.data() as Partial<SiteTexts>) };
  } catch {
    return DEFAULT_SITE_TEXTS;
  }
}

export async function setSiteTexts(data: Partial<SiteTexts>): Promise<void> {
  await setDoc(doc(db, "site_content", "texts"), data, { merge: true });
}

// ─── Comprobantes ──────────────────────────────────────────────────────────────

export interface Comprobante {
  id?: string;
  nombre: string;
  folios: string[];
  monto_total: number;
  archivo_url: string;
  archivo_tipo: "imagen" | "pdf";
  status: "pendiente" | "revisado";
  created_at: Timestamp;
  admin_comentario?: {
    texto: string;
    created_at: Timestamp;
  };
}

export async function createComprobante(data: Omit<Comprobante, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "comprobantes"), data);
  return ref.id;
}

export async function getComprobantesPaginados(opts: {
  status?: "pendiente" | "revisado";
  pageSize: number;
  cursor?: DocumentSnapshot | null;
}): Promise<{ comprobantes: Comprobante[]; hasMore: boolean; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [];
  if (opts.status) constraints.push(where("status", "==", opts.status));
  constraints.push(orderBy("created_at", "desc"));
  constraints.push(limit(opts.pageSize + 1));
  if (opts.cursor) constraints.push(startAfter(opts.cursor));

  const snap = await getDocs(query(collection(db, "comprobantes"), ...constraints));
  const hasMore = snap.docs.length > opts.pageSize;
  const docs = hasMore ? snap.docs.slice(0, opts.pageSize) : snap.docs;
  return {
    comprobantes: docs.map((d) => ({ id: d.id, ...d.data() } as Comprobante)),
    hasMore,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
  };
}

export async function updateComprobanteStatus(id: string, status: "pendiente" | "revisado"): Promise<void> {
  await updateDoc(doc(db, "comprobantes", id), { status });
}

export async function updateComprobanteComentario(id: string, texto: string): Promise<void> {
  await updateDoc(doc(db, "comprobantes", id), {
    admin_comentario: { texto, created_at: Timestamp.now() },
  });
}

export async function getComprobanteByFolio(folio: string): Promise<Comprobante | null> {
  const snap = await getDocs(
    query(collection(db, "comprobantes"), where("folios", "array-contains", folio))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Comprobante;
}
