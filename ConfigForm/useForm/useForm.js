/** @module useFormConfig */
//Third party bits
import '../models/form';
import { useEffect, useMemo, useState, useLayoutEffect } from 'react';

import { useForm } from 'react-hook-form';
import { object } from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

// Internal bits
import { getFieldValue } from './useFormLayout';
import axios from 'axios';
import {
  ID_FIELD,
  LABEL_FIELD,
  CONDITIONAL_RENDER,
  DEFAULT_VALUE,
  FIELD_TYPES,
  ANY_VALUE
} from '../constants';
import { objectReducer } from '../helpers';


/**
 * @function processDynamicFormLayout
 * @description This function will take the form layout and the data and return the default values and validation schema for the form
 * @param {object} formLayout
 * @param {object} data
 * @returns {ProcessedDynamicFormLayout} - Object containing the default values, validation schema, and fields to watch for changes
 */
export const processDynamicFormLayout = (formLayout, data) => {
  // Will hold the validation schema for the form
  const validations = {};
  // Will hold the correctly formatted field values for the form
  const defaultValues = {};
  // Will hold the fields that need to be watched for changes
  const fieldsToWatch = {};

  formLayout.sections.forEach(section => {
    for (const fieldId of section.fields) {
      if (formLayout.fields.has(fieldId)) {
        const field = formLayout.fields.get(fieldId);
        // Get the value from the incoming values correctly formatted
        // If it does not exist the returned value will be the correct default format
        const { name, value } = getFieldValue(field, data || {});
        defaultValues[name] = value;

        // Update the validation schema for this field
        // Do not add validations for read only fields
        if (!field.render?.readOnly) {
          validations[field.id] = field.validations;
        }

        // If this field exists in the triggerfields we need to watch the form for changes
        if (formLayout.triggerFields.has(fieldId)) {
          fieldsToWatch[fieldId] = true;
        }
      }
    }
  });

  return {
    defaultValues,
    validations: validations,
    watchFields: Object.entries(fieldsToWatch).map(([key]) => key),
  };
};

/**
 * Method to check for and setup conditional rendering
 * @function
 * @param {Map<string, object>} triggerFields - Map of fields that trigger conditional rendering
 * @param {Map<string, object>} fields - Map of all fields
 * @param {string} triggerId - ID of the field to check
 * @param {any} formValue - Value of the field to check
 * @param {object} options - Options for the conditional rendering
 * @returns {Array} - Array of fields that need to be updated
 */
const getUpdatedFields = (triggerField, fields, triggerId, formValue, options) => {
  const updatedFields = [];

  // This is a hack to handle the fact that the form values maybe strings or numbers
  // TODO: Add check for field type and coerce for correct check
  let usedFormValue = formValue;
  let hasIt = triggerField.fieldValues.has(formValue);

  // Check again with the string version of the value
  if (!hasIt && formValue !== undefined && formValue !== null) {
    hasIt = triggerField.fieldValues.has(formValue.toString());
    if (hasIt) {
      usedFormValue = formValue.toString();
    }
  }

  if (hasIt) {
    // Get the fields that need to be updated
    let affectedFields = triggerField.fieldValues.get(usedFormValue) || [];

    affectedFields.forEach((loadOut, fieldId) => {
      const conditional = {
        hasAsync: false,
        loadedChoices: {},
        hasRenderValue: false,
        isUpdating: false,
      };
      // If the field has a remoteUrl, we need to fetch the data
      const layout = loadOut?.layout;
      const isHidden = layout?.get(CONDITIONAL_RENDER.HIDDEN);
      if (!isHidden && layout?.has('url')) {
        conditional.hasAsync = true;
        const remoteUrl = layout?.get('url')?.replace('##thevalue##', formValue);
        // Note the ID_FIELD and LABEL_FIELD are here different from the useFormLayout hook
        // These are the values on this field's CONDITIONAL layout, not the default layout
        conditional.asyncLoader = () => fetchChoices(fieldId, remoteUrl, {
          mappedId: layout?.get(ID_FIELD),
          mappedLabel: layout?.get(LABEL_FIELD),
          triggerFieldId: fieldId,
          ...options
        });
      }

      // If the field has a condtionall dependent renderProperty we need to parse it out
      const renderId = layout?.get(CONDITIONAL_RENDER.RENDER_PROPERTY_ID);
      if (!isHidden && renderId) {
        // Get the choices for the triggering field so we can find the matching selected value
        const { render: { choices } } = fields.get(triggerField.id);
        const triggerChoice = choices?.find(c => c.id === formValue);

        if (triggerChoice) {
          // If the renderId is a dot notation, we need to dig into the object
          // Otherwise, we can just use the value
          const renderValue = objectReducer(triggerChoice, renderId) || '';
          if (renderValue !== undefined && renderValue !== null) {
            // setValue(fieldId, renderValue);
            conditional.hasRenderValue = true;
            conditional.renderValue = renderValue;
          }
        }
      }

      conditional.isUpdating = true;
      conditional.loadOut = loadOut;
      updatedFields.push({ id: fieldId, conditional });
    });
  }

  return updatedFields;
};

/**
 * Creates a section object for the form
 * @function createRenderSection
 * @param {object} section - section object from the form layout
 * @param {Map<string, Field>} fieldMap -
 * @returns {FormSection} - Form section object
 */
const createRenderSection = (section, fieldMap) => {
  const formSection = {
    name: section.name || section.title,
    description: section.description,
    fields: [],
    visible: false
  };
  let visibleCount = 0;
  section.fields.forEach((fieldPath) => {
    const field = fieldMap.get(fieldPath) || {};
    const { render } = field || {};
    if (!render.hidden) {
      visibleCount++;
    }

    formSection.fields.push({ render: { ...render }, subFields: field.subFields, type: field.type, [DEFAULT_VALUE]: field[DEFAULT_VALUE] });
  });

  formSection.visible = visibleCount > 0;
  return formSection;
};

/**
 * Any properties returned here may be applied to the FormContext for use in child components
 * @example
 * const { useFormObject, formProcessing, sections } = useConfigForm(formLayout, data, options);
 * <FormProvider {...useFormObject} sections={sections} formProcessing={formProcessing}>
 * @function useConfigForm
 * @param {object} formLayout - Form layout object
 * @param {object} data - Data to pre-populate the form with
 * @param {object} [options] - any other options needed for the form
 * @param {function} [addCustomValidations] - function to add custom validations to the form MUST return an object
 * @returns {object} - Object containing the useFormObject, formProcessing, and sections
 */
export const useConfigForm = (formLayout, data, options, addCustomValidations) => {
  const { defaultValues, watchFields, validations: dynamicValidations } = processDynamicFormLayout(formLayout, data);
  const [sections, setSections] = useState([]);
  const [validations, setValidations] = useState({});
  const [formProcessing, setFormProcessing] = useState(true);
  const [readyForWatches, setReadyForWatches] = useState(false);

  // update the validation schema hookForm uses when the validation state changes
  const validationSchema = useMemo(
    () => {
      if (addCustomValidations && typeof addCustomValidations === 'function') {
        const newValids = addCustomValidations(validations);
        if (newValids) {
          return object({ ...newValids });
        }
        return object({ ...validations });
      }
      return object({ ...validations });
    },
    [validations]
  );

  const useFormObject = useForm({
    mode: 'onBlur',
    defaultValues: defaultValues,
    resolver: yupResolver(validationSchema),
    shouldUnregister: true
  });

  // Form object will contain all the properties of useForm (React Hook Form)
  const { formState, watch, trigger, reset, resetField, setError, clearErrors } = useFormObject;

  useLayoutEffect(() => {
    if (!formProcessing) {
      setFormProcessing(true);
    }

    initTheForm({
      formLayout,
      setSections,
      validations: dynamicValidations,
      setValidations,
      isResetting: false,
      watchFields,
      setFormProcessing,
      setReadyForWatches,
      defaultValues,
      options: { ...options, setError, clearErrors }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formLayout]);

  // If the schema changes and the form has been submitted, revalidate
  useEffect(() => {
    if (formState.isSubmitted) {
      trigger();
    }
    // We do not want formState.isSubmitted to be a dependency here, the trigger happens on form submit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationSchema]);

  const forceReset = () => {
    // Yes we do need to reset the form
    reset(defaultValues);

    // Then set the formProcessing to true so it will re-render
    if (!formProcessing) {
      setFormProcessing(true);
    }

    // Then re-run the initTheForm function otherwise the triggers won't run because watch is dumb
    initTheForm({
      formLayout,
      sections,
      setSections,
      validations: dynamicValidations,
      setValidations,
      isResetting: true,
      watchFields,
      setFormProcessing,
      setReadyForWatches,
      defaultValues,
      options
    });
  };


  // If we have any watchFields, watch them and update the form
  useLayoutEffect(() => {
    let subscription = null;
    if (readyForWatches && !subscription) {
      subscription = watch((formValues, { name, type }) => {
        let watched = watchFields.includes(name);

        // This field is not watched
        if (!watched) {
          return;
        }

        if (type !== 'change') {
          // check if clusterField
          const clusterField = formLayout.fields.get(name);
          if (clusterField.type !== FIELD_TYPES.CLUSTER) {
            return;
          }
        }

        const finishSetup = ({ renderSections, resetFields, dynValid }) => {
          // This will reset any fields that were disabled
          // We grab the "empty" value from the field and set it as the default value
          const resetValues = {};
          for (const field in resetFields) {
            const fieldToReset = formLayout.fields.get(field);
            const { value } = getFieldValue(fieldToReset, {});
            resetValues[field] = value;
            resetField(field, { defaultValue: value });
          }

          setSections(renderSections);

          // This will trigger the useMemo to update the validation schema
          // That hook will then trigger the useEffect to revalidate the form
          setValidations((prevValues) => {
            return {
              ...prevValues,
              ...dynValid,
            };
          });

          setFormProcessing(false);
        };

        // Note we pass the reactive sections here AND NOT the formLayout.sections
        renderTheSections({
          sections,
          fields: formLayout.fields,
          triggerFields: formLayout.triggerFields,
          values: formValues,
          watchFields,
          options,
          fromWatch: true,
          finishSetup
        });
      });
    }

    return () => {
      // TODO: Look into termination of any triggerfield async
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyForWatches, watchFields]);


  return {
    useFormObject,
    sections,
    formProcessing,
    forceReset,
  };
};

/**
 * Function to initialize the form
 * @function initTheForm
 * @param {object} props
 * @param {object} props.formLayout - Form layout object
 * @param {object} props.setSections - React hook to set the sections
 * @param {object} props.validations - Dynamic validations
 * @param {object} props.setValidations - React hook to set the validations
 * @param {boolean} props.isResetting - Whether or not the form is resetting
 * @param {array} props.watchFields - Array of fields to watch
 * @param {object} props.setFormProcessing - React hook to set the formProcessing state
 * @param {object} props.setReadyForWatches - React hook to set the readyForWatches state
 * @param {object} props.defaultValues - Default values for the form
 * @param {object} props.options - Options object
 */
const initTheForm = ({ formLayout, setSections, validations, setValidations, isResetting, watchFields, setFormProcessing, setReadyForWatches, defaultValues, options }) => {
  // Finish setting up the form
  // This is done in a separate function so we can await any async calls
  const finishSetup = ({ renderSections, dynValid }) => {
    setSections(renderSections);

    //If we have any dynamic validations, set them
    if (Object.keys(validations).length > 0) {
      setValidations(() => {
        return {
          ...validations,
          ...dynValid,
        };
      });
    }

    setFormProcessing(false);
    if (watchFields.length > 0 && !isResetting) {
      setReadyForWatches(true);
    }
  };

  renderTheSections({
    sections: formLayout.sections,
    fields: formLayout.fields,
    triggerFields: formLayout.triggerFields,
    values: defaultValues,
    watchFields,
    options,
    fromWatch: false,
    finishSetup
  });
};

/**
 * Renders the sections
 * @function renderTheSections
 * @param {object} props - Props object
 * @param {array} props.sections - Array of sections
 * @param {object} props.fields - Map of fields
 * @param {object} props.triggerFields - Map of trigger fields
 * @param {object} props.values - Form values
 * @param {array} props.watchFields - Array of fields to watch
 * @param {function} props.finishSetup - Function to finish setting up the form
 * @param {object} props.options - Options object
 * @param {boolean} props.fromWatch - Whether or not this is being called from a watch
 */
const renderTheSections = ({ sections, fields, triggerFields, values, watchFields, finishSetup, options, fromWatch }) => {
  let renderSections = fromWatch ? sections : [];
  if (!fromWatch) {
    sections.forEach(section => {
      renderSections.push(createRenderSection(section, fields));
    });
  }

  const areUpdating = {};
  const updatedFields = [];
  const asyncLoaders = {};
  const loadedChoices = {};
  const dynValid = {};
  const resetFields = {};
  let hasAsync = false;

  const updateConditional = (fieldId, conditional) => {
    if (conditional.isUpdating) {
      areUpdating[fieldId] = true;
      if (conditional.hasAsync && conditional.asyncLoader) {
        hasAsync = true;
        asyncLoaders[fieldId] = conditional.asyncLoader;
      }
      updatedFields.push({ id: fieldId, type: 'update', ...conditional.loadOut });
    }
  };

  // Loop through all the triggerFields and see if the initial values have caused any fields to be updated
  watchFields.forEach((fieldId) => {
    // If somehow watching a field that is not in the formLayout, skip it
    const triggerField = triggerFields.get(fieldId);
    if (!triggerField) {
      return;
    }

    // Get the starting value of the field
    const formValue = values[fieldId];

    // Loop through all the fields that are dependent on this triggerField
    const updated = getUpdatedFields(triggerField, fields, fieldId, formValue, options);
    updated.forEach(({ id, conditional }) => {
      updateConditional(id, conditional);
    });

    // A flag to determine if this "onChange" field has a null value. If it does, we need to handle resets for affected fields heavy handedly
    let nullChangeValue = false;

    // Check for any "onChange" fields
    // We have to run a separate loop because conditions could be met for a specific value AND for ANY_VALUE (i.e. not null)
    if (triggerField.hasOnChange) {
      // If the value is null, we need to handle the reset of the affected fields
      if (formValue !== null && formValue !== undefined && formValue !== '' && formValue?.length > 0) {
        const anyUpdates = getUpdatedFields(triggerField, fields, fieldId, ANY_VALUE, options);
        anyUpdates.forEach(({ id, conditional }) => {
          updateConditional(id, conditional);
        });
      } else {
        // Not needed for initial render
        nullChangeValue = true;
      }
    }

    // If this update is from a watch, we need to handle the reset of the affected fields
    if (fromWatch) {
      // touches is a map of all the fields affected by this triggerfield
      // fieldId is the key and the value is a map of the field values from this triggerfield that affect it
      const touchedFields = triggerField.touches;

      // Add a reset to the updatedFields array
      const addReset = (fieldId) => {
        if (!areUpdating[fieldId]) {
          areUpdating[fieldId] = true;
          updatedFields.push({ id: fieldId, type: 'reset' });
        }
      };

      // Determine any fields that need to be reset
      touchedFields.forEach((value, fieldId) => {
        // If this field is not affected by the new value, it needs to be reset (probably)
        // We check if the field is already being updated because we don't want to reset a field that is being updated
        // This would happen with a field that has a remoteUrl that updates on EVERY triggerfield change.
        if (!value.has(formValue)) {
          addReset(fieldId);
        } else if (value.has(ANY_VALUE) && nullChangeValue) {
          // We need to reset any fields that may have been triggered by an ANY_VALUE trigger and allow it to be reset when the triggerfield is null
          addReset(fieldId);
        }
      });
    }
  });

  const hasUpdates = Object.keys(areUpdating).length > 0;
  if (hasUpdates) {
    // If any of the affected fields have async needs, we need to wait for them to resolve
    if (hasAsync) {
      // Create an array of promise so we can await all.
      const optTypes = Object.keys(asyncLoaders).map((fId) => (
        // return Promise that stores the loadedChoices into the correct model
        asyncLoaders[fId]().then((loaded) => {
          loadedChoices[fId] = loaded;
        })
      ));

      // If we have choice loading promises, wait for them all to finish
      if (optTypes.length) {
        // if (setLoading) {
        //   setLoading(true);
        // }

        Promise.all(optTypes).finally(() => {
          renderSections = processConditionalUpdate(renderSections, fields, updatedFields, loadedChoices, dynValid, resetFields);
          if (finishSetup && typeof finishSetup === 'function') {
            finishSetup({ renderSections, dynValid, resetFields });
          }
          // if (setLoading) {
          //   setLoading(false);
          // }
        });
      }
    } else {
      renderSections = processConditionalUpdate(renderSections, fields, updatedFields, null, dynValid, resetFields);
      finishSetup({ renderSections, dynValid, resetFields });
    }
  } else {
    finishSetup({ renderSections, dynValid, resetFields });
  }
};

/**
 * Process the updated fields and update the render sections
 * @function processConditionalUpdate
 * @param {Array<FormSection>} sections - Array of all the sections in the form
 * @param {Map<string, object>} fields - Map of all the fields in the form
 * @param {Array<object>} updatedFields - Array of fields that need to be updated
 * @param {object} asyncThings - Object of async things that need to be loaded
 * @param {object} dynValid - Object of dynamic validations
 * @param {object} resetFields - Object of fields that need to be reset
 * @returns {Array<object>}
 */
const processConditionalUpdate = (sections, fields, updatedFields, asyncThings = {}, dynValid = {}, resetFields = {}) => {
  const revalidates = {};

  // Loop through the fields that need to be updated
  const layoutSections = sections.map(section => {
    updatedFields.forEach(field => {
      const fieldObject = fields.get(field.id);
      // Check if the field is in this section
      const sectionField = section.fields.find(x => x.render.name === fieldObject.id);
      if (sectionField) {
        revalidates[fieldObject.id] = true;
        let { render } = sectionField;
        // If the  type of update is ...update find the new validations and render bits
        if (field.type === 'update') {
          if (!fieldObject.render?.readOnly) {
            dynValid[fieldObject.id] = field.validation;
          }
          const updatedLayout = Object.fromEntries(field.layout);
          //Check for aysnc things
          const choices = asyncThings ? asyncThings[field.id] : null;
          // TODO: possibly handle more than just choices
          const asyncRender = choices ? { choices } : {};
          render = { ...render, ...updatedLayout, ...asyncRender };
        } else {
          //TODO: Is it possible that reset fields would need to be async?
          if (!fieldObject.render?.readOnly) {
            dynValid[fieldObject.id] = fieldObject.validations;
          }

          if (fieldObject.render?.hidden || fieldObject.render?.disabled) {
            // New logic actually reset the field value
            // Hope past Nathan just missed something and this is not a bad idea
            resetFields[fieldObject.id] = true;
          }

          // If the type of update is ...reset, find the original validations and render bits
          // Note that for render properties in the original layout to override the dynamic properties they MUST exist on the original layout even if
          // null or empty. This is important for fields that use the "choices" property.
          render = { ...render, ...fieldObject.render };
        }

        sectionField.render = render;

        if (sectionField.render.disabled) {
          resetFields[fieldObject.id] = true;
        }
      }
    });

    let hasVisible = false;
    // loop through the fields and break if we find a visible field
    for (const field of section.fields) {
      if (!field.render.hidden) {
        hasVisible = true;
        break;
      }
    }

    section.visible = hasVisible;

    return section;
  });

  return layoutSections;
};

/**
 * @typedef {Object} FetchChoicesOptions
 * @property {string} urlDomain - domain to use when fetching the data
 * @property {string} mappedId - property to use when mapping the id
 * @property {string} mappedLabel - property to use when mapping the label
 * @property {string} triggerFieldId - id of the field that triggered the load
 * @property {function} choiceFormatter - function to format the choices
 * @property {function} clearErrors - function to clear errors
 * @property {function} setError - function to set errors
 */

/**
 * Loads the data for the async fields
 * @async
 * @function
 * @param {string} fieldId - id of the field that is being loaded
 * @param {string} url - url to load the data from
 * @param {FetchChoicesOptions} object - url to load the data from
 * @returns {Promise<Array<object>>}
 */
export const fetchChoices = async (fieldId, url, { clearErrors, setError, urlDomain, mappedId, mappedLabel, triggerFieldId, choiceFormatter }) => {
  const fetchUrl = urlDomain ? `${urlDomain}${url}` : url;
  const things = await axios.get(fetchUrl).then(res => {
    // We may need to clear the error in the event that the error was caused by a previous failed attempt
    if (clearErrors && typeof clearErrors === 'function') {
      clearErrors(fieldId);
    }
    // If there is a valid choice formatter, use it
    if (choiceFormatter && typeof choiceFormatter === 'function') {
      // pass along extra options to the choice formatter
      return choiceFormatter(fieldId, res, { triggerFieldId, mappedId, mappedLabel });
    }

    const { data } = res || {};
    return data?.map((opt) => {
      const id = mappedId && opt[mappedId] ? opt[mappedId] : opt.id || opt.streamID;
      const label = mappedLabel && opt[mappedLabel] ? opt[mappedLabel] : opt.name || opt.label;
      return { id, label };
    });
  }
  ).catch(error => {
    if (error.name !== 'CanceledError') {
      console.error('\t', fieldId, 'Error fetching data', error);

      // We may want to inject an error message into the field
      if (setError && typeof setError === 'function') {
        setError(fieldId, { type: 'custom', message: 'There was a problem loading the possible choices for this field' });
      }
    }
  });
  return things || [];
};
