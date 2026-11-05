/** Shared message for modules omitted from the public showcase repository. */
export const CORE_OMITTED =
  "核心处理逻辑未包含在公开仓库中。产品体验见 https://bookpersonae.dewyue.com";

export function omitCore(feature: string): never {
  throw new Error(`${feature}：${CORE_OMITTED}`);
}
