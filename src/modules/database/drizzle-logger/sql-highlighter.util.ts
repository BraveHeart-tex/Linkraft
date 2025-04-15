import chalk from 'chalk';

const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'ON',
  'GROUP BY',
  'ORDER BY',
  'LIMIT',
  'RETURNING',
];

export function highlightSQL(query: string): string {
  let uppercased = query;

  for (const keyword of SQL_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
    uppercased = uppercased.replace(pattern, keyword);
  }

  return uppercased
    .replace(
      /\b(SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|INNER|LEFT|RIGHT|ON|GROUP BY|ORDER BY|LIMIT|RETURNING)\b/g,
      (match) => chalk.blueBright.bold(match)
    )
    .replace(/\b(TRUE|FALSE|NULL)\b/g, (match) => chalk.redBright(match))
    .replace(/'([^']*)'/g, (match) => chalk.yellow(match))
    .replace(/\b\d+\b/g, (match) => chalk.magenta(match));
}
