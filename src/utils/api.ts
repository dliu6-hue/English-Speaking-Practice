/**
 * Safe API request utility to ensure clean JSON responses
 * and prevent "Unexpected token '<'" parsing errors when proxies or servers return HTML.
 */

export async function safeFetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err: any) {
    throw new Error('网络请求异常，请检查网络连接后重试。');
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const rawText = await res.text().catch(() => '');
    console.warn(`[safeFetchJson] Expected JSON but received ${contentType} from ${url}:`, rawText.slice(0, 120));
    throw new Error(
      res.ok
        ? '服务正在启动准备中，请刷新或稍后重试'
        : `服务暂时不可用 (${res.status})，请稍候重试`
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error('响应数据解析失败，请重试');
  }

  if (!res.ok) {
    throw new Error(data?.error || `请求失败 (${res.status})`);
  }

  return data as T;
}
