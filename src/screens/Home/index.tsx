import { RouteComponentProps } from '@reach/router';
import React, { useCallback, useEffect } from 'react';
import { Helmet } from 'react-helmet';

import ErrorMessage from '~/src/components/ErrorMessage';
import { LinedBlock } from '~/src/components/LinedBlock';
import { TimeTable } from '~/src/components/TimeTable';
import { useSelector } from '~/src/hooks/useSelector';
import { GeolocationErrors, useGeolocation } from '~/src/lib/useGeolocation';
import { fetchLineAdvisories } from '~/src/state/line/effects';
import { getAdvisoriesByLineId } from '~/src/state/line/selectors';
import { lineStore } from '~/src/state/line/store';
import {
  fetchStationPlatformsByStationId,
  handleCoordinatesUpdate,
} from '~/src/state/station/effects';
import {
  getNearbyStationIds,
  getPlatformsByStationId,
  getStationsById,
} from '~/src/state/station/selectors';
import { stationStore } from '~/src/state/station/store';
import { Station } from '~/src/state/station/types';

import * as styles from './styles.css';

const Home = (_: RouteComponentProps) => {
  // # Geolocation data
  const [
    coordinates,
    { error: coordinatesError, loading: coordinatesLoading },
  ] = useGeolocation({ updateMinimumDistance: 250 });

  // # Data dependencies
  const advisoriesByLineId = useSelector(lineStore, getAdvisoriesByLineId);
  const [nearbyStationIds] = useSelector(stationStore, getNearbyStationIds);
  const [stationsById] = useSelector(stationStore, getStationsById);
  const platformsByStationId = useSelector(
    stationStore,
    getPlatformsByStationId,
  );

  // # Effects

  useEffect(() => {
    handleCoordinatesUpdate([
      coordinates,
      { error: coordinatesError, loading: coordinatesLoading },
    ]);
  }, [coordinates, coordinatesError, coordinatesLoading]);

  // # Callbacks

  const loadData = useCallback((station: Station) => {
    fetchStationPlatformsByStationId(station.id);
    station.lineIds.forEach((lineId) => {
      fetchLineAdvisories(lineId);
    });
  }, []);

  const reloadPage = useCallback(() => {
    location.reload();
  }, []);

  // # Renders

  const renderTimeTable = useCallback(
    (stationId: string) => {
      if (!stationsById) {
        return null;
      }

      const station = stationsById[stationId];

      if (!station) {
        return null;
      }

      return (
        <TimeTable
          advisoriesByLineId={advisoriesByLineId}
          key={station.id}
          loadData={loadData}
          platformsByStationId={platformsByStationId}
          station={station}
        />
      );
    },
    [advisoriesByLineId, loadData, platformsByStationId, stationsById],
  );

  // # Component

  if (coordinatesLoading) {
    return (
      <LinedBlock>
        <ErrorMessage retryOnClick={reloadPage}>
          Finding nearby stations...
        </ErrorMessage>
      </LinedBlock>
    );
  }

  if (
    coordinatesError &&
    coordinatesError.message === GeolocationErrors.PERMISSION_DENIED
  ) {
    return (
      <LinedBlock>
        <ErrorMessage retryOnClick={reloadPage}>
          Unable to find nearby stations.
          <br />
          <br />
          Please allow location access.
        </ErrorMessage>
      </LinedBlock>
    );
  }

  if (coordinatesError || !coordinates) {
    return (
      <LinedBlock>
        <ErrorMessage retryOnClick={reloadPage}>
          Unable to find nearby stations.
          <br />
          <br />
          Please use the search bar above.
        </ErrorMessage>
      </LinedBlock>
    );
  }

  return (
    <>
      <Helmet>
        <title>SubwayTi.me</title>
      </Helmet>
      <div className={styles.Home}>
        {nearbyStationIds && nearbyStationIds.map(renderTimeTable)}
        <LinedBlock>
          <div className={styles.credits}>
            <p className={styles.smaller}>
              Built with <span className={styles.love}>&lt;3</span> by{' '}
              <a href="https://wes.dev/" target="_blank">
                @WesSouza
              </a>
              .
            </p>
            <p className={styles.smaller}>
              <a href="https://github.com/WesSouza/subway-time" target="_blank">
                Source code available on GitHub.
              </a>
            </p>
          </div>
        </LinedBlock>
      </div>
    </>
  );
};

export default Home;
