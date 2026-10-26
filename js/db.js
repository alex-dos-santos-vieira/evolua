/* Evolua — armazenamento local (IndexedDB) e dados iniciais */
const DB = (() => {
  const NOME = 'evolua', VERSAO = 1;
  const STORES = {
    config: { keyPath: 'k' },
    medidas: { keyPath: 'id', autoIncrement: true },
    sessoes: { keyPath: 'id', autoIncrement: true },
    comidas: { keyPath: 'id', autoIncrement: true },
    atividades: { keyPath: 'id', autoIncrement: true },
    alimentos: { keyPath: 'id', autoIncrement: true }
  };
  let abrindo = null;
  const req = (r) => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
  function abrir() {
    if (abrindo) return abrindo;
    abrindo = new Promise((ok, erro) => {
      const r = indexedDB.open(NOME, VERSAO);
      r.onupgradeneeded = () => {
        const d = r.result;
        for (const [n, o] of Object.entries(STORES)) {
          if (!d.objectStoreNames.contains(n)) {
            const s = d.createObjectStore(n, o);
            if (!['config', 'alimentos'].includes(n)) s.createIndex('data', 'data');
          }
        }
      };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => erro(r.error);
    });
    return abrindo;
  }
  async function store(n, modo = 'readonly') { const d = await abrir(); return d.transaction(n, modo).objectStore(n); }
  const api = {
    all: async (n) => req((await store(n)).getAll()),
    get: async (n, k) => req((await store(n)).get(k)),
    put: async (n, v) => req((await store(n, 'readwrite')).put(v)),
    del: async (n, k) => req((await store(n, 'readwrite')).delete(k)),
    clear: async (n) => req((await store(n, 'readwrite')).clear()),
    porData: async (n, data) => req((await store(n)).index('data').getAll(data)),
    entre: async (n, de, ate) => req((await store(n)).index('data').getAll(IDBKeyRange.bound(de, ate))),
    cfg: async (k, padrao = null) => { const r = await api.get('config', k); return r ? r.v : padrao; },
    setCfg: async (k, v) => api.put('config', { k, v }),
    stores: Object.keys(STORES)
  };

  const PLANO_INICIAL = [{"id": "A", "nome": "Superior · força", "exercicios": [{"nome": "Supino reto com barra", "grupo": "Peito", "series": 4, "reps": "6–8", "descanso_s": 150}, {"nome": "Remada curvada com barra", "grupo": "Costas", "series": 4, "reps": "6–8", "descanso_s": 150}, {"nome": "Desenvolvimento com halteres sentado", "grupo": "Ombros", "series": 3, "reps": "8–10", "descanso_s": 90}, {"nome": "Puxada frente pegada aberta", "grupo": "Costas", "series": 3, "reps": "8–10", "descanso_s": 90}, {"nome": "Elevação lateral com halteres", "grupo": "Ombros", "series": 3, "reps": "12–15", "descanso_s": 60}, {"nome": "Rosca direta com barra W", "grupo": "Bíceps", "series": 3, "reps": "10–12", "descanso_s": 60}, {"nome": "Tríceps na polia com corda", "grupo": "Tríceps", "series": 3, "reps": "10–12", "descanso_s": 60}, {"nome": "Bike ergométrica em ritmo de conversa", "grupo": "Cardio", "cardio": true, "duracao_min": 20}]}, {"id": "B", "nome": "Inferior · força", "exercicios": [{"nome": "Agachamento livre", "grupo": "Quadríceps", "series": 4, "reps": "6–8", "descanso_s": 150}, {"nome": "Levantamento terra romeno (stiff)", "grupo": "Posteriores", "series": 3, "reps": "8–10", "descanso_s": 120}, {"nome": "Leg press 45°", "grupo": "Quadríceps", "series": 3, "reps": "10–12", "descanso_s": 90}, {"nome": "Cadeira flexora", "grupo": "Posteriores", "series": 3, "reps": "10–12", "descanso_s": 60}, {"nome": "Panturrilha em pé na máquina", "grupo": "Panturrilha", "series": 4, "reps": "10–15", "descanso_s": 60}, {"nome": "Prancha frontal", "grupo": "Core", "series": 3, "reps": "30–45 s", "descanso_s": 45}, {"nome": "Esteira inclinada caminhando", "grupo": "Cardio", "cardio": true, "duracao_min": 15}]}, {"id": "C", "nome": "Superior · volume", "exercicios": [{"nome": "Supino inclinado com halteres", "grupo": "Peito", "series": 3, "reps": "8–10", "descanso_s": 120}, {"nome": "Barra fixa (ou gravitron)", "grupo": "Costas", "series": 3, "reps": "6–10", "descanso_s": 120}, {"nome": "Remada baixa sentado", "grupo": "Costas", "series": 3, "reps": "10–12", "descanso_s": 90}, {"nome": "Crucifixo no peck deck", "grupo": "Peito", "series": 3, "reps": "12–15", "descanso_s": 60}, {"nome": "Face pull na polia", "grupo": "Ombros", "series": 3, "reps": "12–15", "descanso_s": 60}, {"nome": "Rosca martelo com halteres", "grupo": "Bíceps", "series": 3, "reps": "10–12", "descanso_s": 60}, {"nome": "Tríceps francês com halter", "grupo": "Tríceps", "series": 3, "reps": "10–12", "descanso_s": 60}, {"nome": "Elíptico em ritmo de conversa", "grupo": "Cardio", "cardio": true, "duracao_min": 20}]}, {"id": "D", "nome": "Inferior · volume", "exercicios": [{"nome": "Levantamento terra com barra hexagonal", "grupo": "Posteriores", "series": 3, "reps": "5–6", "descanso_s": 180}, {"nome": "Agachamento búlgaro com halteres", "grupo": "Quadríceps", "series": 3, "reps": "8–10 cada perna", "descanso_s": 90}, {"nome": "Elevação de quadril (hip thrust)", "grupo": "Glúteos", "series": 3, "reps": "10–12", "descanso_s": 90}, {"nome": "Cadeira extensora", "grupo": "Quadríceps", "series": 3, "reps": "12–15", "descanso_s": 60}, {"nome": "Mesa flexora", "grupo": "Posteriores", "series": 3, "reps": "10–12", "descanso_s": 60}, {"nome": "Panturrilha sentado", "grupo": "Panturrilha", "series": 3, "reps": "12–15", "descanso_s": 60}, {"nome": "Abdominal na polia (crunch)", "grupo": "Core", "series": 3, "reps": "12–15", "descanso_s": 60}, {"nome": "Bike ergométrica em ritmo de conversa", "grupo": "Cardio", "cardio": true, "duracao_min": 15}]}];
  const PERFIL_INICIAL = {
    nome: 'Alex dos Santos Vieira', nascimento: '1979-12-18', sexo: 'M', altura_cm: 165,
    fator_atividade: 1.55, deficit_kcal: 350, proteina_g_kg: 1.6, gordura_pct: 0.30, agua_ml_kg: 35,
    meta_passos: 8000, meta_sono_h: 7, meta_cardio_min: 150
  };
  const MEDIDAS_INICIAIS = [
    { data: '2026-08-16', peso: 88, peito: 106, abdomen: 108, cintura: 106, costas: 126, braco_d: 39, braco_e: 39, antebraco_d: 31, antebraco_e: 31, coxa_d: 60, coxa_e: 60, panturrilha_d: 41, panturrilha_e: 41 },
    { data: '2026-10-23', peso: 88.15, peito: 107, abdomen: 105, cintura: 98, costas: 129, braco_d: 39, braco_e: 39, antebraco_d: 31, antebraco_e: 31, coxa_d: 62, coxa_e: 62, panturrilha_d: 42, panturrilha_e: 42 }
  ];
  api.iniciar = async () => {
    await abrir();
    if (!(await api.cfg('iniciado'))) {
      await api.setCfg('perfil', PERFIL_INICIAL);
      await api.setCfg('plano', PLANO_INICIAL);
      for (const m of MEDIDAS_INICIAIS) await api.put('medidas', m);
      await api.setCfg('iniciado', new Date().toISOString());
    }
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
  };
  api.planoPadrao = () => JSON.parse(JSON.stringify(PLANO_INICIAL));

  /* Backup: exporta tudo para JSON (fotos viram data URL) */
  const blobParaURL = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
  const urlParaBlob = async (u) => (await fetch(u)).blob();
  api.exportar = async () => {
    const out = { app: 'evolua', versao: 1, exportado: new Date().toISOString(), dados: {} };
    for (const n of api.stores) {
      const rows = await api.all(n);
      for (const r of rows) if (r.foto instanceof Blob) r.foto = await blobParaURL(r.foto);
      out.dados[n] = rows;
    }
    return out;
  };
  api.importar = async (obj) => {
    if (!obj || obj.app !== 'evolua' || !obj.dados) throw new Error('Arquivo de backup inválido.');
    for (const n of api.stores) {
      if (!Array.isArray(obj.dados[n])) continue;
      await api.clear(n);
      for (const r of obj.dados[n]) {
        if (typeof r.foto === 'string' && r.foto.startsWith('data:')) r.foto = await urlParaBlob(r.foto);
        await api.put(n, r);
      }
    }
  };
  return api;
})();
