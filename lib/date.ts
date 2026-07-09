/**
 * Formata uma data "date-only" (YYYY-MM-DD) em pt-BR SEM deslocamento de fuso.
 *
 * `scheduledDate` das publicações vem de um <input type="date">, ou seja, uma
 * string tipo "2026-07-17" (sem horário). `new Date("2026-07-17")` é interpretado
 * como meia-noite UTC; ao formatar em horário local (Brasil, UTC-3) o resultado
 * volta um dia (exibe 16/07). Aqui parseamos os componentes como data LOCAL,
 * eliminando o off-by-one.
 */
export function formatDateBR(value?: string | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('pt-BR');
  }
  // Fallback para valores que não sejam date-only (ex.: ISO completo).
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pt-BR');
}
