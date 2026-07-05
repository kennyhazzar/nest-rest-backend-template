import { getCountryByAlpha2 } from 'country-locale-map';

const defaultLocation = getCountryByAlpha2('RU');
export const defaultCountry = defaultLocation?.alpha2 ?? 'RU';
export const defaultLanguage = defaultLocation?.languages[0] ?? 'ru';
export const defaultLocale = defaultLocation?.default_locale ?? 'ru_RU';
