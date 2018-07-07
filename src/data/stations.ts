import {
  getRawSubwayLines,
  getRawSubwayStations,
  getRawTimesByLineId,
} from 'api/api';

import sortByObjectKey from 'lib/sortByObjectKey';

import { IStation, IStationLine } from 'models/models';

export const getStationWithTimes = async ({
  stationId,
}: {
  stationId: string;
}): Promise<IStation> => {
  const [rawLinesAll, rawStationsAll, rawStationTimes] = await Promise.all([
    getRawSubwayLines(),
    getRawSubwayStations(),
    getRawTimesByLineId(stationId),
  ]);
  const rawStations = rawStationsAll.filter(({ id }) => id === stationId);
  if (!rawStations.length) {
    throw new Error('Unable to find station.');
  }

  const lineColors = rawLinesAll.reduce(
    (colors, line) => ({ ...colors, [line.id]: line.color }),
    {},
  );

  const [primaryStation] = rawStations;

  const platforms: IStationLine[] = rawStations.map(
    ({ lineId, lineColor, status, type }) => ({
      line: {
        id: lineId,
        color: lineColor,
      },
      status,
      type,
      directions: rawStationTimes[lineId],
      sortKey: lineId,
    }),
  );

  const exceptionalPlatforms: IStationLine[] = Object.keys(rawStationTimes)
    .filter(
      lineId =>
        !Boolean(rawStations.find(rawStation => lineId === rawStation.lineId)),
    )
    .map(lineId => ({
      line: {
        id: lineId,
        color: lineColors[lineId],
      },
      directions: rawStationTimes[lineId],
      sortKey: lineId,
    }));

  const result = {
    id: stationId,
    name: primaryStation.name,
    boroughName: primaryStation.boroughName,
    coordinates: primaryStation.coordinates,
    lines: rawStations.map(({ lineId, lineColor }) => ({
      id: lineId,
      color: lineColor,
    })),
    platforms: platforms
      .concat(exceptionalPlatforms)
      .sort(sortByObjectKey('sortKey')),
  };

  return result;
};

let getStationsCache: IStation[];
export const getStations = async (): Promise<IStation[]> => {
  if (getStationsCache) {
    return getStationsCache;
  }

  const rawStations = await getRawSubwayStations();
  const stations: IStation[] = [];

  const stationsIndexById = {};

  rawStations.forEach(rawStation => {
    const {
      id,
      name,
      boroughName,
      coordinates,
      lineId,
      lineColor,
      status,
      type,
    } = rawStation;

    if (stationsIndexById[id]) {
      const index = stationsIndexById[id];

      stations[index].lines.push({
        id: lineId,
        color: lineColor,
      });
      stations[index].lineIds += lineId;
      stations[index].lineIds = (stations[index].lineIds as string)
        .split('')
        .sort()
        .join('');
      stations[index].lines.sort(sortByObjectKey('id'));

      stations[index].platforms.push({
        line: {
          id: lineId,
          color: lineColor,
        },
        status,
        type,
      });

      return;
    }

    stationsIndexById[id] = stations.length;

    stations.push({
      id,
      name,
      boroughName,
      coordinates,
      lines: [
        {
          id: lineId,
          color: lineColor,
        },
      ],
      lineIds: lineId,
      platforms: [
        {
          line: {
            id: lineId,
            color: lineColor,
          },
          status,
          type,
        },
      ],
    });
  });

  stations.sort(sortByObjectKey('name'));

  getStationsCache = stations;
  return stations;
};

export const searchStations = async ({
  search,
}: {
  search: string;
}): Promise<IStation[]> => {
  const stations = await getStations();
  let searchLineId = false;

  const searchCleaned = search
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, '\\s+');
  let searchRegex = new RegExp(`(^|\\s+)${searchCleaned}`, 'i');

  if (search.length === 1 && search.match(/[a-z1-7]/i)) {
    searchLineId = true;
    searchRegex = new RegExp(searchCleaned, 'i');
  }

  return stations.filter(
    station =>
      searchLineId && station.lineIds
        ? station.lineIds.match(searchRegex)
        : station.name.match(searchRegex),
  );
};