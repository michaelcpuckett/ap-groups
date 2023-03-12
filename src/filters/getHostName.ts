export const getHostName = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return '';
  }
};