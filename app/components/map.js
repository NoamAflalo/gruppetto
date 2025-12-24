'use client';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

export default function SessionMap({ sessions, onMarkerClick }) {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  console.log('SessionMap rendering');
  console.log('API Key exists:', !!API_KEY);
  console.log('Number of sessions:', sessions?.length || 0);

  // Coordonnées des lieux de South West London
  const locationCoordinates = {
    'Battersea Park': { lat: 51.4816, lng: -0.1544 },
    'Richmond Park': { lat: 51.4508, lng: -0.2856 },
    'Chelsea Sports Centre Pool': { lat: 51.4871, lng: -0.1692 },
    'Clapham Common': { lat: 51.4618, lng: -0.1384 },
    'Wandsworth Common': { lat: 51.4497, lng: -0.1714 },
    'Other': { lat: 51.4700, lng: -0.1900 }
  };

  const center = { lat: 51.4700, lng: -0.1900 };

  if (!API_KEY) {
    return <div className="bg-red-100 p-4">Error: Google Maps API key not found</div>;
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ height: '500px', width: '100%' }}>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          mapId="workout-buddy-map"
        >
          {sessions?.map((session) => {
            const coords = locationCoordinates[session.location] || locationCoordinates['Other'];
            return (
              <Marker
                key={session.id}
                position={coords}
                onClick={() => onMarkerClick && onMarkerClick(session)}
                title={session.title}
              />
            );
          })}
        </Map>
      </div>
    </APIProvider>
  );
}