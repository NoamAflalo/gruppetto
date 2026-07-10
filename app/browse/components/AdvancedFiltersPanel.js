'use client';
import DatePickerCalendar from '../../components/DatePickerCalendar';
import LocationAutocomplete from './LocationAutocomplete';

export default function AdvancedFiltersPanel({
  viewMode,
  filter,
  advancedFilters,
  setAdvancedFilters,
  isUserFemale,
}) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 mb-6 md:mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

        {/* From Date - Only in List View */}
        {viewMode === 'list' && (
          <DatePickerCalendar
            label="From Date"
            value={advancedFilters.dateFrom}
            onChange={(date) => setAdvancedFilters({ ...advancedFilters, dateFrom: date })}
            minDate={new Date().toISOString().split('T')[0]}
            placeholder="Select start date"
          />
        )}

        {/* To Date - Only in List View */}
        {viewMode === 'list' && (
          <DatePickerCalendar
            label="To Date"
            value={advancedFilters.dateTo}
            onChange={(date) => setAdvancedFilters({ ...advancedFilters, dateTo: date })}
            minDate={advancedFilters.dateFrom || new Date().toISOString().split('T')[0]}
            placeholder="Select end date"
          />
        )}

        {/* Location - All Views */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Location</label>
          <LocationAutocomplete
            value={advancedFilters.location}
            onChange={(value) => setAdvancedFilters({ ...advancedFilters, location: value })}
            activityFilter={filter}
            placeholder={filter === 'swimming' ? "Search pools..." : "Search location..."}
          />
        </div>

        {/* Intensity - All Views */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Intensity</label>
          <div className="flex gap-2">
            {['easy', 'moderate', 'hard'].map((intensity) => (
              <button
                key={intensity}
                type="button"
                onClick={() => {
                  if (advancedFilters.intensities.includes(intensity)) {
                    setAdvancedFilters({
                      ...advancedFilters,
                      intensities: advancedFilters.intensities.filter(i => i !== intensity)
                    });
                  } else {
                    setAdvancedFilters({
                      ...advancedFilters,
                      intensities: [...advancedFilters.intensities, intensity]
                    });
                  }
                }}
                className={`px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-semibold capitalize transition ${
                  advancedFilters.intensities.includes(intensity)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {intensity}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Girls Only Filter - Only visible for women */}
      {isUserFemale && (
        <div className="mt-4">
          <div className="flex items-center gap-3 bg-black rounded-xl p-4 border border-gray-800">
            <input
              type="checkbox"
              id="girlsOnlyFilter"
              checked={advancedFilters.girlsOnly}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, girlsOnly: e.target.checked })}
              className="w-5 h-5 rounded border-gray-600 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900"
            />
            <label htmlFor="girlsOnlyFilter" className="text-white font-semibold cursor-pointer flex items-center gap-2">
              👭 Girls Only Sessions
            </label>
          </div>
        </div>
      )}

      {/* Clear Filters */}
      <div className="mt-4">
        <button
          onClick={() => {
            if (viewMode === 'map') {
              setAdvancedFilters({ ...advancedFilters, specificDate: new Date().toISOString().split('T')[0], intensities: [], location: '', girlsOnly: false });
            } else {
              setAdvancedFilters({ dateFrom: '', dateTo: '', specificDate: new Date().toISOString().split('T')[0], intensities: [], location: '', girlsOnly: false });
            }
          }}
          className="text-sm text-gray-400 hover:text-orange-500 transition"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
