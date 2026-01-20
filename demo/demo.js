import { render } from 'preact';
import { html } from 'htm/preact';
import { FilterBuilder, useFilterState } from '../src/index.js';
import {
    addFilterToGroup,
    createGroup,
    removeFilter,
    removeGroup,
    toggleGroupConnector,
    updateFilter
} from '../src/hooks/useFilters.js';
import '../src/styles/filter-builder.css';

// Sample positions data
const positionsData = [
    { id: 1, title: 'Senior Software Engineer', yearsExperience: 5, education: 'Bachelor', location: 'San Francisco', salary: 150000, remote: true },
    { id: 2, title: 'Junior Developer', yearsExperience: 1, education: 'Bachelor', location: 'New York', salary: 70000, remote: false },
    { id: 3, title: 'Data Scientist', yearsExperience: 3, education: 'Master', location: 'Seattle', salary: 120000, remote: true },
    { id: 4, title: 'Product Manager', yearsExperience: 4, education: 'MBA', location: 'Austin', salary: 130000, remote: false },
    { id: 5, title: 'DevOps Engineer', yearsExperience: 6, education: 'Bachelor', location: 'Remote', salary: 140000, remote: true },
    { id: 6, title: 'Frontend Developer', yearsExperience: 2, education: 'Bachelor', location: 'Boston', salary: 85000, remote: true },
    { id: 7, title: 'Backend Engineer', yearsExperience: 4, education: 'Master', location: 'Chicago', salary: 125000, remote: false },
    { id: 8, title: 'Full Stack Developer', yearsExperience: 3, education: 'Bachelor', location: 'Denver', salary: 110000, remote: true },
    { id: 9, title: 'Machine Learning Engineer', yearsExperience: 5, education: 'PhD', location: 'San Francisco', salary: 180000, remote: false },
    { id: 10, title: 'QA Engineer', yearsExperience: 2, education: 'Bachelor', location: 'Portland', salary: 75000, remote: true },
    { id: 11, title: 'Security Engineer', yearsExperience: 7, education: 'Master', location: 'Washington DC', salary: 160000, remote: false },
    { id: 12, title: 'UI/UX Designer', yearsExperience: 3, education: 'Bachelor', location: 'Los Angeles', salary: 95000, remote: true },
];

// Extract unique values for dropdown options
const educationOptions = [...new Set(positionsData.map(p => p.education))].sort();
const locationOptions = [...new Set(positionsData.map(p => p.location))].sort();

// Filter schema matching the table columns
const filterSchema = [
    { name: 'yearsExperience', relations: ['<', '<=', '>', '>=', '==', '!='], valueType: 'int' },
    { name: 'salary', relations: ['<', '<=', '>', '>=', '==', '!='], valueType: 'int' },
    { name: 'education', relations: ['==', '!='], valueType: 'string', options: educationOptions },
    { name: 'location', relations: ['==', '!='], valueType: 'string', options: locationOptions },
    { name: 'remote', relations: ['==', '!='], valueType: 'boolean' },
];

function DemoApp() {
    const store = useFilterState(filterSchema);
    
    // Filter evaluation function
    const evaluateFilter = (filter, position) => {
        const value = position[filter.type];
        if (value === undefined) return false;

        // Get value type from schema to determine comparison method
        const schemaItem = filterSchema.find(s => s.name === filter.type);
        const valueType = schemaItem ? schemaItem.valueType : 'float';

        // Handle different value types
        if (valueType === 'boolean') {
            // Convert filter.ref to boolean for comparison
            const filterValue = filter.ref === 'true' || filter.ref === true || filter.ref === '1';
            const actualValue = Boolean(value);
            
            switch (filter.predicate) {
                case '==': return actualValue === filterValue;
                case '!=': return actualValue !== filterValue;
                default: return false;
            }
        } else if (valueType === 'string') {
            // String comparison
            const filterValue = String(filter.ref);
            const actualValue = String(value);
            
            switch (filter.predicate) {
                case '==': return actualValue === filterValue;
                case '!=': return actualValue !== filterValue;
                default: return false;
            }
        } else {
            // Numeric comparison (int or float)
            const filterValue = parseFloat(filter.ref);
            if (isNaN(filterValue)) return false;

            switch (filter.predicate) {
                case '<': return value < filterValue;
                case '<=': return value <= filterValue;
                case '>': return value > filterValue;
                case '>=': return value >= filterValue;
                case '==': return value === filterValue;
                case '!=': return value !== filterValue;
                default: return false;
            }
        }
    };

    // Evaluate a group recursively
    const evaluateGroup = (group, position, filters, groups) => {
        if (!group || !group.items || group.items.length === 0) {
            return true; // Empty group matches all
        }

        const results = group.items.map(item => {
            if (item.type === 'filter') {
                const filter = filters.find(f => f.id === item.id);
                if (!filter || filter.ref === '') return true; // Empty filter matches all
                return evaluateFilter(filter, position);
            } else if (item.type === 'group') {
                const subGroup = groups[item.id];
                if (subGroup) {
                    return evaluateGroup(subGroup, position, filters, groups);
                }
                return true;
            }
            return true;
        });

        if (group.connector === 'OR') {
            return results.some(r => r === true);
        } else {
            return results.every(r => r === true);
        }
    };

    // Compute filtered positions - accessing signals here will auto-track them
    const rootGroup = store.rootGroup.value;
    const filters = store.filters.value;
    const groups = store.groups.value;
    
    let filteredPositions = positionsData;
    if (rootGroup && rootGroup.items && rootGroup.items.length > 0) {
        filteredPositions = positionsData.filter(position => {
            return evaluateGroup(rootGroup, position, filters, groups);
        });
    }

    return html`
        <div>
            <${FilterBuilder}
                schema=${filterSchema}
                store=${store}
                onAddFilter=${(groupId) => {
                    addFilterToGroup(store, groupId);
                }}
                onCreateGroup=${(parentGroupId, connector) => {
                    createGroup(store, parentGroupId, connector);
                }}
                onRemoveGroup=${(groupId) => {
                    removeGroup(store, groupId);
                }}
                onToggleConnector=${(groupId) => {
                    toggleGroupConnector(store, groupId);
                }}
                onUpdateFilter=${(filterId, updates) => {
                    updateFilter(store, filterId, updates);
                }}
                onRemoveFilter=${(filterId) => {
                    removeFilter(store, filterId);
                }}
                title="Filter Positions"
                helpText="Create filters to find positions matching your criteria. Filter by yearsExperience, salary, education, location, or remote status."
            />
            
            <div class="positions-table-container">
                <div class="results-count">
                    Showing ${filteredPositions.length} of ${positionsData.length} positions
                </div>
                <table class="positions-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Years Experience</th>
                            <th>Education</th>
                            <th>Location</th>
                            <th>Salary</th>
                            <th>Remote</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredPositions.length === 0 ? html`
                            <tr>
                                <td colspan="6" class="no-results">
                                    No positions match your filter criteria. Try adjusting your filters.
                                </td>
                            </tr>
                        ` : filteredPositions.map(position => html`
                            <tr>
                                <td><strong>${position.title}</strong></td>
                                <td><span class="badge badge-primary">${position.yearsExperience} years</span></td>
                                <td><span class="badge badge-success">${position.education}</span></td>
                                <td>${position.location}</td>
                                <td>$${position.salary.toLocaleString()}</td>
                                <td>${position.remote ? html`<span class="badge badge-warning">Yes</span>` : 'No'}</td>
                            </tr>
                        `)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

render(html`<${DemoApp} />`, document.getElementById('app'));

