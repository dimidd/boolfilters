import { h } from 'preact';

/**
 * Map of predicate symbols to display labels.
 */
const PREDICATE_LABELS = {
    '<': '<',
    '<=': '≤',
    '>': '>',
    '>=': '≥',
    '==': '=',
    '!=': '≠'
};

/**
 * Single filter row component.
 * 
 * Renders a row with type selector, predicate selector, value input, and remove button.
 * The available types and predicates are derived from the schema prop.
 * 
 * :param filter: Filter object with id, type, predicate, ref
 * :param schema: Array of filter definitions with name, relations, valueType, and optional options
 *   - For string types, if options array is provided, a select dropdown will be rendered
 *   - Options can be strings or objects with {value, label} format
 * :param store: Filter store object (not used directly, for compatibility)
 * :param showConnector: Whether to show the connector button
 * :param connector: Current connector ('AND' or 'OR')
 * :param onToggleConnector: Callback when connector is toggled
 * :param onUpdateFilter: Callback for filter updates (filterId, updates) => void
 * :param onRemoveFilter: Callback for filter removal (filterId) => void
 * :param groupId: ID of the group this filter belongs to
 * :param index: Index of this filter in the group
 */
export function FilterRow({ 
    filter, 
    schema, 
    store, 
    showConnector, 
    connector, 
    onToggleConnector, 
    onUpdateFilter,
    onRemoveFilter,
    groupId, 
    index 
}) {
    const handleChange = (field, value) => {
        const updates = { [field]: value };
        
        // When type changes, update predicate if it's not valid for new type
        if (field === 'type') {
            const schemaItem = schema.find(s => s.name === value);
            if (schemaItem && !schemaItem.relations.includes(filter.predicate)) {
                updates.predicate = schemaItem.relations[0] || '<';
            }
        }
        
        onUpdateFilter(filter.id, updates);
    };

    // Get available relations for current filter type
    const currentSchemaItem = schema.find(s => s.name === filter.type);
    const availableRelations = currentSchemaItem ? currentSchemaItem.relations : ['<', '<=', '>', '>='];
    const valueType = currentSchemaItem ? currentSchemaItem.valueType : 'float';
    const options = currentSchemaItem ? currentSchemaItem.options : null;

    const connectorRow = showConnector && index > 0 ? h('div', { class: 'fb-connector-row' },
        h('div', { class: 'fb-connector-line' }),
        h('button', {
            class: `fb-connector-btn ${connector === 'AND' ? 'fb-connector-and' : 'fb-connector-or'}`,
            onClick: onToggleConnector,
            type: 'button'
        }, h('span', { class: 'fb-connector-label' }, connector)),
        h('div', { class: 'fb-connector-line' })
    ) : null;

    const typeOptions = schema.map(t =>
        h('option', { value: t.name, selected: filter.type === t.name }, t.name)
    );

    const predicateOptions = availableRelations.map(p =>
        h('option', { value: p, selected: filter.predicate === p }, PREDICATE_LABELS[p] || p)
    );

    // Render appropriate input based on value type
    let valueInput;
    if (valueType === 'boolean') {
        // Boolean: use select dropdown
        const booleanValue = filter.ref === 'true' || filter.ref === true || filter.ref === '1';
        valueInput = h('select', {
            class: 'fb-filter-ref',
            value: booleanValue ? 'true' : 'false',
            onChange: (e) => handleChange('ref', e.target.value)
        }, [
            h('option', { value: 'true' }, 'True'),
            h('option', { value: 'false' }, 'False')
        ]);
    } else if (valueType === 'string') {
        // String: use select dropdown if options provided, otherwise text input
        if (options && Array.isArray(options) && options.length > 0) {
            const optionElements = options.map(opt => {
                const optionValue = typeof opt === 'string' ? opt : opt.value;
                const optionLabel = typeof opt === 'string' ? opt : (opt.label || opt.value);
                return h('option', { value: optionValue, selected: filter.ref === optionValue }, optionLabel);
            });
            valueInput = h('select', {
                class: 'fb-filter-ref',
                value: filter.ref || '',
                onChange: (e) => handleChange('ref', e.target.value)
            }, optionElements);
        } else {
            valueInput = h('input', {
                type: 'text',
                class: 'fb-filter-ref',
                placeholder: 'Reference value',
                value: filter.ref || '',
                onInput: (e) => handleChange('ref', e.target.value)
            });
        }
    } else {
        // Number (int or float): use number input
        const inputStep = valueType === 'int' ? '1' : 'any';
        valueInput = h('input', {
            type: 'number',
            class: 'fb-filter-ref',
            placeholder: 'Reference value',
            step: inputStep,
            value: filter.ref || '',
            onInput: (e) => handleChange('ref', e.target.value.trim())
        });
    }

    return h('div', { class: 'fb-filter-row-wrapper' },
        connectorRow,
        h('div', { class: 'fb-filter-row', id: `filter-${filter.id}` },
            h('label', { class: 'fb-label' }, 'Type:'),
            h('select', {
                class: 'fb-filter-type',
                value: filter.type,
                onChange: (e) => handleChange('type', e.target.value)
            }, typeOptions),
            h('label', { class: 'fb-label' }, 'Operator:'),
            h('select', {
                class: 'fb-filter-predicate',
                value: filter.predicate,
                onChange: (e) => handleChange('predicate', e.target.value)
            }, predicateOptions),
            h('label', { class: 'fb-label' }, 'Value:'),
            valueInput,
            h('button', {
                class: 'fb-remove-filter',
                onClick: () => onRemoveFilter(filter.id),
                type: 'button'
            }, 'Remove')
        )
    );
}
