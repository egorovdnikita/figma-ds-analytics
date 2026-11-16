import type { MasterRef } from './adoption';

/** Отмена действует и при догрузке мастеров после обхода. */
export async function resolveMasters(
  instances: readonly { node: InstanceNode; pageId: string }[],
  cancelled: () => boolean,
  onProgress: (done: number) => void,
): Promise<MasterRef[]> {
  const refs: MasterRef[] = [];
  for (const { node, pageId } of instances) {
    if (cancelled()) break;
    const place = { nodeId: node.id, pageId, name: node.name };
    let ref: MasterRef = { key: node.id, name: node.name, remote: null, place };
    try {
      const master = await node.getMainComponentAsync();
      if (master !== null)
        ref = { key: master.key, name: master.name, remote: master.remote, place };
    } catch {
      // Недоступный мастер сохраняем как неизвестный источник.
    }
    refs.push(ref);
    onProgress(refs.length);
    if (refs.length % 50 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return refs;
}
