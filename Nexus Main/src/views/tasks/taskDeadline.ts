// Date fields edit the civil date already present in the stored deadline.
// They never reinterpret it in the device timezone or discard its time suffix.
export const taskDeadlineDate = (deadline?: string) =>
  deadline?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || ''

export const taskDeadlineForSave = (original: string | undefined, date: string) => {
  if (date === taskDeadlineDate(original)) return original
  if (!date) return undefined
  const timeSuffix = original?.match(/^\d{4}-\d{2}-\d{2}(T.*)$/)?.[1] || ''
  return `${date}${timeSuffix}`
}
