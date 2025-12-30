'use client';

export default function LocationSelect({ value, onChange, label, required = true, activityType }) {
  // Si swimming, montrer seulement les piscines
  const showPoolsOnly = activityType === 'swimming';
  
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full p-3 md:p-4 bg-black border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
      >
        <option value="">Select location...</option>
        
        {showPoolsOnly ? (
          // PISCINES UNIQUEMENT
          <optgroup label="Swimming Pools">
            <option value="Chelsea Sports Centre Pool">Chelsea Sports Centre Pool</option>
            <option value="Oasis Sports Centre">Oasis Sports Centre</option>
            <option value="London Aquatics Centre">London Aquatics Centre</option>
            <option value="Tooting Bec Lido">Tooting Bec Lido</option>
            <option value="Hampstead Heath Ponds">Hampstead Heath Ponds</option>
            <option value="Serpentine Lido">Serpentine Lido</option>
            <option value="Parliament Hill Lido">Parliament Hill Lido</option>
            <option value="Ironmonger Row Baths">Ironmonger Row Baths</option>
            <option value="Marshall Street Leisure Centre">Marshall Street Leisure Centre</option>
            <option value="Porchester Spa">Porchester Spa</option>
          </optgroup>
        ) : (
          // TOUS LES LIEUX NORMAUX
          <>
            <optgroup label="Central">
              <option value="City Hall">City Hall</option>
              <option value="Tower Bridge">Tower Bridge</option>
              <option value="London Bridge">London Bridge</option>
              <option value="Bank">Bank</option>
            </optgroup>
            
            <optgroup label="South West">
              <option value="Battersea Park">Battersea Park</option>
              <option value="Clapham Common">Clapham Common</option>
              <option value="Wandsworth Common">Wandsworth Common</option>
              <option value="Richmond Park">Richmond Park</option>
              <option value="Wimbledon Common">Wimbledon Common</option>
              <option value="Putney Bridge">Putney Bridge</option>
              <option value="Fulham Palace">Fulham Palace</option>
            </optgroup>
            
            <optgroup label="North">
              <option value="Regents Park">Regents Park</option>
              <option value="Hampstead Heath">Hampstead Heath</option>
              <option value="Primrose Hill">Primrose Hill</option>
              <option value="Alexandra Palace">Alexandra Palace</option>
            </optgroup>
            
            <optgroup label="East">
              <option value="Victoria Park">Victoria Park</option>
              <option value="Olympic Park">Olympic Park</option>
              <option value="Canary Wharf">Canary Wharf</option>
              <option value="Greenwich Park">Greenwich Park</option>
            </optgroup>
            
            <optgroup label="West">
              <option value="Hyde Park">Hyde Park</option>
              <option value="Kensington Gardens">Kensington Gardens</option>
              <option value="Holland Park">Holland Park</option>
            </optgroup>
            
            <optgroup label="Thames Path">
              <option value="Embankment">Embankment</option>
              <option value="Westminster Bridge">Westminster Bridge</option>
              <option value="Waterloo Bridge">Waterloo Bridge</option>
              <option value="Blackfriars Bridge">Blackfriars Bridge</option>
              <option value="Albert Bridge">Albert Bridge</option>
              <option value="Chelsea Bridge">Chelsea Bridge</option>
            </optgroup>
          </>
        )}
      </select>
    </div>
  );
}