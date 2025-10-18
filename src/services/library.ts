export async function getStructure(baseUrl = 'http://127.0.0.1:3001') {
  const res = await fetch(`${baseUrl}/library/structure`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GET /library/structure ${res.status}`);
  return res.json();
}
