export function choose(choices: any[]) {
  const index = Math.floor(Math.random() * choices.length)
  return choices[index]
}
