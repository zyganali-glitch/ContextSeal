export function traceImpact(context, targetUrn, maxHops = 5) {
  const assets = new Map(context.assets.map((asset) => [asset.urn, asset]));
  if (!assets.has(targetUrn)) throw new Error(`Target asset not found in context: ${targetUrn}`);

  const adjacency = new Map();
  for (const edge of context.edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge.to);
  }

  const queue = [{ urn: targetUrn, path: [targetUrn], hops: 0 }];
  const visited = new Map([[targetUrn, { urn: targetUrn, path: [targetUrn], hops: 0 }]]);
  while (queue.length) {
    const current = queue.shift();
    if (current.hops >= maxHops) continue;
    for (const next of adjacency.get(current.urn) || []) {
      if (visited.has(next)) continue;
      const item = { urn: next, path: [...current.path, next], hops: current.hops + 1 };
      visited.set(next, item);
      queue.push(item);
    }
  }

  const impacted = [...visited.values()]
    .filter((item) => item.urn !== targetUrn)
    .map((item) => ({ ...assets.get(item.urn), path: item.path, hops: item.hops }))
    .filter((item) => item.urn);

  return {
    target: assets.get(targetUrn),
    impacted,
    counts: impacted.reduce((acc, asset) => {
      acc.total += 1;
      acc.byType[asset.type] = (acc.byType[asset.type] || 0) + 1;
      if (asset.criticality === "HIGH") acc.highCriticality += 1;
      return acc;
    }, { total: 0, highCriticality: 0, byType: {} })
  };
}
