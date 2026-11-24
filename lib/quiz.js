'use strict';
// Общая логика вопросов и баллов: используется и локальным сервером, и функциями Vercel.

const MAX_POINTS = 10;
const MIN_POINTS = 1;

/* ---------- вопросы ---------- */

const SAMPLE = {
  autoEnd: true,
  questions: [
    { text: 'Что означает аббревиатура STEM?', options: ['Спорт, торговля, экономика, медиа', 'Наука, технологии, инженерия, математика', 'Системы, связь, электроника, механика', 'Статистика, тесты, эксперименты, моделирование'], correct: 1, seconds: 20 },
    { text: 'Какая архитектура нейросетей лежит в основе современных больших языковых моделей?', options: ['Свёрточные сети', 'Трансформеры', 'Деревья решений', 'Метод опорных векторов'], correct: 1, seconds: 20 },
    { text: 'Как называется процесс, в котором нейросеть подбирает свои параметры на примерах?', options: ['Обучение', 'Компиляция', 'Шифрование', 'Дефрагментация'], correct: 0, seconds: 15 },
  ],
};

function cleanQuiz(j) {
  const src = Array.isArray(j && j.questions) ? j.questions : [];
  const questions = src.slice(0, 100).map((q) => {
    const options = (Array.isArray(q && q.options) ? q.options : []).slice(0, 8).map((o) => String(o == null ? '' : o).slice(0, 400));
    while (options.length < 2) options.push('');
    let correct = Number.isInteger(q && q.correct) ? q.correct : -1;
    if (correct < -1 || correct >= options.length) correct = -1;
    let seconds = Math.round(Number(q && q.seconds));
    if (!Number.isFinite(seconds)) seconds = 20;
    seconds = Math.min(180, Math.max(5, seconds));
    return { text: String((q && q.text) || '').slice(0, 1000), options, correct, seconds };
  });
  return { questions, autoEnd: !(j && j.autoEnd === false) };
}

function validateQuiz(z) {
  if (!z.questions.length) return { error: 'Добавьте хотя бы один вопрос', code: 'v_none' };
  for (let i = 0; i < z.questions.length; i++) {
    const q = z.questions[i];
    const n = i + 1;
    if (!q.text.trim()) return { error: `Вопрос ${n}: нет текста вопроса`, code: 'v_notext', n };
    if (q.options.filter((o) => o.trim()).length < 2) return { error: `Вопрос ${n}: нужно минимум 2 варианта ответа`, code: 'v_few', n };
    if (q.correct < 0 || !q.options[q.correct].trim()) return { error: `Вопрос ${n}: не отмечен верный ответ`, code: 'v_nocorrect', n };
  }
  return null;
}

// убирает пустые варианты и пересчитывает номер верного
function compactQuestion(q) {
  const map = [];
  const options = [];
  q.options.forEach((o, i) => {
    if (o.trim()) { map[i] = options.length; options.push(o.trim()); }
  });
  return { text: q.text.trim(), options, correct: map[q.correct], seconds: q.seconds };
}


function calcPoints(ms, limitMs) {
  const ratio = Math.min(1, Math.max(0, ms / limitMs));
  return Math.round(MAX_POINTS - (MAX_POINTS - MIN_POINTS) * ratio);
}

function cleanName(s) {
  return String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}


module.exports = { MAX_POINTS, MIN_POINTS, SAMPLE, cleanQuiz, validateQuiz, compactQuestion, calcPoints, cleanName };
