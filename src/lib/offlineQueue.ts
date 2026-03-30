// Fila de operações realizadas offline para sincronizar quando conectar

export type OfflineOp = {
  id: string;
  table: "suplentes" | "pagamentos";
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  filter?: { column: string; value: string }; // para update/delete
  timestamp: number;
};

const KEY = "offline_queue";

export function getQueue(): OfflineOp[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function enqueue(op: Omit<OfflineOp, "id" | "timestamp">): void {
  const queue = getQueue();
  queue.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function dequeue(id: string): void {
  const queue = getQueue().filter(op => op.id !== id);
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.removeItem(KEY);
}

export function queueLength(): number {
  return getQueue().length;
}
