import { useFilterState } from '../state/store.js';

/**
 * Add a filter to a group.
 * 
 * :param store: Filter store object
 * :param groupId: ID of group to add filter to ('root' for root group)
 * :returns: The created filter ID
 */
export function addFilterToGroup(store, groupId) {
    const filterId = store.getNextFilterId();
    const defaultType = store.getDefaultFilterType();
    const defaultPredicate = store.getDefaultPredicate(defaultType);

    const filter = {
        id: filterId,
        type: defaultType,
        predicate: defaultPredicate,
        ref: '',
        groupId: groupId
    };

    store.filters.value = [...store.filters.value, filter];

    // Add to group
    if (groupId === 'root') {
        // If root is empty, automatically create a group and add filter to it
        if (store.rootGroup.value.items.length === 0) {
            const newGroupId = createGroup(store, 'root', 'AND');
            if (newGroupId) {
                const newGroup = store.groups.value[newGroupId];
                if (newGroup) {
                    store.groups.value = {
                        ...store.groups.value,
                        [newGroupId]: {
                            ...newGroup,
                            items: [...newGroup.items, { type: 'filter', id: filterId }]
                        }
                    };
                    filter.groupId = newGroupId;
                } else {
                    // Fallback: add directly to root if group creation failed
                    store.rootGroup.value = {
                        ...store.rootGroup.value,
                        items: [...store.rootGroup.value.items, { type: 'filter', id: filterId }]
                    };
                }
            } else {
                // Fallback: add directly to root if group creation failed
                store.rootGroup.value = {
                    ...store.rootGroup.value,
                    items: [...store.rootGroup.value.items, { type: 'filter', id: filterId }]
                };
            }
        } else {
            store.rootGroup.value = {
                ...store.rootGroup.value,
                items: [...store.rootGroup.value.items, { type: 'filter', id: filterId }]
            };
        }
    } else {
        const group = store.groups.value[groupId];
        if (group) {
            store.groups.value = {
                ...store.groups.value,
                [groupId]: {
                    ...group,
                    items: [...group.items, { type: 'filter', id: filterId }]
                }
            };
        }
    }

    return filterId;
}

/**
 * Create a new filter group.
 * 
 * :param store: Filter store object
 * :param parentGroupId: ID of parent group ('root' for root group)
 * :param connector: 'AND' or 'OR'
 * :returns: New group ID or null on error
 */
export function createGroup(store, parentGroupId, connector = 'AND') {
    const groupId = store.getNextGroupId();

    // Prevent adding group to itself
    if (parentGroupId === groupId) {
        console.error('Cannot add group to itself:', groupId);
        return null;
    }

    const newGroup = {
        id: groupId,
        connector: connector,
        items: []
    };

    store.groups.value = {
        ...store.groups.value,
        [groupId]: newGroup
    };

    // Add to parent
    if (parentGroupId === 'root') {
        store.rootGroup.value = {
            ...store.rootGroup.value,
            items: [...store.rootGroup.value.items, { type: 'group', id: groupId }]
        };
    } else {
        const parentGroup = store.groups.value[parentGroupId];
        if (parentGroup) {
            store.groups.value = {
                ...store.groups.value,
                [parentGroupId]: {
                    ...parentGroup,
                    items: [...parentGroup.items, { type: 'group', id: groupId }]
                }
            };
        }
    }

    return groupId;
}

/**
 * Remove a filter.
 * 
 * :param store: Filter store object
 * :param filterId: ID of filter to remove
 */
export function removeFilter(store, filterId) {
    store.filters.value = store.filters.value.filter(f => f.id !== filterId);

    // Helper to remove filter from a group
    function removeFromGroup(group, itemId) {
        return {
            ...group,
            items: group.items.filter(item =>
                !(item.type === 'filter' && item.id === itemId)
            )
        };
    }

    store.rootGroup.value = removeFromGroup(store.rootGroup.value, filterId);
    const updatedGroups = {};
    for (const [id, group] of Object.entries(store.groups.value)) {
        updatedGroups[id] = removeFromGroup(group, filterId);
    }
    store.groups.value = updatedGroups;
}

/**
 * Remove a group and all its contents.
 * 
 * :param store: Filter store object
 * :param groupId: ID of group to remove
 */
export function removeGroup(store, groupId) {
    const group = store.groups.value[groupId];
    if (group) {
        // Remove all filters in this group
        group.items.forEach(item => {
            if (item.type === 'filter') {
                store.filters.value = store.filters.value.filter(f => f.id !== item.id);
            } else if (item.type === 'group') {
                removeGroup(store, item.id);
            }
        });
    }

    // Remove group from groups object
    const updatedGroups = { ...store.groups.value };
    delete updatedGroups[groupId];
    store.groups.value = updatedGroups;

    // Remove reference from root group
    store.rootGroup.value = {
        ...store.rootGroup.value,
        items: store.rootGroup.value.items.filter(item =>
            !(item.type === 'group' && item.id === groupId)
        )
    };

    // Remove reference from other parent groups
    const finalGroups = {};
    for (const [id, grp] of Object.entries(store.groups.value)) {
        finalGroups[id] = {
            ...grp,
            items: grp.items.filter(item =>
                !(item.type === 'group' && item.id === groupId)
            )
        };
    }
    store.groups.value = finalGroups;
}

/**
 * Toggle group connector between AND and OR.
 * 
 * :param store: Filter store object
 * :param groupId: ID of group to toggle
 */
export function toggleGroupConnector(store, groupId) {
    if (groupId === 'root') {
        // Toggle root group connector
        store.rootGroup.value = {
            ...store.rootGroup.value,
            connector: store.rootGroup.value.connector === 'AND' ? 'OR' : 'AND'
        };
    } else {
        const group = store.groups.value[groupId];
        if (group) {
            store.groups.value = {
                ...store.groups.value,
                [groupId]: {
                    ...group,
                    connector: group.connector === 'AND' ? 'OR' : 'AND'
                }
            };
        }
    }
}

/**
 * Update filter properties.
 * 
 * :param store: Filter store object
 * :param filterId: ID of filter to update
 * :param updates: Object with type, predicate, or ref to update
 */
export function updateFilter(store, filterId, updates) {
    store.filters.value = store.filters.value.map(f =>
        f.id === filterId ? { ...f, ...updates } : f
    );
}
