function getPadLength(obj: object, longest = 10): number {
  for (const name in obj) {
    if (name.length + 1 > longest) {
      longest = name.length + 1
    }
  }
  return longest
}

export default getPadLength
