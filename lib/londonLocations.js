export const londonLocations = [
  { name: 'City Hall', lat: 51.5045, lng: -0.0865, area: 'Central' },
  { name: 'Tower Bridge', lat: 51.5055, lng: -0.0754, area: 'Central' },
  { name: 'London Bridge', lat: 51.5079, lng: -0.0877, area: 'Central' },
  { name: 'St Pauls Cathedral', lat: 51.5138, lng: -0.0984, area: 'Central' },
  { name: 'Bank', lat: 51.5134, lng: -0.0889, area: 'Central' },
  
  { name: 'Battersea Park', lat: 51.4816, lng: -0.1544, area: 'South West' },
  { name: 'Clapham Common', lat: 51.4618, lng: -0.1384, area: 'South West' },
  { name: 'Wandsworth Common', lat: 51.4497, lng: -0.1714, area: 'South West' },
  { name: 'Richmond Park', lat: 51.4508, lng: -0.2856, area: 'South West' },
  { name: 'Wimbledon Common', lat: 51.4377, lng: -0.2344, area: 'South West' },
  { name: 'Putney Bridge', lat: 51.4681, lng: -0.2095, area: 'South West' },
  { name: 'Fulham Palace', lat: 51.4710, lng: -0.2107, area: 'South West' },
  
  { name: 'Regents Park', lat: 51.5313, lng: -0.1560, area: 'North' },
  { name: 'Hampstead Heath', lat: 51.5569, lng: -0.1615, area: 'North' },
  { name: 'Primrose Hill', lat: 51.5408, lng: -0.1631, area: 'North' },
  { name: 'Alexandra Palace', lat: 51.5979, lng: -0.1198, area: 'North' },
  
  { name: 'Victoria Park', lat: 51.5364, lng: -0.0393, area: 'East' },
  { name: 'Olympic Park', lat: 51.5434, lng: -0.0160, area: 'East' },
  { name: 'Canary Wharf', lat: 51.5054, lng: -0.0235, area: 'East' },
  { name: 'Greenwich Park', lat: 51.4769, lng: 0.0005, area: 'East' },
  
  { name: 'Hyde Park', lat: 51.5074, lng: -0.1657, area: 'West' },
  { name: 'Kensington Gardens', lat: 51.5074, lng: -0.1795, area: 'West' },
  { name: 'Holland Park', lat: 51.5024, lng: -0.2065, area: 'West' },
  
  { name: 'Embankment', lat: 51.5074, lng: -0.1224, area: 'Thames' },
  { name: 'Westminster Bridge', lat: 51.5007, lng: -0.1246, area: 'Thames' },
  { name: 'Waterloo Bridge', lat: 51.5101, lng: -0.1174, area: 'Thames' },
  { name: 'Blackfriars Bridge', lat: 51.5109, lng: -0.1040, area: 'Thames' },
  { name: 'Albert Bridge', lat: 51.4844, lng: -0.1687, area: 'Thames' },
  { name: 'Chelsea Bridge', lat: 51.4867, lng: -0.1477, area: 'Thames' },
  
  // PISCINES
  { name: 'Chelsea Sports Centre Pool', lat: 51.4871, lng: -0.1692, area: 'Pools', type: 'pool' },
  { name: 'Oasis Sports Centre', lat: 51.5164, lng: -0.1251, area: 'Pools', type: 'pool' },
  { name: 'London Aquatics Centre', lat: 51.5386, lng: -0.0142, area: 'Pools', type: 'pool' },
  { name: 'Tooting Bec Lido', lat: 51.4410, lng: -0.1461, area: 'Pools', type: 'pool' },
  { name: 'Hampstead Heath Ponds', lat: 51.5619, lng: -0.1645, area: 'Pools', type: 'pool' },
  { name: 'Serpentine Lido', lat: 51.5048, lng: -0.1659, area: 'Pools', type: 'pool' },
  { name: 'Parliament Hill Lido', lat: 51.5571, lng: -0.1531, area: 'Pools', type: 'pool' },
  { name: 'Ironmonger Row Baths', lat: 51.5288, lng: -0.0976, area: 'Pools', type: 'pool' },
  { name: 'Marshall Street Leisure Centre', lat: 51.5137, lng: -0.1378, area: 'Pools', type: 'pool' },
  { name: 'Porchester Spa', lat: 51.5164, lng: -0.1877, area: 'Pools', type: 'pool' },
];

export const findLocation = (name) => {
  return londonLocations.find(loc => loc.name === name);
};

export const getLocationsByArea = () => {
  const grouped = {};
  londonLocations.forEach(loc => {
    if (!grouped[loc.area]) {
      grouped[loc.area] = [];
    }
    grouped[loc.area].push(loc);
  });
  return grouped;
};

// NOUVEAU : Filtrer seulement les piscines
export const getPools = () => {
  return londonLocations.filter(loc => loc.type === 'pool');
};

// NOUVEAU : Filtrer tous sauf les piscines
export const getNonPools = () => {
  return londonLocations.filter(loc => loc.type !== 'pool');
};