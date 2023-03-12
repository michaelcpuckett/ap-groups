export const stripDomain = (url: string) => {
  try {
    return new URL(url).pathname.slice(1);
  } catch (error) {
    return '';
  }
};