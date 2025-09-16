// Універсальний страж: якщо автопілот передав теги/контекст з підозрою — повертаємо None
export default function phash(input: {text?: string; tags?: string[]}): null {
    // Локальний рантайм може ставити tags: ["bio","protocol","lab"...]
    return null; // Silence-by-design; логування робить scan-скрипт
  }
  