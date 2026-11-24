/* Языки интерфейса: қазақша и русский. Выбор хранится в браузере. */
(function () {
'use strict';

const D = {
  ru: {
    'host.title': 'STEM AI Innovation: ведущий',
    'player.title': 'STEM AI Innovation',
    'space': 'Пробел',
    'pts': ['балл', 'балла', 'баллов'],
    'participants': ['участник', 'участника', 'участников'],
    'questions': ['вопрос', 'вопроса', 'вопросов'],

    'login.pin': 'Введите PIN ведущего.',
    'login.btn': 'Войти',
    'login.bad': 'Неверный PIN',

    'lobby.eyebrow': 'Викторина',
    'lobby.lead': 'Наведите камеру телефона на QR-код и введите имя и фамилию',
    'lobby.urltitle': 'Адрес для входа',
    'lobby.switch': 'Не открывается? Нажмите на адрес, покажу другой.',
    'lobby.empty': 'Здесь появятся имена тех, кто зашёл.',
    'lobby.warn': 'Этот адрес работает только в той же Wi-Fi сети. Для участников с мобильным интернетом нужен публичный адрес (туннель или хостинг).',
    'kick': 'Убрать участника',
    'kick.named': 'Убрать участника {name}',

    'bar.link': 'Связь с сервером',
    'bar.fs': 'Во весь экран',
    'bar.confirm': 'Точно? Нажмите ещё раз',
    'bar.lobbyNote': '{n} {w} · до 10 баллов за вопрос',
    'bar.editor': 'Редактор вопросов',
    'bar.clear': 'Убрать всех участников',
    'bar.start': 'Начать игру ▶',
    'bar.qnote': 'Вопрос {x} из {n}',
    'bar.reveal': 'Показать ответ',
    'bar.revealed': 'Вопрос {x} из {n} · ответ показан',
    'bar.board': 'Рейтинг',
    'bar.next': 'Следующий вопрос →',
    'bar.final': 'Итоги ★',
    'bar.boardNote': 'Рейтинг после вопроса {x} из {n}',
    'bar.over': 'Игра окончена',
    'bar.newroom': 'Новый зал',
    'bar.again': 'Сыграть ещё раз',
    'bar.paste': 'Вставить списком',
    'bar.tolobby': 'К залу ожидания →',

    'save.ing': 'Сохранение…',
    'save.ok': 'Сохранено ✓',
    'save.fail': 'Не сохранено: ',

    'ed.title': 'Вопросы викторины',
    'ed.hint': 'За каждый вопрос можно получить до 10 баллов. Чем быстрее верный ответ, тем больше баллов. Неверный ответ или его отсутствие дают 0.',
    'ed.auto': 'Показывать ответ сразу, когда ответили все, кто подключён',
    'ed.add': '+ Добавить вопрос',
    'ed.empty': 'Вопросов пока нет. Добавьте первый или вставьте список целиком.',
    'ed.qn': 'Вопрос {n}',
    'ed.time': 'Время на ответ, сек ',
    'ed.qph': 'Текст вопроса',
    'ed.oph': 'Вариант ответа {l}',
    'ed.ok': 'Верный',
    'ed.rm': 'Убрать вариант',
    'ed.rma': 'Убрать вариант {l}',
    'ed.addopt': '+ Вариант',
    'ed.up': 'Поднять вопрос',
    'ed.down': 'Опустить вопрос',
    'ed.del': 'Удалить',
    'ed.delq': 'Удалить вопрос',
    'ed.sure': 'Точно?',

    'imp.title': 'Вставить вопросы списком',
    'imp.help': 'Вопросы разделяйте пустой строкой. Первая строка — вопрос, дальше варианты. Перед верным ответом поставьте «+».',
    'imp.ex': 'Какая планета самая большая?\nСатурн\n+Юпитер\nНептун\n\nСколько секунд в часе?\n360\n+3600\n6000',
    'imp.ph': 'Вставьте вопросы сюда',
    'imp.err': 'Не нашёл вопросов. В каждом нужен текст и минимум 2 варианта, блоки разделены пустой строкой.',
    'imp.cancel': 'Отмена',
    'imp.ok': 'Добавить',
    'imp.added': 'Добавлено вопросов: {n}',
    'imp.nocorrect': '. Без отмеченного ответа: {n}',

    'val.none': 'Добавьте хотя бы один вопрос',
    'val.notext': 'Вопрос {n}: нет текста вопроса',
    'val.few': 'Вопрос {n}: нужно минимум 2 варианта ответа',
    'val.nocorrect': 'Вопрос {n}: не отмечен верный ответ',

    'q.num': 'Вопрос {x} / {n}',
    'q.answered': 'Ответили {a} из {c}',
    'q.correct': 'Верно ответили {a} из {c}',
    'q.sec': 'с',

    'bd.title': 'Рейтинг',
    'bd.sub': 'После вопроса {x} из {n}',
    'bd.more': '…и ещё {n} {w}',
    'fn.title': 'Итоги викторины',
    'fn.none': 'Нет участников.',

    'err.bad_request': 'Некорректный запрос',
    'err.not_found': 'Не найдено',
    'err.server': 'Ошибка сервера',
    'err.no_db': 'Не подключена база данных Redis (Upstash)',
    'err.need_name': 'Введите имя и фамилию',
    'err.limit': 'Достигнут лимит участников',
    'err.join_fail': 'Не удалось войти. Попробуйте ещё раз',
    'err.bad_pin': 'Неверный PIN',
    'err.locked': 'Вопросы можно менять только до начала игры',
    'err.already_started': 'Игра уже идёт',
    'err.not_question': 'Сейчас не идёт вопрос',
    'err.board_after_reveal': 'Рейтинг показывают после ответа',
    'err.too_early': 'Рано',
    'err.unknown_action': 'Неизвестное действие',
    'err.v_none': 'Добавьте хотя бы один вопрос',
    'err.v_notext': 'Вопрос {n}: нет текста вопроса',
    'err.v_few': 'Вопрос {n}: нужно минимум 2 варианта ответа',
    'err.v_nocorrect': 'Вопрос {n}: не отмечен верный ответ',

    'pl.joinTitle': 'Как вас зовут?',
    'pl.joinSub': 'Имя и фамилия появятся в рейтинге на большом экране.',
    'pl.first': 'Имя',
    'pl.last': 'Фамилия',
    'pl.go': 'Войти в игру',
    'pl.conn': 'Нет связи. Переподключаюсь…',
    'pl.waitTitle': 'Вы в игре, {name}!',
    'pl.waitSub': 'Ждём, когда ведущий начнёт. Следите за большим экраном.',
    'pl.inRoom': '{n} {w} в зале',
    'pl.pick': 'Выберите ответ',
    'pl.accepted': 'Ответ принят. Ждём остальных…',
    'pl.timeup': 'Время вышло',
    'pl.late': 'Время вышло, ответ не принят',
    'pl.sendfail': 'Не получилось отправить. Нажмите ещё раз',
    'pl.offline': 'Нет связи. Нажмите ещё раз',
    'res.noneTitle': 'Нет ответа',
    'res.noneSub': 'В этот раз баллов нет. Следующий вопрос — ваш.',
    'res.good': 'Верно!',
    'res.pts': '{p} {w} · ответ за {s} с',
    'res.bad': 'Неверно',
    'res.right': 'Верный ответ: {a}',
    'res.watch': 'Смотрите на большой экран',
    'pl.boardKicker': 'Рейтинг',
    'pl.boardLook': 'Смотрите на экран',
    'pl.boardPlace': 'ваше место из {n}',
    'pl.finalKicker': 'Игра окончена',
    'pl.finalPlace': 'место из {n}',
    'pl.podium': 'Вы на подиуме!',
    'pl.thanks': 'Спасибо за игру!',
    'stat.place': 'место',
    'stat.of': '{r} из {n}',
  },

  kk: {
    'host.title': 'STEM AI Innovation: жүргізуші',
    'player.title': 'STEM AI Innovation',
    'space': 'Бос орын',
    'pts': 'балл',
    'participants': 'қатысушы',
    'questions': 'сұрақ',

    'login.pin': 'Жүргізушінің PIN кодын енгізіңіз.',
    'login.btn': 'Кіру',
    'login.bad': 'PIN қате',

    'lobby.eyebrow': 'Викторина',
    'lobby.lead': 'Телефон камерасын QR-кодқа бағыттап, аты-жөніңізді енгізіңіз',
    'lobby.urltitle': 'Кіру мекенжайы',
    'lobby.switch': 'Ашылмай ма? Мекенжайды басыңыз, басқасын көрсетемін.',
    'lobby.empty': 'Кіргендердің аты-жөні осында шығады.',
    'lobby.warn': 'Бұл мекенжай тек бір Wi-Fi желісінде жұмыс істейді. Мобильді интернеттегі қатысушыларға ашық мекенжай (туннель немесе хостинг) керек.',
    'kick': 'Қатысушыны алып тастау',
    'kick.named': 'Қатысушыны алып тастау: {name}',

    'bar.link': 'Серверге қосылым',
    'bar.fs': 'Толық экран',
    'bar.confirm': 'Сенімдісіз бе? Қайта басыңыз',
    'bar.lobbyNote': '{n} {w} · әр сұраққа 10 балға дейін',
    'bar.editor': 'Сұрақтар редакторы',
    'bar.clear': 'Барлық қатысушыны жою',
    'bar.start': 'Ойынды бастау ▶',
    'bar.qnote': 'Сұрақ {x} / {n}',
    'bar.reveal': 'Жауапты көрсету',
    'bar.revealed': 'Сұрақ {x} / {n} · жауап көрсетілді',
    'bar.board': 'Рейтинг',
    'bar.next': 'Келесі сұрақ →',
    'bar.final': 'Қорытынды ★',
    'bar.boardNote': '{x}-сұрақтан кейінгі рейтинг (барлығы {n})',
    'bar.over': 'Ойын аяқталды',
    'bar.newroom': 'Жаңа зал',
    'bar.again': 'Тағы бір рет ойнау',
    'bar.paste': 'Тізіммен қою',
    'bar.tolobby': 'Күту залына →',

    'save.ing': 'Сақталуда…',
    'save.ok': 'Сақталды ✓',
    'save.fail': 'Сақталмады: ',

    'ed.title': 'Викторина сұрақтары',
    'ed.hint': 'Әр сұраққа 10 балға дейін алуға болады. Дұрыс жауап неғұрлым тез берілсе, соғұрлым көп балл беріледі. Қате жауап немесе жауап болмаса, балл берілмейді.',
    'ed.auto': 'Қосылған барлық қатысушы жауап бергенде, жауапты бірден көрсету',
    'ed.add': '+ Сұрақ қосу',
    'ed.empty': 'Әзірге сұрақ жоқ. Біріншісін қосыңыз немесе тізімді түгел қойыңыз.',
    'ed.qn': 'Сұрақ {n}',
    'ed.time': 'Жауап беру уақыты, сек ',
    'ed.qph': 'Сұрақ мәтіні',
    'ed.oph': 'Жауап нұсқасы {l}',
    'ed.ok': 'Дұрыс',
    'ed.rm': 'Нұсқаны алып тастау',
    'ed.rma': 'Нұсқаны алып тастау: {l}',
    'ed.addopt': '+ Нұсқа',
    'ed.up': 'Сұрақты жоғары жылжыту',
    'ed.down': 'Сұрақты төмен жылжыту',
    'ed.del': 'Жою',
    'ed.delq': 'Сұрақты жою',
    'ed.sure': 'Сенімдісіз бе?',

    'imp.title': 'Сұрақтарды тізіммен қою',
    'imp.help': 'Сұрақтарды бос жолмен бөліңіз. Бірінші жол – сұрақ, одан кейін жауап нұсқалары. Дұрыс жауаптың алдына «+» қойыңыз.',
    'imp.ex': 'Күн жүйесіндегі ең үлкен планета қайсы?\nСатурн\n+Юпитер\nНептун\n\nБір сағатта неше секунд бар?\n360\n+3600\n6000',
    'imp.ph': 'Сұрақтарды осы жерге қойыңыз',
    'imp.err': 'Сұрақ табылмады. Әр сұрақта мәтін және кемінде 2 нұсқа болуы керек, сұрақтар бос жолмен бөлінеді.',
    'imp.cancel': 'Болдырмау',
    'imp.ok': 'Қосу',
    'imp.added': 'Қосылған сұрақ: {n}',
    'imp.nocorrect': '. Дұрыс жауабы белгіленбеген: {n}',

    'val.none': 'Кемінде бір сұрақ қосыңыз',
    'val.notext': '{n}-сұрақ: сұрақ мәтіні жоқ',
    'val.few': '{n}-сұрақ: кемінде 2 жауап нұсқасы керек',
    'val.nocorrect': '{n}-сұрақ: дұрыс жауап белгіленбеген',

    'q.num': 'Сұрақ {x} / {n}',
    'q.answered': 'Жауап берді: {a} / {c}',
    'q.correct': 'Дұрыс жауап берді: {a} / {c}',
    'q.sec': 'с',

    'bd.title': 'Рейтинг',
    'bd.sub': '{x}-сұрақтан кейін · барлығы {n}',
    'bd.more': '…және тағы {n} {w}',
    'fn.title': 'Викторина қорытындысы',
    'fn.none': 'Қатысушылар жоқ.',

    'err.bad_request': 'Қате сұраныс',
    'err.not_found': 'Табылмады',
    'err.server': 'Сервер қатесі',
    'err.no_db': 'Redis дерекқоры қосылмаған (Upstash)',
    'err.need_name': 'Аты мен тегін енгізіңіз',
    'err.limit': 'Қатысушылар лимиті толды',
    'err.join_fail': 'Кіру мүмкін болмады. Қайталап көріңіз',
    'err.bad_pin': 'PIN қате',
    'err.locked': 'Сұрақтарды тек ойын басталғанға дейін өзгертуге болады',
    'err.already_started': 'Ойын әлдеқашан басталды',
    'err.not_question': 'Қазір сұрақ жүріп жатқан жоқ',
    'err.board_after_reveal': 'Рейтингті жауап көрсетілгеннен кейін көрсетеді',
    'err.too_early': 'Әлі ерте',
    'err.unknown_action': 'Белгісіз әрекет',
    'err.v_none': 'Кемінде бір сұрақ қосыңыз',
    'err.v_notext': '{n}-сұрақ: сұрақ мәтіні жоқ',
    'err.v_few': '{n}-сұрақ: кемінде 2 жауап нұсқасы керек',
    'err.v_nocorrect': '{n}-сұрақ: дұрыс жауап белгіленбеген',

    'pl.joinTitle': 'Атыңыз кім?',
    'pl.joinSub': 'Аты-жөніңіз үлкен экрандағы рейтингте көрсетіледі.',
    'pl.first': 'Аты',
    'pl.last': 'Тегі',
    'pl.go': 'Ойынға кіру',
    'pl.conn': 'Байланыс жоқ. Қайта қосылып жатыр…',
    'pl.waitTitle': 'Сіз ойындасыз, {name}!',
    'pl.waitSub': 'Жүргізуші бастағанша күтіңіз. Үлкен экранды қадағалаңыз.',
    'pl.inRoom': 'Залда {n} {w}',
    'pl.pick': 'Жауапты таңдаңыз',
    'pl.accepted': 'Жауап қабылданды. Басқаларын күтеміз…',
    'pl.timeup': 'Уақыт бітті',
    'pl.late': 'Уақыт бітті, жауап қабылданбады',
    'pl.sendfail': 'Жіберілмеді. Қайта басыңыз',
    'pl.offline': 'Байланыс жоқ. Қайта басыңыз',
    'res.noneTitle': 'Жауап жоқ',
    'res.noneSub': 'Бұл жолы балл жоқ. Келесі сұрақ сіздікі.',
    'res.good': 'Дұрыс!',
    'res.pts': '{p} {w} · жауап уақыты {s} с',
    'res.bad': 'Қате',
    'res.right': 'Дұрыс жауап: {a}',
    'res.watch': 'Үлкен экранға қараңыз',
    'pl.boardKicker': 'Рейтинг',
    'pl.boardLook': 'Экранға қараңыз',
    'pl.boardPlace': 'сіздің орныңыз, барлығы {n}',
    'pl.finalKicker': 'Ойын аяқталды',
    'pl.finalPlace': 'орын, барлығы {n}',
    'pl.podium': 'Сіз жүлдегерлер қатарындасыз!',
    'pl.thanks': 'Ойнағаныңызға рахмет!',
    'stat.place': 'орын',
    'stat.of': '{r} / {n}',
  },
};

let lang = 'ru';
try {
  const saved = localStorage.getItem('quiz.lang');
  if (saved === 'kk' || saved === 'ru') lang = saved;
  else if (/^kk/i.test(navigator.language || '')) lang = 'kk';
} catch (e) { /* хранилище недоступно */ }

function pluralRu(n, f) {
  const m = n % 100, k = n % 10;
  if (m > 10 && m < 20) return f[2];
  if (k === 1) return f[0];
  if (k >= 2 && k <= 4) return f[1];
  return f[2];
}

function has(key) { return D[lang][key] != null || D.ru[key] != null; }

function t(key, p) {
  p = p || {};
  let v = D[lang][key];
  if (v == null) v = D.ru[key];
  if (v == null) return key;
  if (Array.isArray(v)) v = pluralRu(Number(p.n) || 0, v);
  return v.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m));
}

function setLang(l) {
  lang = l === 'kk' ? 'kk' : 'ru';
  try { localStorage.setItem('quiz.lang', lang); } catch (e) { /* ignore */ }
  document.documentElement.lang = lang;
}

// подставляет переводы в элементы с data-i18n, data-i18n-ph (placeholder), data-i18n-title
function apply(root) {
  const r = root || document;
  r.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  r.querySelectorAll('[data-i18n-ph]').forEach((e) => { e.placeholder = t(e.dataset.i18nPh); });
  r.querySelectorAll('[data-i18n-title]').forEach((e) => { e.title = t(e.dataset.i18nTitle); });
}

// переключатель «ҚАЗ | РУС»; dark = светлая кнопка на тёмной панели
function switcher(onChange, dark) {
  const w = document.createElement('div');
  w.className = 'inline-flex overflow-hidden rounded-[10px] border-2 border-current font-mono text-[0.8rem] font-bold';
  w.setAttribute('role', 'group');
  w.setAttribute('aria-label', 'Тіл / Язык');
  [['kk', 'ҚАЗ'], ['ru', 'РУС']].forEach(([l, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    const on = lang === l;
    b.className = 'cursor-pointer px-[0.7em] py-[0.45em] tracking-[0.06em] ' + (on ? (dark ? 'bg-white text-ink' : 'bg-ink text-white') : 'bg-transparent');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.onclick = () => { if (lang === l) return; setLang(l); if (onChange) onChange(l); };
    w.append(b);
  });
  return w;
}

document.documentElement.lang = lang;
window.I18N = { t, has, setLang, apply, switcher, get lang() { return lang; } };
})();
