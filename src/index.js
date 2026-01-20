/**
 * filter-builder
 * 
 * A reusable filter builder UI component with AND/OR boolean connectors.
 * Accepts user-defined filter schemas and provides state management + UI components.
 */

// Components
export { FilterBuilder } from './components/FilterBuilder.js';
export { FilterGroup } from './components/FilterGroup.js';
export { FilterRow } from './components/FilterRow.js';

// State management
export { useFilterState, createFilterStore } from './state/store.js';

// Hooks
export {
    addFilterToGroup,
    createGroup,
    removeFilter,
    removeGroup,
    toggleGroupConnector,
    updateFilter
} from './hooks/useFilters.js';

// Serialization utilities
export {
    serializeFiltersToJsonLogic,
    deserializeFiltersFromJsonLogic,
    exportFiltersAsJson,
    importFiltersFromJson
} from './lib/filterSerializer.js';
