/* Общие наборы классов Tailwind для экрана ведущего и телефона. */
(function () {
'use strict';

const btnBase = 'cursor-pointer border-2 font-extrabold transition duration-100 active:translate-y-[3px] disabled:opacity-45 disabled:cursor-not-allowed';
const btnKinds = {
  default: 'border-ink bg-white text-ink shadow-[0_3px_0_var(--color-ink)] hover:bg-[#f3f7ff] active:shadow-[0_0_0_var(--color-ink)]',
  primary: 'border-ink bg-orange text-white shadow-[0_3px_0_var(--color-ink)] hover:bg-[#ff6326] active:shadow-[0_0_0_var(--color-ink)]',
  danger: 'border-bad bg-white text-bad shadow-[0_3px_0_var(--color-bad)] hover:bg-[#fff3f5] active:shadow-[0_0_0_var(--color-bad)]',
  bar: 'border-white bg-transparent text-white shadow-[0_3px_0_#000] hover:bg-white/15 active:shadow-[0_0_0_#000]',
  barPrimary: 'border-orange bg-orange text-white shadow-[0_3px_0_#000] hover:bg-[#ff6326] active:shadow-[0_0_0_#000]',
  barDanger: 'border-[#ff8a9a] bg-transparent text-[#ff8a9a] shadow-[0_3px_0_#000] hover:bg-white/10 active:shadow-[0_0_0_#000]',
};
const btnSizes = {
  md: 'rounded-xl px-[1.3em] py-[0.75em] text-base',
  sm: 'rounded-[10px] px-[0.85em] py-[0.5em] text-[0.9rem]',
  block: 'rounded-[14px] p-4 text-[1.15rem] w-full',
};

// цвета вариантов ответа A…H (полные имена классов, чтобы Tailwind их нашёл)
const optBg = ['bg-blue', 'bg-orange', 'bg-teal', 'bg-pink', 'bg-c4', 'bg-c5', 'bg-c6', 'bg-c7'];

window.UI = {
  btn(kind, size) { return [btnBase, btnKinds[kind || 'default'], btnSizes[size || 'md']].join(' '); },
  optBg,
  field: 'rounded-xl border-2 border-line bg-white text-ink placeholder:text-[#8c9ab3] focus:border-blue focus:outline-none',
  fieldFull: 'w-full px-[0.9em] py-[0.7em]',
  err: 'min-h-[1.3em] font-extrabold text-bad',
  h1: 'font-display font-bold leading-[1.12] text-balance',
  brand: 'inline-flex items-center gap-2 font-mono text-[0.78rem] font-bold tracking-[0.1em] whitespace-nowrap uppercase',
  tickBar: 'ruler relative overflow-hidden border-2 border-ink bg-white',
  letter: 'grid shrink-0 place-items-center font-display',
};
})();
