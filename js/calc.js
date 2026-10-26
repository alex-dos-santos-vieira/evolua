/* Evolua — fórmulas de diagnóstico (referências no README) */
const Calc = {
  idade(nasc, ref) {
    const b = new Date(nasc + 'T12:00:00'), x = new Date((ref || new Date().toISOString().slice(0, 10)) + 'T12:00:00');
    let a = x.getFullYear() - b.getFullYear();
    if (x.getMonth() < b.getMonth() || (x.getMonth() === b.getMonth() && x.getDate() < b.getDate())) a--;
    return a;
  },
  imc: (peso, alt) => peso / Math.pow(alt / 100, 2),
  imcClasse(v) {
    if (v < 18.5) return ['Baixo peso', 'warn'];
    if (v < 25) return ['Peso normal', 'ok'];
    if (v < 30) return ['Sobrepeso', 'warn'];
    if (v < 35) return ['Obesidade grau I', 'bad'];
    if (v < 40) return ['Obesidade grau II', 'bad'];
    return ['Obesidade grau III', 'bad'];
  },
  cinturaLimites: (sexo) => sexo === 'F' ? [80, 88] : [94, 102],
  cinturaClasse(c, sexo) {
    const [a, b] = Calc.cinturaLimites(sexo);
    if (c < a) return ['Sem risco aumentado', 'ok'];
    if (c < b) return ['Risco aumentado', 'warn'];
    return ['Risco muito aumentado', 'bad'];
  },
  rce: (cintura, alt) => cintura / alt,
  rceClasse(v) {
    if (v < 0.5) return ['Adequada', 'ok'];
    if (v < 0.6) return ['Risco aumentado', 'warn'];
    return ['Risco alto', 'bad'];
  },
  /* Relative Fat Mass — Woolcott & Bergman, 2018 */
  rfm: (alt, cintura, sexo) => (sexo === 'F' ? 76 : 64) - 20 * (alt / cintura),
  /* Marinha dos EUA (Hodgdon & Beckett), medidas em cm */
  navy(sexo, alt, cintura, pescoco, quadril) {
    if (!pescoco || !cintura) return null;
    if (sexo === 'F') {
      if (!quadril) return null;
      return 495 / (1.29579 - 0.35004 * Math.log10(cintura + quadril - pescoco) + 0.22100 * Math.log10(alt)) - 450;
    }
    if (cintura - pescoco <= 0) return null;
    return 495 / (1.0324 - 0.19077 * Math.log10(cintura - pescoco) + 0.15456 * Math.log10(alt)) - 450;
  },
  /* Faixas saudáveis de gordura por idade — Gallagher et al., 2000 */
  gordFaixa(sexo, idade) {
    if (sexo === 'F') return idade < 40 ? [21, 32] : idade < 60 ? [23, 33] : [24, 35];
    return idade < 40 ? [8, 19] : idade < 60 ? [11, 21] : [13, 24];
  },
  gordClasse(pct, sexo, idade) {
    const [a, b] = Calc.gordFaixa(sexo, idade);
    if (pct < a) return ['Abaixo da faixa', 'warn'];
    if (pct <= b) return ['Saudável', 'ok'];
    if (pct <= b + 5) return ['Acima da faixa', 'warn'];
    return ['Elevada', 'bad'];
  },
  mifflin: (p, h, i, sexo) => 10 * p + 6.25 * h - 5 * i + (sexo === 'F' ? -161 : 5),
  harris: (p, h, i, sexo) => sexo === 'F' ? 447.593 + 9.247 * p + 3.098 * h - 4.330 * i : 88.362 + 13.397 * p + 4.799 * h - 5.677 * i,
  katch: (massaMagra) => 370 + 21.6 * massaMagra,
  FATORES: [[1.2, 'Sedentário'], [1.375, 'Leve (1 a 3x por semana)'], [1.55, 'Moderado (3 a 5x por semana)'], [1.725, 'Intenso (6 a 7x por semana)'], [1.9, 'Muito intenso (2x por dia)']],

  metas(perfil, peso, ref) {
    const idade = Calc.idade(perfil.nascimento, ref);
    const tmb = Calc.mifflin(peso, perfil.altura_cm, idade, perfil.sexo);
    const get = tmb * perfil.fator_atividade;
    const kcal = Math.round(get - (perfil.deficit_kcal || 0));
    const prot = Math.round(perfil.proteina_g_kg * peso);
    const gord = Math.round(kcal * perfil.gordura_pct / 9);
    const carb = Math.max(0, Math.round((kcal - prot * 4 - gord * 9) / 4));
    return { idade, tmb: Math.round(tmb), get: Math.round(get), kcal, prot, gord, carb, agua_l: Math.round(perfil.agua_ml_kg * peso / 100) / 10, perda_sem_g: Math.round((get - kcal) * 7 / 7.7 / 10) * 10 };
  },

  diagnostico(perfil, m) {
    const h = perfil.altura_cm, sexo = perfil.sexo, idade = Calc.idade(perfil.nascimento, m.data);
    const d = { idade, peso: m.peso, cintura: m.cintura };
    if (m.peso) {
      d.imc = Calc.imc(m.peso, h); d.imcClasse = Calc.imcClasse(d.imc);
      d.pesoMin = 18.5 * Math.pow(h / 100, 2); d.pesoMax = 24.9 * Math.pow(h / 100, 2);
    }
    if (m.cintura) {
      d.cinturaClasse = Calc.cinturaClasse(m.cintura, sexo);
      d.rce = Calc.rce(m.cintura, h); d.rceClasse = Calc.rceClasse(d.rce); d.cinturaAlvo = h * 0.5;
      d.rfm = Calc.rfm(h, m.cintura, sexo);
    }
    d.navy = Calc.navy(sexo, h, m.cintura, m.pescoco, m.quadril);
    d.gord = d.navy != null ? d.navy : d.rfm;
    d.gordMetodo = d.navy != null ? 'Marinha dos EUA' : 'RFM';
    if (d.gord != null) {
      d.gordFaixa = Calc.gordFaixa(sexo, idade); d.gordClasse = Calc.gordClasse(d.gord, sexo, idade);
      if (m.peso) { d.massaGorda = m.peso * d.gord / 100; d.massaMagra = m.peso - d.massaGorda; }
    }
    if (m.peso) {
      d.tmbMifflin = Calc.mifflin(m.peso, h, idade, sexo);
      d.tmbHarris = Calc.harris(m.peso, h, idade, sexo);
      if (d.massaMagra) d.tmbKatch = Calc.katch(d.massaMagra);
      d.metas = Calc.metas(perfil, m.peso, m.data);
    }
    return d;
  }
};
