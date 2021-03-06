import { Station } from './types';

export const search = (
  stations: Station[],
  query: string | null,
): Station[] => {
  const result: Station[] = [];

  if (!query) {
    return result;
  }

  if (query && query.length === 1) {
    const lineId = query.toUpperCase();
    stations.forEach((station) => {
      if (!station.lineIds.includes(lineId)) {
        return;
      }

      result.push(station);
    });
  }

  if (query && query.length > 1) {
    const queryCleaned = query
      .replace(/[^a-z0-9\s]/gi, '')
      .replace(/\s+ave(\s+|$)/gi, 'av')
      .replace(/\s+/g, '\\s+');
    const queryRegex = new RegExp(`(^|\\s+)${queryCleaned}`, 'i');
    stations.forEach((station) => {
      const hasInName = queryRegex.test(station.name);
      const hasInKeywords = station.keywords.some((keyword) =>
        queryRegex.test(keyword),
      );

      if (!hasInName && !hasInKeywords) {
        return;
      }

      result.push(station);
    });
  }

  return result;
};
