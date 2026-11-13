import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvWithCoordinates } from './csvParser';

test('recognizes X, Y columns as UTM Easting and Northing in auto-detect mode', () => {
  const csv = `Name,X,Y,Zone
WTG-01,595820,1678900,43N
WTG-02,597350,1680100,43N`;

  const res = parseCsvWithCoordinates(csv, { coordinateType: 'auto' });
  assert.equal(res.coordinateTypeDetected, 'utm');
  assert.equal(res.points.length, 2);
  assert.equal(res.points[0].name, 'WTG-01');
  assert.equal(res.points[0].easting, 595820);
  assert.equal(res.points[0].northing, 1678900);
  assert.ok(Math.abs(res.points[0].lat - 15.184) < 0.02, `expected lat ~15.184, got ${res.points[0].lat}`);
  assert.ok(Math.abs(res.points[0].lon - 75.892) < 0.02, `expected lon ~75.892, got ${res.points[0].lon}`);
});

test('recognizes X, Y columns as Decimal Degrees (X=Lon, Y=Lat) without swapping', () => {
  const csv = `WTG_Name,X,Y
TULJA-716,75.89243,15.18421
TULJA-717,75.90874,15.19532`;

  const res = parseCsvWithCoordinates(csv, { coordinateType: 'auto' });
  assert.equal(res.coordinateTypeDetected, 'decimal_degrees');
  assert.equal(res.points.length, 2);
  assert.equal(res.points[0].name, 'TULJA-716');
  assert.equal(res.points[0].lat, 15.18421);
  assert.equal(res.points[0].lon, 75.89243);
});

test('recognizes Easting, Northing columns even when they hold Decimal Degrees values', () => {
  const csv = `Name,Easting,Northing
Site-A,75.89243,15.18421
Site-B,75.90874,15.19532`;

  const res = parseCsvWithCoordinates(csv, { coordinateType: 'auto' });
  assert.equal(res.coordinateTypeDetected, 'decimal_degrees');
  assert.equal(res.points[0].lat, 15.18421);
  assert.equal(res.points[0].lon, 75.89243);
});

test('recognizes Easting, Northing with separate Zone and Southern Hemisphere columns', () => {
  const csv = `Turbine,Easting,Northing,Zone,Hemisphere
TURB-S1,513700,6971100,56,S`;

  const res = parseCsvWithCoordinates(csv, { coordinateType: 'utm' });
  assert.equal(res.coordinateTypeDetected, 'utm');
  assert.equal(res.utmZoneUsed, '56S');
  assert.ok(res.points[0].lat < -27 && res.points[0].lat > -28, `expected lat around -27.38, got ${res.points[0].lat}`);
  assert.ok(res.points[0].lon > 153 && res.points[0].lon < 154, `expected lon around 153.13, got ${res.points[0].lon}`);
});

test('handles UTF-8 BOM, X_Coord/Y_Coord headers, and comma-formatted UTM numbers', () => {
  const csv = `\uFEFFPoint_Name,X_Coord,Y_Coord
P1,"595,820","1,678,900"`;

  const res = parseCsvWithCoordinates(csv, {
    coordinateType: 'auto',
    defaultUtmZone: 43,
    defaultUtmHemisphere: 'N',
  });
  assert.equal(res.coordinateTypeDetected, 'utm');
  assert.equal(res.points[0].name, 'P1');
  assert.equal(res.points[0].easting, 595820);
  assert.equal(res.points[0].northing, 1678900);
  assert.ok(Math.abs(res.points[0].lat - 15.184) < 0.02);
});

test('recognizes X, Y columns containing DMS coordinates and maps X=Lon, Y=Lat', () => {
  const csv = `Turbine_ID,X,Y
WTG_A1,75° 53' 32.75" E,15° 11' 03.16" N`;

  const res = parseCsvWithCoordinates(csv, { coordinateType: 'auto' });
  assert.equal(res.coordinateTypeDetected, 'dms');
  assert.ok(Math.abs(res.points[0].lat - 15.18421) < 0.001);
  assert.ok(Math.abs(res.points[0].lon - 75.89243) < 0.001);
});

test('handles 2-column X, Y CSV without stealing coordinate as placemark name', () => {
  const csv = `X,Y
595820,1678900
597350,1680100`;

  const res = parseCsvWithCoordinates(csv, { coordinateType: 'auto', defaultUtmZone: 43, defaultUtmHemisphere: 'N' });
  assert.equal(res.coordinateTypeDetected, 'utm');
  assert.equal(res.points.length, 2);
  assert.equal(res.points[0].name, 'WTG_1');
  assert.ok(Math.abs(res.points[0].lat - 15.184) < 0.02);
});

test('rejects out-of-range UTM numbers when user forces decimal_degrees mode', () => {
  const csv = `Name,X,Y
WTG-01,595820,1678900`;

  assert.throws(() => {
    parseCsvWithCoordinates(csv, { coordinateType: 'decimal_degrees' });
  }, /valid geographic coordinates/i);
});
