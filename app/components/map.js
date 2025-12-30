'use client';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { findLocation } from '@/lib/londonLocations';

export default function SessionMap({ sessions, onMarkerClick }) {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Centre par défaut : Centre de Londres
  const defaultCenter = { lat: 51.5074, lng: -0.1278 };

  // Préparer les sessions avec leurs coordonnées
  const sessionsWithCoords = sessions?.map(session => {
    // Extraire meeting point et destination si le format est "Point A → Point B"
    const locationParts = session.location.split(' → ');
    const meetingPoint = locationParts[0].trim();
    const destination = locationParts.length > 1 ? locationParts[1].trim() : null;

    const meetingCoords = findLocation(meetingPoint) || 
                          findLocation(session.meetingPoint) || 
                          defaultCenter;
    
    const destinationCoords = destination ? findLocation(destination) : null;

    return {
      ...session,
      meetingCoords,
      destinationCoords,
    };
  }) || [];

  // Calculer le centre de la map
  const calculateCenter = () => {
    if (sessionsWithCoords.length === 0) return defaultCenter;

    const allCoords = sessionsWithCoords.flatMap(s => [
      s.meetingCoords,
      ...(s.destinationCoords ? [s.destinationCoords] : [])
    ]);

    const avgLat = allCoords.reduce((sum, c) => sum + c.lat, 0) / allCoords.length;
    const avgLng = allCoords.reduce((sum, c) => sum + c.lng, 0) / allCoords.length;

    return { lat: avgLat, lng: avgLng };
  };

  if (!API_KEY) {
    return (
      <div className="bg-red-900 border border-red-500 p-4 rounded-lg text-white">
        ❌ Error: Google Maps API key not found
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <div style={{ height: '500px', width: '100%' }}>
        <Map
          defaultCenter={calculateCenter()}
          defaultZoom={11}
          mapId="workout-buddy-map"
        >
          {sessionsWithCoords.map((session) => (
            <div key={session.id}>
              {/* Meeting Point Marker */}
              <Marker
                position={session.meetingCoords}
                onClick={() => onMarkerClick && onMarkerClick(session)}
                title={`${session.title} - Start: ${session.location.split(' → ')[0]}`}
              />
              
              {/* Destination Marker (if exists) */}
              {session.destinationCoords && (
                <Marker
                  position={session.destinationCoords}
                  onClick={() => onMarkerClick && onMarkerClick(session)}
                  title={`${session.title} - End: ${session.location.split(' → ')[1]}`}
                  icon={{
                    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                    fillColor: '#10b981',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 1.5,
                  }}
                />
              )}
            </div>
          ))}
        </Map>
      </div>
    </APIProvider>
  );
}