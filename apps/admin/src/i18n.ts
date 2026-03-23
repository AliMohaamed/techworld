import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';

// Can be imported from a shared config
const locales = ['en', 'ar'];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || 'en';
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale)) notFound();

  const messagesDir = path.join(process.cwd(), 'src/messages', locale);
  let messages = {};

  if (fs.existsSync(messagesDir)) {
    const files = fs.readdirSync(messagesDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(messagesDir, file);
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        messages = { ...messages, ...fileContent };
      }
    }
  } else {
    // Fallback for transition
    messages = (await import(`./messages/${locale}.json`)).default;
  }

  return {
    locale,
    messages
  };
});
