import chalk from 'chalk';

export const highlightSQL = (query: string): string => {
  return query
    .replace(
      /\b(SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|INNER|LEFT|RIGHT|ON|GROUP BY|ORDER BY|LIMIT|RETURNING)\b/gi,
      (match) => chalk.blueBright.bold(match)
    )
    .replace(/\b(TRUE|FALSE|NULL)\b/gi, (match) => chalk.redBright(match))
    .replace(/'([^']*)'/g, (match) => chalk.yellow(match))
    .replace(/\b\d+\b/g, (match) => chalk.magenta(match));
};
