import { ui } from './ui';

export function useTranslations(lang: string) {
  return function t(key: keyof typeof ui['ca']) {
    return ui[lang as keyof typeof ui]?.[key] ?? ui['ca'][key];
  };
}