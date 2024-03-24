/** @module helpers */
/**
 * Deeply clone an object.
 * @param {object} target - object to merge things into
 * @param {object} source - data source
 * @returns {object} - cloned object
 * @example const result = mergeDeep({ a: 1 }, { b: 2 });
 * // result === { a: 1, b: 2 }
 * @example const result = mergeDeep({ a: 1 }, { a: 2 });
 * // result === { a: 2 }
 */
export function mergeDeep(target, source) {
  if (typeof target !== 'object') {
    target = {};
  }

  if (Array.isArray(target) && !Array.isArray(source)) {
    target = {};
  }

  Object.keys(source).forEach(key => {
    if (source[key] === null) {
      target[key] = null;
    } else if (Array.isArray(source[key])) {
      target[key] = source[key].slice();
    } else if (typeof source[key] === 'object') {
      target[key] = mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
  return target;
}

/**
 * Check if a value is an object
 * @param {any} objValue
 * @returns {boolean} - true if object, false if not
 * @example const result = isObject({ a: 1 });
 * // result === true
 * @example const result = isObject(1);
 * // result === false
 * @example const result = isObject(null);
 * // result === false
 * @example const result = isObject(undefined);
 * // result === false
 * @example const result = isObject('a');
 * // result === false
 * @example const result = isObject([1, 2, 3]);
 * // result === false
 * @example const result = isObject(new Date());
 * // result === false
 * @example const result = isObject(new Map());
 * // result === false
 */
export function isObject(objValue) {
  const type = typeof objValue;
  const notNull = !!objValue;
  return (notNull && type === 'object' && objValue.constructor === Object) ? true : false;
}

/**
   * Helper method to check if a value is null, undefined, or ''
   * @example
   * isEmpty('') // true
   * isEmpty(null) // true
   * isEmpty(undefined) // true
   * isEmpty(0) // false
   * @function isEmpty
   * @param {string | number} value
   * @returns {boolean} - true if empty, false if not
   */
export const isEmpty = (value) => {
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  if (value === '' || value === null || value === undefined) {
    return true;
  }

  return false;
};

/**
 * Given an object and a path, return the value at that path. If the path is not found, return undefined.
 * @example
 * const obj = { a: { b: { c: 1 } } };
 * const result = objectReducer(obj, 'a.b.c');
 * // result === 1
 *
 * @param {object} obj - object to search
 * @param {string} path - path to value
 * @param {string} separator - separator for path (default: '.')
 * @returns {any} value at path
 */
export function objectReducer(obj, path, separator = '.') {
  return path.split(separator).reduce((r, k) => r?.[k], obj);
}

/**
 * Cases, we don't need no stinking cases.
 * @example
 * const result = caseless('a', 'A');
 * // result === 0
 * @example
 * const result = caseless('a', 'b');
 * // result === -1
 * @example
 * const result = caseless('b', 'a');
 * // result === 1
 * @example
 * const result = caseless('a', '');
 * // result === -1
 * @param {*} valueA
 * @param {*} valueB
 * @returns {number} - 0 if equal, -1 if valueA < valueB, 1 if valueA > valueB
 */
export function caseless(valueA, valueB) {
  if (valueA === valueB) {
    return 0;
  }

  // These two conditionals will put empty string, null, or undefined as the last items in a sort.
  if (valueA === null || valueA === undefined || valueA === '') {
    return 1;
  }

  if (valueB === null || valueB === undefined || valueB === '') {
    return -1;
  }

  return (valueA)?.toLowerCase().localeCompare((valueB)?.toLowerCase());
}

/**
 * Used to correctly handle sorting floats
 * @example const result = floatCompare('1.1', '1.2');
 * // result === -1
 * @example const result = floatCompare('1.2', '1.1');
 * // result === 1
 * @example const result = floatCompare('1.1', '1.1');
 * // result === 0
 * @param valueA
 * @param valueB
 * @returns {number} - 0 if equal, -1 if valueA < valueB, 1 if valueA > valueB
 */
export function floatCompare(valueA, valueB) {
  const nA = parseFloat(valueA);
  const nB = parseFloat(valueB);
  if (valueA === valueB) {
    return 0;
  }

  // These two conditionals will put empty string, null, or undefined as the first items in a sort.
  if (Number.isNaN(nA)) {
    return -1;
  }

  if (Number.isNaN(nB)) {
    return 1;
  }
  return (nA > nB) ? 1 : -1;
}

/**
 * Sorts array of objects by a given prop and returns a copy
 * @example const result = sortOn([{ label: 'b' }, { label: 'a' }], 'label');
 * // result === [{ label: 'a' }, { label: 'b' }]
 * @param items
 * @param prop
 * @returns {Array} - sorted array
 */
export function sortOn(items, prop = 'label', isNumber = false) {
  if (!items || items.length < 2) {
    return items && items.length ? [...items] : [];
  }

  if (!Array.isArray(items)) {
    return [items];
  }

  if (isNumber) {
    return [...items].sort((a, b) => floatCompare(a?.[prop], b?.[prop]));
  }

  return [...items].sort((a, b) => caseless(a?.[prop], b?.[prop]));
}

/**
 * Create a zoom option object
 * @param {*} label
 * @param {*} value
 * @param {*} extent
 * @returns {object} - zoom option object
 */
export function createZoomOption(label, value, extent) {
  return { label, value, extent };
}

/**
 * Create a zoom option object from a zoomable item
 * @param {object} item
 * @param {object} item.fields - fields object
 * @param {object} item.fields.extent - extent object
 * @param {string} labelProp
 * @param {string} valueProp
 * @returns {object} - zoom option object
 */
export function zoomableOption(item, labelProp = 'label', valueProp = 'id') {
  return createZoomOption(item[labelProp], item[valueProp], item.fields?.extent);
}

/**
 * Get a list of zoom options from a list of zoomable items
 * @param {Object[]} zoomables - list of zoomable items
 * @param {string} labelProp - property to use for label
 * @param {string} valueProp - property to use for value
 * @returns {Object[]}
 */
export function zoomablesOptions(zoomables, labelProp = 'label', valueProp = 'id') {
  return sortOn(zoomables, 'label').map((item) => zoomableOption(item, labelProp, valueProp));
}

/**
 * Returns possible choices for a given section and model
 * @param {Object} layout - layout object
 * @param {string} sectionName - name of the section
 * @param {string} modelName - name of the model
 * @returns {Object[]} - list of possible choices or an empty array
 */
export const getSectionChoices = (layout, sectionName, modelName) => {
  if (!layout || !layout.sections) {
    return [];
  }

  const section = layout.sections.find(s => s.name === sectionName);
  if (!section?.layout) {
    return [];
  }

  const type = section.layout.find(l => l.model.name === modelName);
  const choices = type?.possibleChoices ? type?.possibleChoices.map(item => ({
    label: item.name,
    id: item.id,
  })) : [];

  return choices;
};

/**
 * Simple layout process method to convert the layout object into a format that the layout builder can use.
 * If you are using GenericForm you should be using the useFormLayout and parseFormLayout methods instead.
 * @param {object} layout - The layout object to process
 * @return {object} - The processed layout object
 */
export function processLayout(layout) {
  if (!layout || !layout.sections) {
    return layout;
  }

  if (layout.type === 1) {
    console.warn('You are processing a form layout with the processLayout method. You should be using the useFormLayout and parseFormLayout methods instead.');
  }

  const sections = layout.sections.map((section) => {
    const fields = section.layout.map(getStructure);
    // This is a small hack to make the layout work with the old layout builder.
    // If this layout structure predates the new layout types we need to remove the "fields." prefix from the path.
    if (layout.type === undefined || layout.type === null || layout.type === 2) {
      // If this a grid layout we need to remove the "fields." prefix from the path.
      fields.forEach((field) => {
        field.path = field.path.replace('fields.', '');
      });
    }
    return { name: section.name, fields: fields };
  });

  return sections;
}

/**
 * Process a layout object
 * @param {object} layout
 * @returns {object} - The processed layout object
 */
export function processGenericLayout(layout) {
  if (!layout || !layout.sections || layout.isGeneric) {
    return layout;
  }

  const sections = layout.sections.map((section) => {
    const fields = section.layout.map(getStructure);
    return { name: section.name, fields: fields };
  });

  const layoutTypes = {
    1: 'Form',
    2: 'Grid',
  };

  const data = {};

  if (layout.data) {
    data.source = layout.data;
  }

  if (layout.grid) {
    data.gridConfig = layout.grid;
  }

  let newLayout = {
    sections: sections,
    title: layout.name,
    id: layout.id,
    type: layoutTypes[layout.type] || 'Unknown Layout Type: ' + layout.type,
    editable: layout.editable,
    data,
    isGeneric: true,
  };

  return newLayout;
}

function getStructure(field) {
  const model = field.model || {};
  const name = model.name || `unknown${model.id}`;
  const { label, linkFormat } = field;
  const required = !!field.required;
  const readOnly = !!field.readOnly;
  const disabled = false;
  const hidden = !!field.hidden;

  const dynField = {
    hidden,
    required,
    disabled,
    type: field.type,
    path: field.path,
    isArrayData: !!model.multiple,
    isStringId: !!model.isStringId,
    render: {
      type: field.type,
      label,
      name,
      hidden,
      required,
      disabled,
      readOnly,
      linkFormat,
    },
    source: model
  };

  if (field.possibleChoices) {
    const choices = field?.possibleChoices ? field?.possibleChoices.map(item => ({
      label: item.name,
      id: item.id,
      source: item,
    })) : [];

    dynField.render.choices = choices;
  }

  if (field.width) {
    dynField.width = field.width;
  }

  if (field.flex) {
    dynField.flex = field.flex;
  }

  if (field.nullValue) {
    dynField.nullValue = field.nullValue;
  }

  return dynField;
}

export const functionOrDefault = (f, fdefault) => {
  if (typeof f === 'function') {
    return f;
  }

  return fdefault;
};

export const hasPermission = (permission, acl) => {
  return acl?.includes(permission) || false;
};

export const hasAllPermissions = (permissions, acl) => {
  for (let perm of permissions) {
    if (!acl?.includes(perm)) {
      return false;
    }
  }

  return true;
};

export const hasAnyPermissions = (permissions, acl) => {
  for (let perm of permissions)
    if (acl.includes(perm))
      return true;

  return false;
};

/**
 * Number with zero padding
 * @param {number} num Number to pad
 * @param {number} size amount of padding
 * @returns {string} The padded number
 */
export function zeroPad(num, size = 3) {
  return num.toString().padStart(size, '0');
}

/**
 * Format a phone number
 * @param {string} phoneNumberString
 * @returns {string} The formatted phone number
 * @example formatPhoneNumber('1234567890') => '(123) 456-7890'
 */
export const formatPhoneNumber = (phoneNumberString) => {
  const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return null;
};

/**
 * Normaliz es a date string by replacing hyphens with slashes and removing the time portion.
 * @param {string} dateString - The date string to normalize.
 * @returns {string|null} The normalized date string, or null if the input is falsy.
 * @example dateStringNormalizer('2020-01-01T00:00:00.000Z') => '2020/01/01'
 */
export function dateStringNormalizer(dateString) {
  if (!dateString) {
    return null;
  }

  return dateString.replace(/-/g, '/').replace(/T.+/, '');
}

/**
 * Return a date string from either an ag grid cell object or string
 * @param {string | object} inc - The date string or ag grid cell object
 * @returns {string} The date as a string
 */
export function dateFormatter(inc) {
  if (inc instanceof Date) {
    return dateToString(inc);
  }

  if ((!inc || (typeof inc === 'object' && !inc.value))) {
    return '';
  }

  const normalized = dateStringNormalizer(typeof inc === 'object' ? inc.value : inc);

  const date = new Date(normalized);
  return dateToString(date);
}

/**
 * Convert a date to a string with zero padding
 * @param {Date} date
 * @returns {string} The date as a string
 */
export function dateToString(date) {
  if (!date) {
    return '';
  }

  return `${zeroPad(date.getMonth() + 1, 2)}/${zeroPad(date.getDate(), 2)}/${date.getFullYear()}`;
}

/**
 * Get the color for the header text
 * @param {object} theme
 * @returns {string} The color for the header text
 */
export function headerColor (theme) {
  return theme.palette.text.header;
}

/**
 * Get the color for the special text
 * @param {object} theme
 * @returns {string} The color for the special text
 */
export function specialColor (theme) {
  return theme.palette.text.special;
}

/**
 * Useful when you want/need to share an RGBA color in more than one place with different opacity levels.
 * If you want to show a color on a map with opacity 0.6 but want the legend value to use the same color
 * but with opacity 1.0.
 * @param {string} color an rgba color
 * @param {number} opacity the opacity to convert to
 * @returns {string} An rgba color with it's opacity modified
 */
export function modifyColorOpacity(color, opacity) {
  const opac = opacity || 1;
  if (!color || color === undefined)
    return color;

  const cleanedColor = color.replace('rgba(', '').replace(')', '');
  const colorArray = cleanedColor.split(',');
  const newColor = `rgba(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]}, ${opac})`;
  return newColor;
}

/**
 * Method to capitalize the first letter of a string
 * @example capitalizeFirstLetter('hello') => 'Hello'
 * @example capitalizeFirstLetter('Hello') => 'Hello'
 * @param {string} string
 * @returns {string} The capitalized string
 */
export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Return a currency string from either an ag grid cell object or string
 * @example currencyFormatter(1234.56) => '$1,234.56'
 * @param {object|string} inc - ag grid cell params
 * @returns {string} a currency string
 */
export function currencyFormatter(inc) {
  if (!inc || (typeof inc === 'object' && !inc.value)) {
    return '';
  }

  const numOS = typeof inc === 'object' ? inc.value : inc;
  const num = typeof numOS === 'string' ? parseFloat(numOS) : numOS;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

/**
 * Return a currency string from either an ag grid cell object or string
 * @param {object|string} inc - ag grid cell params
 * @param {number} decimalPlaces - number of decimal places to round to
 * @returns {string}
 */
export function floatFormatter(inc, decimalPlaces) {
  if (!inc || (typeof inc === 'object' && !inc.value)) {
    return '';
  }

  const numOS = typeof inc === 'object' ? inc.value : inc;
  const num = typeof numOS === 'string' ? parseFloat(numOS) : numOS;
  return new Intl.NumberFormat('en-US', { style: 'decimal', currency: 'USD' }).format(parseFloat(num.toFixed(decimalPlaces)));
}

/**
 * Convert an array of objects into a string using prop
 * @param {Array} value - Array to process
 * @param {string} prop - Display property (also used for sorting)
 * @param {string} delim - String to place between each value
 * @returns {array}
 */
export function arrayToDisplay(value, prop = 'name', delim = ', ') {
  return value ? sortOn(value, prop).map((reg) => reg[prop]).join(delim) : null;
}

/**
 * Convert an object or array of objects to urls. Intended for use with DetailList/DetailContent component
 * @param {Object | Array} value - thing or things to turn into urls
 * @param {string} slug - url slug
 * @param {boolean} sameTab - open in same tab
 * @param {string} displayProp - display property for sorthing and link text
 * @param {string} idProp - id to use with slug to generate url
 * @returns {object}
 */
export function arrayToUrls(value, slug, skipIds = [], sameTab = true, displayProp = 'name', idProp = 'id') {
  if (!value) {
    return null;
  }

  // Wrap non-array in array, sort, map, ???, profit
  return sortOn(Array.isArray(value) ? value : [value], displayProp).map((prop) => {
    const iID = prop[idProp];
    const createUrl = !(skipIds.length && skipIds.includes(iID));
    return {
      sameTab,
      name: prop[displayProp] || iID.toString(),
      url: createUrl ? `#/${slug}/${iID}` : null,
    };
  });
}

/**
 * Convert array of objects to a string for a given key and separator
 * @param items
 * @param {string} key
 * @param {string} separator
 * @returns {string}
 */
export function objectsToString(items, key = 'name', separator = ', ') {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return '';
  }
  return items.map((item) => item[key]).join(separator) || '';
}

/**
 * Replaces placeholders in a link format string with values from a data node object.
 * @param {string} linkFormat - The link format string with placeholders wrapped in curly braces.
 * @param {Object} dataNode - The data node object containing values to replace the placeholders.
 * @returns {string} The link format string with placeholders replaced with values from the data node object.
 */
export function convertToLinkFormat(linkFormat, dataNode) {
  let link = linkFormat;
  // Find all the properties in the linkFormat that are wrapped in curly braces
  const regex = /(?<=\{)(.*?)(?=\})/g;
  let matches = link.match(regex);
  // For each match, replace the match with the value from the row
  // Example linkFormat: /admin/streams/{streamID}/edit/{id}
  // Example row: {id: 1, streamID: 2, name: 'Test'}
  // Example result: /admin/streams/2/edit/1
  if (matches.length > 0) {
    matches.forEach((match) => {
      link = link.replace(`{${match}}`, dataNode[match]);
    });
  }

  return link;
}
