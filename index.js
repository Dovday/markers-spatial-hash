import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export class SpatialHash {
  constructor(markers, categories) {
    // find min lat, max lat, min lon, max lon
    const latitude = [];
    const longitude = [];

    markers.map((marker) => {
      // make sure marker has values lat and lon and not latitude and longitude
      latitude.push(marker.lat);
      longitude.push(marker.lon);
    });

    this.minLat = Math.min(...latitude);
    this.maxLat = Math.max(...latitude);
    this.minLon = Math.min(...longitude);
    this.maxLon = Math.max(...longitude);

    this.gridSize = 100;

    this.categories = [...categories];

    // create obj with an empty array for each cat in categories
    this.EMPTY_CELL = this.categories.reduce((acc, cat) => {
      acc[cat] = [];
      return acc;
    }, {});

    this.denominatorX = this.maxLon - this.minLon;
    this.denominatorY = this.maxLat - this.minLat;
    this.deltaLon = this.maxLon - this.minLon;
    this.deltaLat = this.maxLat - this.minLat;

    this.grid = new Array(this.gridSize)
      .fill(-1)
      .map(() => new Array(this.gridSize).fill(-1));
  }

  addPoint(point, category) {
    // normalize btw 0, 99 both for lat and for lon
    const nX =
      ((point.lon - this.minLon) / this.denominatorX) * (this.gridSize - 1);
    const nY =
      ((point.lat - this.minLat) / this.denominatorY) * (this.gridSize - 1);

    const x = Math.floor(nX);
    const y = Math.floor(nY);

    if (this.grid[x][y] === -1) {
      // so that we don't paste the ref to the same object
      this.grid[x][y] = JSON.parse(JSON.stringify(this.EMPTY_CELL));
    }

    this.grid[x][y][category].push({
      'uniqueId': uuidv4(),
      ...point
    });
  }

  getPointsInRegion(region, minDelta) {
    if (
      (region.latitudeDelta > minDelta) ||
      (region.longitudeDelta > minDelta)
    ) {
      return [];
    }

    // if region is outside of the grid return empty array
    if (
      region.latitude + region.latitudeDelta / 2 < this.minLat ||
      region.latitude - region.latitudeDelta / 2 > this.maxLat ||
      region.longitude + region.longitudeDelta / 2 < this.minLon ||
      region.longitude - region.longitudeDelta / 2 > this.maxLon
    ) {
      return [];
    }
    // normalize the region
    const xMin = Math.floor(
      ((region.longitude - region.longitudeDelta / 2 - this.minLon) /
        this.deltaLon) *
        (this.gridSize - 1)
    );
    const xMax = Math.floor(
      ((region.longitude + region.longitudeDelta / 2 - this.minLon) /
        this.deltaLon) *
        (this.gridSize - 1)
    );
    const yMin = Math.floor(
      ((region.latitude - region.latitudeDelta / 2 - this.minLat) /
        this.deltaLat) *
        (this.gridSize - 1)
    );
    const yMax = Math.floor(
      ((region.latitude + region.latitudeDelta / 2 - this.minLat) /
        this.deltaLat) *
        (this.gridSize - 1)
    );

    // dynamically create one array for each category and place em inside an object
    let markersToReturn = JSON.parse(JSON.stringify(this.EMPTY_CELL));

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
          continue;
        }

        const cell = this.grid[x][y];

        if (cell !== -1) {
          this.categories.forEach((cat) => {
            if (cell[cat]) {
              markersToReturn[cat] = markersToReturn[cat].concat(cell[cat]);
            }
          });
        }
      }
    }

    return markersToReturn;
  }
}

export default SpatialHash;
