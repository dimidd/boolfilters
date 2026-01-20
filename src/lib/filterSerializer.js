/**
 * Filter serialization utilities using JSON Logic format.
 * 
 * Provides serialization and deserialization of filter structures
 * to/from a portable JSON Logic format.
 */

/**
 * Serialize filter structure to JSON Logic format.
 * 
 * This converts the current filter structure (groups, filters with type/predicate/ref)
 * into a JSON Logic expression that can be serialized and stored.
 * 
 * :param filters: Array of filter objects
 * :param rootGroup: Root group object
 * :param groups: Map of groupId -> group
 * :returns: JSON Logic expression object
 */
export function serializeFiltersToJsonLogic(filters, rootGroup, groups) {
    if (!rootGroup || !rootGroup.items || rootGroup.items.length === 0) {
        return null;
    }

    /**
     * Convert a filter to JSON Logic condition.
     * 
     * We use a custom 'filter_condition' wrapper to preserve the filter metadata
     * for deserialization.
     * 
     * :param filter: Filter object with type, predicate, ref
     * :returns: JSON Logic condition object or null
     */
    function filterToJsonLogic(filter) {
        if (!filter || !filter.type || !filter.predicate || filter.ref === '' || filter.ref === null || filter.ref === undefined) {
            return null;
        }

        // Map predicate to JSON Logic operator
        const operatorMap = {
            '<': '<',
            '<=': '<=',
            '>': '>',
            '>=': '>=',
            '==': '==',
            '!=': '!='
        };

        const operator = operatorMap[filter.predicate];
        if (!operator) {
            return null;
        }

        // Create the condition with preserved metadata
        // Store ref as string to preserve type information (string, boolean, number)
        return {
            'filter_condition': {
                type: filter.type,
                predicate: filter.predicate,
                ref: String(filter.ref),
                id: filter.id
            }
        };
    }

    /**
     * Convert a group to JSON Logic expression.
     * 
     * :param group: Group object with items and connector
     * :returns: JSON Logic expression or null
     */
    function groupToJsonLogic(group) {
        if (!group || !group.items || group.items.length === 0) {
            return null;
        }

        const conditions = [];
        for (const item of group.items) {
            if (item.type === 'filter') {
                const filter = filters.find(f => f.id === item.id);
                if (filter) {
                    const condition = filterToJsonLogic(filter);
                    if (condition) {
                        conditions.push(condition);
                    }
                }
            } else if (item.type === 'group') {
                const subGroup = groups[item.id];
                if (subGroup) {
                    const condition = groupToJsonLogic(subGroup);
                    if (condition) {
                        conditions.push(condition);
                    }
                }
            }
        }

        if (conditions.length === 0) {
            return null;
        }

        // For root group with single filter condition, return it directly
        if (group.id === 'root' && conditions.length === 1) {
            const singleCondition = conditions[0];
            if (singleCondition && singleCondition.filter_condition) {
                return singleCondition;
            }
        }

        // For multiple conditions or nested groups, wrap in connector
        const connector = group.connector === 'OR' ? 'or' : 'and';
        return { [connector]: conditions };
    }

    return groupToJsonLogic(rootGroup);
}

/**
 * Deserialize JSON Logic expression back to filter structure.
 * 
 * :param jsonLogicExpr: JSON Logic expression object
 * :param getNextFilterId: Function to get next filter ID
 * :param getNextGroupId: Function to get next group ID
 * :returns: Object with {filters, rootGroup, groups}
 */
export function deserializeFiltersFromJsonLogic(jsonLogicExpr, getNextFilterId, getNextGroupId) {
    if (!jsonLogicExpr) {
        return {
            filters: [],
            rootGroup: {
                id: 'root',
                connector: 'AND',
                items: []
            },
            groups: {}
        };
    }

    const filters = [];
    const groups = {};

    /**
     * Extract filter from JSON Logic condition.
     * 
     * :param condition: JSON Logic condition object
     * :returns: Filter object or null
     */
    function extractFilter(condition) {
        if (condition && condition.filter_condition) {
            const fc = condition.filter_condition;
            return {
                id: fc.id !== undefined ? fc.id : getNextFilterId(),
                type: fc.type,
                predicate: fc.predicate,
                ref: String(fc.ref),
                groupId: 'root' // Will be updated when building groups
            };
        }
        return null;
    }

    /**
     * Convert JSON Logic expression to group structure.
     * 
     * :param expr: JSON Logic expression
     * :param parentGroupId: Parent group ID
     * :returns: Group item reference or result object
     */
    function jsonLogicToGroup(expr, parentGroupId = 'root') {
        // Check if it's a filter condition
        if (expr && expr.filter_condition) {
            const filter = extractFilter(expr);
            if (filter) {
                filters.push(filter);
                return { type: 'filter', id: filter.id };
            }
            return null;
        }

        // Check if it's an AND or OR expression
        if (expr && typeof expr === 'object') {
            const keys = Object.keys(expr);

            if (keys.length === 1) {
                const key = keys[0];

                if (key === 'and' || key === 'or') {
                    const connector = key === 'or' ? 'OR' : 'AND';
                    const conditions = expr[key];

                    if (!Array.isArray(conditions) || conditions.length === 0) {
                        return null;
                    }

                    const items = [];

                    // Check if there are nested groups
                    const hasNestedGroups = conditions.some(c =>
                        c && typeof c === 'object' && (c.and || c.or)
                    );

                    if (parentGroupId === 'root' && !hasNestedGroups) {
                        // This becomes the root group
                        for (const condition of conditions) {
                            const item = jsonLogicToGroup(condition, 'root');
                            if (item) {
                                items.push(item);
                            }
                        }

                        if (items.length === 0) {
                            return null;
                        }

                        return {
                            rootGroup: {
                                id: 'root',
                                connector: connector,
                                items: items
                            },
                            isRoot: true
                        };
                    } else {
                        // Create a nested group or root with nested groups
                        const isRootLevel = parentGroupId === 'root';
                        const groupId = isRootLevel ? 'root' : getNextGroupId();

                        for (const condition of conditions) {
                            if (condition && typeof condition === 'object' && (condition.and || condition.or)) {
                                // It's a nested group
                                const nestedItem = jsonLogicToGroup(condition, getNextGroupId());
                                if (nestedItem) {
                                    items.push(nestedItem);
                                }
                            } else {
                                const item = jsonLogicToGroup(condition, groupId);
                                if (item) {
                                    items.push(item);
                                }
                            }
                        }

                        if (items.length === 0) {
                            return null;
                        }

                        if (isRootLevel) {
                            return {
                                rootGroup: {
                                    id: 'root',
                                    connector: connector,
                                    items: items
                                },
                                isRoot: true
                            };
                        } else {
                            groups[groupId] = {
                                id: groupId,
                                connector: connector,
                                items: items
                            };
                            return { type: 'group', id: groupId };
                        }
                    }
                }
            }
        }

        return null;
    }

    const result = jsonLogicToGroup(jsonLogicExpr);

    let rootGroup;
    if (result && result.isRoot) {
        rootGroup = result.rootGroup;
    } else if (result) {
        // Single filter or group at root - wrap it
        rootGroup = {
            id: 'root',
            connector: 'AND',
            items: [result]
        };
    } else {
        rootGroup = {
            id: 'root',
            connector: 'AND',
            items: []
        };
    }

    // Update groupId for all filters
    function updateFilterGroupIds(group, groupId) {
        for (const item of group.items) {
            if (item.type === 'filter') {
                const filter = filters.find(f => f.id === item.id);
                if (filter) {
                    filter.groupId = groupId;
                }
            } else if (item.type === 'group') {
                const subGroup = groups[item.id];
                if (subGroup) {
                    updateFilterGroupIds(subGroup, item.id);
                }
            }
        }
    }

    updateFilterGroupIds(rootGroup, 'root');
    for (const [groupId, group] of Object.entries(groups)) {
        updateFilterGroupIds(group, groupId);
    }

    return { filters, rootGroup, groups };
}

/**
 * Export filters as JSON string.
 * 
 * :param filters: Array of filter objects
 * :param rootGroup: Root group object
 * :param groups: Map of groupId -> group
 * :returns: JSON string or null if no filters to export
 */
export function exportFiltersAsJson(filters, rootGroup, groups) {
    const jsonLogic = serializeFiltersToJsonLogic(filters, rootGroup, groups);
    if (jsonLogic === null) {
        return null;
    }
    return JSON.stringify(jsonLogic, null, 2);
}

/**
 * Import filters from JSON string.
 * 
 * :param jsonString: JSON string containing JSON Logic expression
 * :param getNextFilterId: Function to get next filter ID
 * :param getNextGroupId: Function to get next group ID
 * :returns: Object with {filters, rootGroup, groups}
 */
export function importFiltersFromJson(jsonString, getNextFilterId, getNextGroupId) {
    if (!jsonString || typeof jsonString !== 'string') {
        console.error('Error parsing filter JSON: Invalid input - expected non-empty string');
        return {
            filters: [],
            rootGroup: {
                id: 'root',
                connector: 'AND',
                items: []
            },
            groups: {}
        };
    }

    // Trim whitespace and check if empty
    const trimmed = jsonString.trim();
    if (trimmed === '' || trimmed === 'null') {
        console.error('Error parsing filter JSON: Empty or null JSON string');
        return {
            filters: [],
            rootGroup: {
                id: 'root',
                connector: 'AND',
                items: []
            },
            groups: {}
        };
    }

    try {
        const jsonLogicExpr = JSON.parse(trimmed);
        return deserializeFiltersFromJsonLogic(jsonLogicExpr, getNextFilterId, getNextGroupId);
    } catch (error) {
        console.error('Error parsing filter JSON:', error);
        return {
            filters: [],
            rootGroup: {
                id: 'root',
                connector: 'AND',
                items: []
            },
            groups: {}
        };
    }
}
