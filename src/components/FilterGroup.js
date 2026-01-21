import { html } from 'htm/preact';
import { FilterRow } from './FilterRow.js';

/**
 * Filter group component (handles AND/OR groups).
 * 
 * Renders a group of filters with boolean connectors. Groups can be nested
 * to create complex filter expressions.
 * 
 * :param groupId: ID of the group to render ('root' for root group)
 * :param parentGroupId: ID of parent group
 * :param index: Index of this group in parent's items
 * :param renderedGroups: Set of already rendered group IDs (for circular reference detection)
 * :param schema: Array of filter definitions
 * :param store: Filter store object
 * :param onAddFilter: Callback to add a filter
 * :param onCreateGroup: Callback to create a group
 * :param onRemoveGroup: Callback to remove a group
 * :param onToggleConnector: Callback to toggle connector
 * :param onUpdateFilter: Callback for filter updates
 * :param onRemoveFilter: Callback for filter removal
 */
export function FilterGroup({ 
    groupId, 
    parentGroupId, 
    index = 0, 
    renderedGroups = new Set(), 
    schema, 
    store,
    onAddFilter,
    onCreateGroup,
    onRemoveGroup,
    onToggleConnector,
    onUpdateFilter,
    onRemoveFilter
}) {
    // Access signals to establish reactivity - always access both to ensure tracking
    const rootGroupValue = store.rootGroup.value;
    const groupsValue = store.groups.value;
    const filtersValue = store.filters.value;
    
    const group = groupId === 'root' ? rootGroupValue : groupsValue[groupId];

    if (!group) {
        return html`<div></div>`;
    }

    // Check for circular reference
    if (renderedGroups.has(groupId)) {
        console.error('Circular reference detected:', groupId);
        return html`<div></div>`;
    }

    const newRenderedGroups = new Set(renderedGroups);
    newRenderedGroups.add(groupId);

    const parentGroup = parentGroupId === 'root' ? rootGroupValue : groupsValue[parentGroupId];
    const connector = parentGroup?.connector || 'AND';

    // If root group is empty, don't render anything
    if (groupId === 'root' && group.items.length === 0) {
        return html`<div></div>`;
    }

    // Build items array
    const itemElements = [];
    for (let idx = 0; idx < group.items.length; idx++) {
        const item = group.items[idx];
        if (item.type === 'filter') {
            const filter = filtersValue.find(f => f.id === item.id);
            if (filter) {
                itemElements.push(html`
                    <${FilterRow}
                        key=${'f-' + item.id}
                        filter=${filter}
                        schema=${schema}
                        store=${store}
                        showConnector=${idx > 0}
                        connector=${group.connector}
                        onToggleConnector=${() => onToggleConnector(groupId)}
                        onUpdateFilter=${onUpdateFilter}
                        onRemoveFilter=${onRemoveFilter}
                        groupId=${groupId}
                        index=${idx}
                    />
                `);
            }
        } else if (item.type === 'group') {
            const subGroup = groupsValue[item.id];
            if (subGroup) {
                itemElements.push(html`
                    <${FilterGroup}
                        key=${'g-' + item.id}
                        groupId=${item.id}
                        parentGroupId=${groupId}
                        index=${idx}
                        renderedGroups=${newRenderedGroups}
                        schema=${schema}
                        store=${store}
                        onAddFilter=${onAddFilter}
                        onCreateGroup=${onCreateGroup}
                        onRemoveGroup=${onRemoveGroup}
                        onToggleConnector=${onToggleConnector}
                        onUpdateFilter=${onUpdateFilter}
                        onRemoveFilter=${onRemoveFilter}
                    />
                `);
            }
        }
    }

    return html`
        <div class="fb-filter-group-wrapper">
            ${index > 0 && parentGroup ? html`
                <div class="fb-connector-row">
                    <div class="fb-connector-line"></div>
                    <button
                        type="button"
                        class="fb-connector-btn ${connector === 'AND' ? 'fb-connector-and' : 'fb-connector-or'}"
                        onClick=${() => onToggleConnector(parentGroupId)}
                    >
                        <span class="fb-connector-label">${connector}</span>
                    </button>
                    <div class="fb-connector-line"></div>
                </div>
            ` : html`<span></span>`}
            <div class="fb-filter-group fb-group-${group.connector.toLowerCase()}" id=${`group-container-${groupId}`}>
                <div class="fb-group-start">
                    <span class="fb-group-bracket">(</span>
                </div>
                <div class="fb-filter-items">
                    ${itemElements.length > 0 ? itemElements : html`<span></span>`}
                </div>
                <div class="fb-group-controls">
                    <button
                        type="button"
                        class="fb-btn-add-filter-in-group"
                        onClick=${() => onAddFilter(groupId)}
                    >
                        + Add Filter
                    </button>
                    <button
                        type="button"
                        class="fb-btn-add-group-in-group"
                        onClick=${() => onCreateGroup(groupId, 'AND')}
                    >
                        + Add Group
                    </button>
                    ${groupId !== 'root' ? html`
                        <button
                            type="button"
                            class="fb-btn-remove-group"
                            onClick=${() => onRemoveGroup(groupId)}
                        >
                            Remove Group
                        </button>
                    ` : html`<span></span>`}
                </div>
                <div class="fb-group-end">
                    <span class="fb-group-bracket">)</span>
                </div>
            </div>
        </div>
    `;
}
