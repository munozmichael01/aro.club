// Los tipos de Expo (process.env.EXPO_PUBLIC_*, require de Metro).
//
// Expo los mete con un `expo-env.d.ts` que genera `expo start` y que está en
// .gitignore: sin haber arrancado nada, `tsc` no los veía y fallaba o pasaba
// según lo que se hubiera ejecutado antes. Referenciados aquí, siempre están.
/// <reference types="expo/types" />
