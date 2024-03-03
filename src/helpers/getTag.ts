interface Message {
  Tags: { name: string; value: string }[];
}

export function getTagByName(message: Message, name: string) {
  return message?.Tags?.find((tag) => tag.name === name);
}

export function getTagByValue(message: Message, value: string) {
  return message?.Tags?.find((tag) => tag.value === value);
}

export function getTagByNameValue(
  message: Message,
  name: string,
  value: string
) {
  return message?.Tags?.find((tag) => tag.name === name && tag.value === value);
}
