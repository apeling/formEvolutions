import { array, object } from 'yup';
import { FormContext, useForm } from 'vee-validate';
import {
  get as getObject,
  set as setObject,
  cloneDeep
} from 'lodash';

import {
  computed, ref, reactive, onBeforeUpdate, provide, nextTick, Ref
} from 'vue';
import {
  Layout, LayoutField, FormSection, DynamicField, DynamicSection,
  ConditionalFieldParent, FieldModel, FieldRenderOpts,
  Condition, ConditionalField, ConditionalParent, ConditionalTest, SelectOption, FieldValueType
} from '@/models';
import {
  DATE_MSG,
  FIELD_TYPES as FIELDS
} from '@/constants';
import api from '@/api';
import {
  mapChoices, yupDate, yupLink, yupMultiselect, getSelectValue,
  yupTrimStringMax, multiToPayload, yupTypeAhead, yupFloat,
  yupInt, yupCurrency, useLinkModal, useToast
} from './FormHelpers';
import { sortOn } from './Formatters';

const endpoint = 'Instrument/GetLayoutForCategory';
interface FieldValue {
  value: any;
  name: string;
}
interface PendingChoice {
  field: DynamicField;
  type: number;
}

interface FieldStructure {
  field: DynamicField;
  validation: any;
  name: string;
  needsChoices: boolean;
  otId: number | undefined;
}

export function getLayoutForCategory(id: number | string | null | undefined, slug: string = endpoint): Promise<Layout | null> {
  const cat: string = id === null || id === undefined ? '' : `?category=${id}`;
  return api.get<Layout>(`${slug}${cat}`).then(processData);
}

export function processData(res: { data?: any }): Layout | null {
  return res?.data ? res.data : null;
}

export function processFieldValue(field: DynamicField, value: unknown): any {
  let apiValue = value;
  switch (field.type) {
    case FIELDS.LINK:
      break;

    case FIELDS.DATE:
      break;

    case FIELDS.FLAG:
      apiValue = !!apiValue;
      break;

    case FIELDS.CURRENCY:
    case FIELDS.FLOAT:
      apiValue = parseFloat(apiValue as string);
      break;

    case FIELDS.INT:
      apiValue = parseInt(apiValue as string, 10);
      break;

    case FIELDS.CHOICE:
    case FIELDS.OBJECT:
      if (field.isArrayData) {
        apiValue = multiToPayload(apiValue as string[]);
      } else if (!field.isStringId) {
        apiValue = parseInt(apiValue as string, 10);
      }
      break;
    case FIELDS.CLUSTER: {
      const clusterData: any[] = [];
      if (Array.isArray(value) && value.length) {
        value.forEach((nug) => {
          const lineData: Record<string, any> = {};
          const subFields = field.render.fields;
          if (Array.isArray(subFields) && subFields.length) {
            subFields.forEach((subF) => {
              const subName = subF.render.name;
              lineData[subName] = processFieldValue(subF, nug[subName]);
            });
          }
          clusterData.push(lineData);
        });
      }
      apiValue = clusterData;
      break;
    }
    default:
      if (apiValue !== null && apiValue !== undefined) {
        apiValue = (apiValue as string).toString().trim();
      }
      break;
  }

  return apiValue;
}

/**
 * Boilerplate variables and methods frequently used when a component is implementing the DynamicForm component.
 * Must be called in setup as useToast relies on inject
 * @returns
 */
export function useDynamicFormComponent(): Record<string, any> {
  const { makeToast } = useToast();
  const loaded = ref<boolean>(false);
  const loadError = ref<boolean>(false);
  const errorMessages = ref<string[]>([]);
  const errorModalRef = ref<HTMLElement>();

  return {
    makeToast,
    loaded,
    loadError,
    errorMessages,
    errorModalRef,
    isSubmitting: ref<boolean>(false),
    loadedData: ref<Record<string, any>>({}),
    handleError: (): void => {
      loaded.value = true;
      loadError.value = true;
    },
    showFormErrors: async (errors: any[]) => {
      const modalRef = errorModalRef.value as any;
      if (modalRef) {
        if (modalRef.openModal) {
          errorMessages.value = errors;
          await nextTick();
          modalRef.openModal();
        }
      }
    }
  };
}

// type UseDynamicForm = 'setStructure' | 'updateFieldRender' | 'linkModal' | 'linkModalProps' | 'loadedLayout'
//   | 'formSections' | 'veeForm' | 'formValues' | 'getResetValues' | 'showLinkModal' | 'setLayout'
//   | 'dynFieldInstances' | 'makeDynRef' | 'load' | 'resetForm' | 'updateField' | 'processDynamicForm';

type UseDynamicForm = {
  setStructure: (existingData: Record<string, FieldValueType> | null | undefined) => void;
  updateFieldRender: (name: string, changes: Record<string, any>) => void;
  linkModal: (field: DynamicField, modal: HTMLElement) => void;
  linkModalProps: (field: DynamicField, props: Record<string, any>) => void;
  loadedLayout: boolean;
  formSections: Ref<DynamicSection[]>;
  veeForm: FormContext;
  formValues: Ref<Record<string, FieldValueType>>;
  getResetValues: () => Record<string, FieldValueType>;
  showLinkModal: (field: DynamicField) => void;
  setLayout: (layout: Layout) => void;
  dynFieldInstances: Ref<HTMLElement[]>;
  makeDynRef: (el: HTMLElement) => void;
  load: (id: number, slug: string) => Promise<{ success: boolean; hasSections: boolean }>
  resetForm: () => void;
  updateField: (fieldId: string, update: FieldValueType, nestedProps: Record<string, any>) => void;
  processDynamicForm: () => Record<string, FieldValueType>;
}

export function useDynamicForm(skipLoad = false): UseDynamicForm {
  const _formSections = ref<DynamicSection[]>([]);
  const _dynFieldInstances = ref<HTMLElement[]>([]);

  // This is a staging variable to avoid excessive updates while building our form structure.
  const _inFlightValidations: Record<string, any> = {};
  // Make validations and schema reactive so they can be updated via LayoutHeler
  const _validations: any = reactive({});
  const _schema: any = computed(() => object(_validations));

  const _theValues: Record<string, any> = {};
  const _initFormValues = ref<Record<string, FieldValueType>>({});

  const _veeForm: FormContext = useForm({
    initialValues: _initFormValues,
    validationSchema: _schema
  });
  const { values: _values } = _veeForm;

  const {
    linkModal: _linkModal,
    linkModalProps: _linkModalProps,
    showLinkModal
  } = useLinkModal(_values);

  const _resetValues = ref<Record<string, any>>({});
  const _fields: Record<string, DynamicField> = {};
  const _triggerFields: Record<string, ConditionalParent> = reactive({});
  const _conditionalFields: Record<string, ConditionalField> = {};

  let _loadedLayout = false;
  let _layout: Layout | null;
  const _loadedChoices: Record<string, any> = {};
  const _pendingChoices: PendingChoice[] = [];
  const _asyncLoaders: Record<string, any> = {};

  function changeHandler(field: DynamicField): void {
    const rawValue = _values[field.render.name];
    let selectValue: string | number | number[] = rawValue;
    if (!field.isStringId) {
      selectValue = Array.isArray(rawValue) ? rawValue.map((v) => parseInt(v, 10)) : parseInt(rawValue, 10);
    }
    const parent: ConditionalParent = _triggerFields[field.path];
    setFieldConditions(parent, field.path, selectValue);
  }

  // Provide items the DynamicFields component needs
  provide('DynamicFormParts', {
    changeHandler,
    showLinkModal,
    triggerFields: _triggerFields
  });

  // Make sure to reset the refs before each update.
  onBeforeUpdate(() => {
    _dynFieldInstances.value = [];
  });

  function processSectionStructure(laySections: FormSection[], existingData: Record<string, any> | null = null): DynamicSection[] {
    const sections: DynamicSection[] = laySections.map((sect: FormSection) => {
      const dynFields: DynamicField[] = [];

      sect.layout.forEach((layField: LayoutField) => {
        const {
          name, field, otId, needsChoices, validation
        } = getStructure(layField);

        if (validation && !field.hidden) {
          _inFlightValidations[name] = validation;
        }

        _fields[name] = field;
        dynFields.push(_fields[name]);

        // Check if the field needs to load choices
        if (needsChoices && otId !== undefined) {
          // Check for existing loader of that type
          // The data for a type will only be loaded once, even if multiple fields needs the same data
          if (!_asyncLoaders[otId]) {
            // Create a reactive array so the FancySelect component will update
            _loadedChoices[otId] = ref([]);

            // Generate a loader method for the given type
            _asyncLoaders[otId] = choiceLoader(
              `GenericObject/GetChoicesForType?objectType=${otId}`,
              `type_${otId}`
            );
          }

          // Add this field to an array of fields that need to be hydrated.
          _pendingChoices.push({ field, type: otId });
        }

        processConditionals(name, layField, validation);

        const { value } = getFieldValue(layField, existingData);
        _theValues[name] = value;
      });

      return {
        fields: dynFields,
        order: sect.order,
        name: sect.name
      };
    });

    return sections;
  }

  function processConditionals(name: string, field: LayoutField, validation) {
    const { conditions }: { conditions?: Condition[] } = field;
    if (conditions && conditions.length) {
      const conField: ConditionalField = _conditionalFields[name] || { parents: {} };
      conditions.forEach((c: Condition) => {
        const parent: ConditionalParent = _triggerFields[c.when] || {
          triggerValues: {},
          fields: {}
        };

        const conFieldParent: ConditionalFieldParent = conField.parents[c.when] || { tests: [] };

        parent.fields[name] = true;

        const tv = parent.triggerValues[c.is] || { fields: [] };
        tv.fields.push({ name, then: c.then });

        parent.triggerValues[c.is] = tv;
        _triggerFields[c.when] = parent;

        const then = { ...c.then };
        if (then.possibleChoices) {
          then.possibleChoices = mapChoices(then.possibleChoices);
        }

        if (then.hidden === false) {
          then.validation = validation;
          if (then.required) {
            then.validation = validation.required();
          }
        }

        conFieldParent.tests.push({ is: c.is, then });
        conField.parents[c.when] = conFieldParent;
      });
      _conditionalFields[name] = conField;
    }
  }

  const setStructure = async (existingData: Record<string, FieldValueType> | null = null) => {
    if ((skipLoad || _loadedLayout) && _layout) {
      _formSections.value = processSectionStructure(_layout.sections, existingData);

      // Create an array of promise so we can await all.
      const optTypes = Object.keys(_asyncLoaders).map((typeId) => (
        // return Promise that stores the loadedChoices into the correct model
        _asyncLoaders[typeId]().then((loaded: SelectOption[]) => {
          _loadedChoices[typeId].value = loaded;
        })
      ));

      // If we have choice loading promises, wait for them all to finish
      if (optTypes.length) {
        await Promise.all(optTypes);

        // Hydrate every field's choice model with loaded options matching that typeId
        _pendingChoices.forEach((item: PendingChoice) => {
          const { field, type } = item;
          _loadedChoices[type].value = sortOn(_loadedChoices[type].value, 'label');
          field.render.choices = _loadedChoices[type];
        });
      }
      setAllFieldConditions();
      // The reason we set the properties on the "validations" used in computed schema is
      // to avoid the form showing errors on mount. By default when the schema changes veeValidate runs validation
      // If we set the validations for each field as we are parsing them it triggers the computed
      // and thus does validations we don't yet need
      setValidations();

      // We need to create deepclones due to the strange way veeValidate handles array fields (i.e. ClusterField)
      _initFormValues.value = cloneDeep(_theValues);
      _resetValues.value = cloneDeep(_theValues);

      return _formSections.value;
    }

    return null;
  };

  /**
   * Update the render object for a given field name
   * @param name
   * @param changes object containing the render prop name(s) and value(s) to update
   */
  const updateFieldRender = (name: string, changes: Record<string, any> = {}) => {
    const field: DynamicField | undefined = _fields[name];
    if (field) {
      Object.keys(changes).forEach((prop: string) => {
        if (field.render[prop] !== undefined) {
          field.render[prop] = changes[prop];
        }
      });
    }
  };

  /**
   * Check all formSections for ConditionalParent fields then apply child conditions
   *
   */
  function setAllFieldConditions(): void {
    const dynSects: DynamicSection[] = _formSections.value;
    dynSects.forEach((section: DynamicSection) => {
      section.fields.forEach((field: DynamicField) => {
        const parent: ConditionalParent = _triggerFields[field.path];
        if (parent) {
          const fV = _theValues[field.render.name];

          // Special handling needed for isStringId parsing
          let selectValue: number | number[] | string = fV;
          if (!field.isStringId) {
            selectValue = Array.isArray(fV) ? fV.map((v) => parseInt(v, 10)) : parseInt(fV, 10);
          }

          setFieldConditions(parent, field.path, selectValue);
        }
      });
    });
  }

  function setFieldConditions(parent: ConditionalParent, path: string, value: any): void {
    if (!parent) {
      return;
    }

    const { fields: cFields } = parent;
    Object.keys(cFields).forEach((fName) => {
      const conParent: ConditionalFieldParent = _conditionalFields[fName]?.parents[path];
      const dynField: DynamicField = _fields[fName];

      if (conParent?.tests?.length) {
        // Flags for possible conditional criteria
        let visibleMatch = false;
        let requiredMatch = false;
        let choicesMatch = false;

        // Check if any of the conditionals control the selectable choices.
        // If false we can avoid needless updates to FancySelect
        let hasChoiceConditions = false;

        conParent.tests.forEach((t: ConditionalTest) => {
          const matches: boolean = (Array.isArray(value) ? value.includes(t.is) : t.is === value);
          const possibleChoices: any[] | undefined = t.then?.possibleChoices;

          if (matches) {
            const hiddenCon: boolean | undefined = t.then?.hidden;
            const requiredCon: boolean | undefined = t.then?.required;

            if (hiddenCon !== undefined) {
              visibleMatch = true;
              dynField.render.hidden = hiddenCon;
            }

            if (requiredCon !== undefined) {
              requiredMatch = true;
              dynField.render.required = requiredCon;
            }

            if (!dynField.render.hidden && t.then.validation) {
              _validations[fName] = t.then.validation;
            }

            if (possibleChoices !== undefined && possibleChoices.length) {
              choicesMatch = true;
              dynField.render.choices = possibleChoices;
            }
          }

          if (possibleChoices !== undefined && possibleChoices.length) {
            hasChoiceConditions = true;
          }
        });

        if (!requiredMatch) {
          dynField.render.required = dynField.required;
        }

        if (!visibleMatch) {
          dynField.render.hidden = dynField.hidden;
          if (dynField.render.hidden) {
            delete _validations[fName];
          }
        }

        if (hasChoiceConditions && !choicesMatch && dynField.allChoices) {
          dynField.render.choices = dynField.allChoices;
        }
      }
    });
  }

  function setValidations(): void {
    Object.keys(_inFlightValidations).forEach((fieldId: string) => {
      _validations[fieldId] = _inFlightValidations[fieldId];
    });
  }

  /**
   * Create a deepClone of the reset values
   * veeValidate does strange binding hoodoo on array fields when the form is reset.
   * This can cause unexpected data loss / persistence / shifting when working with ClusterField
   * @returns Record<string, any>
   */
  const getResetValues = (): Record<string, any> => cloneDeep(_resetValues.value);

  return {
    setStructure,
    setLayout: (layout) => {
      if (skipLoad && layout) {
        _layout = layout;
      }
    },
    updateFieldRender,
    linkModal: _linkModal,
    linkModalProps: _linkModalProps,
    loadedLayout: _loadedLayout,
    formSections: _formSections,
    veeForm: _veeForm,
    formValues: _initFormValues,
    getResetValues,
    showLinkModal,
    dynFieldInstances: _dynFieldInstances,
    makeDynRef: (el: HTMLElement): void => {
      _dynFieldInstances.value.push(el);
    },
    load: (id: number, slug: string = endpoint): Promise<{ success: boolean; hasSections: boolean }> => (
      getLayoutForCategory(id, slug).then((layout: Layout | null) => {
        _layout = layout;
        _loadedLayout = true;
        return {
          success: layout !== null,
          hasSections: !!(_layout?.sections && _layout.sections.length > 0)
        };
      }).catch((e) => {
        console.warn(`Layout could not be loaded for ${slug}`, e);
        return { success: false, hasSections: false };
      })
    ),
    resetForm: async () => {
      _veeForm.resetForm({ values: getResetValues() });

      if (_dynFieldInstances.value.length) {
        await Promise.all(_dynFieldInstances.value.map(async (dynRef: any) => {
          if (dynRef && dynRef.resetClusters) {
            await dynRef.resetClusters(getResetValues());
          }
        }));
      }
    },
    updateField: (fieldId: string, update: FieldValueType, nestedProps: Record<string, any>) => {
      let fieldUpdate = fieldId;
      // Updating the value directly as setFieldValue method does not work with nested fields.
      if (nestedProps) {
        fieldUpdate = nestedProps.parent;
        _values[fieldUpdate][nestedProps.index][nestedProps.name] = update;
      } else {
        _veeForm.setFieldValue(fieldUpdate, update);
      }
      _veeForm.setFieldTouched(fieldUpdate, true);
    },
    processDynamicForm(): Record<string, FieldValueType> {
      if (!_formSections.value.length) {
        return {};
      }

      const payload: Record<string, FieldValueType> = {};
      _formSections.value.forEach((sect) => {
        sect.fields.forEach((field: DynamicField) => {
          const { render: { name } }: { render: FieldRenderOpts } = field;
          // Do not attempt to send readonly values
          if (field.render.readOnly) {
            return;
          }

          // If a field is explicitly set as hidden wipe out its values.
          // Example is conditional fields who no longer meet their conditions. Prevent zombie data.
          const writeNull: boolean = (field.render.hidden === true && (_values[name] || _values[name] === ''));
          // To remove a value must explicitly send null. undefined will allow any previously saved value to persist.
          let apiValue = (_values[name] === undefined || writeNull) ? null : _values[name];
          apiValue = processFieldValue(field, apiValue);
          setObject(payload, field.path, apiValue);
        });
      });

      return payload;
    }
  };
}

/**
 * Parse a LayoutField into a DynamicField and return a FieldStructure object
 * @param {LayoutField} field
 * @returns FieldStructure
 */
function getStructure(field: LayoutField): FieldStructure {
  const model: FieldModel = field.model || {} as FieldModel;
  const name = model.name || `unknown${model.id}`;
  const { label } = field;
  const required = !!field.required;
  const readOnly = !!field.readOnly;
  const disabled = false;
  const hidden = !!field.hidden;

  const dynField: DynamicField = {
    hidden,
    required,
    disabled,
    type: field.type,
    path: field.path,
    isArrayData: !!model.multiple,
    isStringId: !!model.isStringId,
    render: reactive({
      label,
      name,
      hidden,
      required,
      disabled,
      readOnly,
      is: 'AnyField',
    })
  };

  let validation: any = null;
  const otId: number | undefined = model.objectTypeId;

  const structure: FieldStructure = {
    name,
    otId,
    validation: null,
    needsChoices: false,
    field: dynField,
  };

  // No need to update render options or create validation if read only
  if (!readOnly) {
    switch (field.type) {
      case FIELDS.LONG_TEXT:
        dynField.render.checkOnInput = true;
        dynField.render.as = 'textarea';
        // Dynamic row counts based on maxLength. Min of 2 / max of 10
        dynField.render.attrs = { rows: Math.min(Math.max(2, (model.maxLength || 200) / 100), 10) };

        validation = yupTrimStringMax(label, required, model.maxLength);
        break;
      case FIELDS.TEXT:
        dynField.render.checkOnInput = true;

        validation = yupTrimStringMax(label, required, model.maxLength);
        break;
      case FIELDS.INT:
        dynField.render.checkOnInput = true;
        validation = yupInt(
          label,
          required,
          model.maxLength,
          'Please enter an integer'
        );
        break;
      case FIELDS.FLOAT:
        dynField.render.checkOnInput = true;
        validation = yupFloat(
          label,
          required,
          model.integerDigits,
          model.fractionalDigits,
          model.maxLength,
          model.integerDigits
            ? `Please enter a number, with up to ${model.integerDigits} digits and an optional decimal of up to ${model.fractionalDigits} digits`
            : `Please enter a decimal of up to ${model.fractionalDigits} digits`,
          model.maxValue
        );
        break;
      case FIELDS.CURRENCY:
        dynField.render.checkOnInput = true;
        validation = yupCurrency(
          label,
          required,
          model.maxLength,
          'Please enter a valid dollar amount, with an optional decimal of up to two digits for cents; e.g., 1234.56'
        );
        break;

      case FIELDS.DATE:
        dynField.render.helpText = DATE_MSG;
        dynField.render.checkOnInput = false;

        validation = yupDate(label, required);
        break;

      case FIELDS.CHOICE:
      case FIELDS.OBJECT: {
        if (field.possibleChoices) {
          const choices = mapChoices(field.possibleChoices);
          // TODO: Use a different property if we need help text.
          // const helpValues = field.viewMap;
          // if (helpValues) {
          //   choices = choices.map((choice) => ({ ...choice, helpText: helpValues[choice.id] }));
          //   dynField.render.checkForHelp = true;
          // }
          dynField.allChoices = choices;
          dynField.render.choices = choices;
        } else if (otId !== undefined) {
          // Set the flag so downstream logic can handle loading and hydrating this field's choices
          structure.needsChoices = true;
        }

        dynField.render.placeholder = `Select ${label}`;
        dynField.render.is = 'FancySelect';
        dynField.render.mode = model.multiple ? 'tags' : 'single';

        validation = (model.multiple ? yupMultiselect : yupTypeAhead)(label, required);
        break;
      }

      case FIELDS.FLAG: {
        dynField.render.is = 'CheckBox';
        break;
      }

      case FIELDS.LINK: {
        dynField.render.is = 'LinkField';
        validation = yupLink(label, required);
        break;
      }

      case FIELDS.CLUSTER: {
        dynField.render.is = 'ClusterField';
        // Loop through and process fields tied to the cluster.
        const subFieldValidations: Record<string, any> = {};
        const subFields = field.layout?.map((subF) => {
          const { field: subField, validation: subValid } = getStructure(subF);
          if (subF.model) {
            const subName = subF.model?.name || 'unknownSub';
            if (subValid) {
              subFieldValidations[subName] = subValid;
            }
          }
          return subField;
        });
        dynField.render.fields = subFields;
        validation = array().of(object().shape(subFieldValidations).strict());
        break;
      }

      default:
        break;
    }

    structure.validation = validation;
  }

  return structure;
}

// Returns a crafted function that can be called to load choices for a given url.
function choiceLoader(url: string, prop, mapMethod = mapChoices): () => Promise<SelectOption[]> {
  return () => api.get(url).then((res: any) => {
    if (res && res.data) {
      return mapMethod(res.data);
    }
    return [];
  }).catch((e) => {
    console.warn(`Could not load ${prop || 'items'}`, e);
    return [];
  });
}

export function getFieldValue(field: LayoutField, data: Record<string, any> | null, isNested = false): FieldValue {
  const model: FieldModel = field.model || {} as FieldModel;
  const name = model.name || `unknown${model.id}`;
  const inData = isNested && data ? data[name] : getObject(data || {}, field.path);
  let value: any = null;

  switch (field.type) {
    case FIELDS.LONG_TEXT:
    case FIELDS.TEXT:
    case FIELDS.INT:
    case FIELDS.CURRENCY:
    case FIELDS.FLOAT: {
      value = inData || '';
      break;
    }

    case FIELDS.FLAG: {
      value = !!inData;
      break;
    }

    case FIELDS.DATE:
    case FIELDS.LINK: {
      value = inData || null;
      break;
    }
    case FIELDS.CHOICE:
    case FIELDS.OBJECT: {
      value = typeof inData === 'object' ? getSelectValue(model.multiple || false, inData) || '' : inData;
      break;
    }

    case FIELDS.CLUSTER: {
      const clusterData: any[] = [];
      if (Array.isArray(inData) && inData.length) {
        inData.forEach((nug) => {
          const lineData: any = {};
          if (Array.isArray(field.layout) && field.layout.length) {
            field.layout.forEach((subF) => {
              const { name: fName, value: fValue } = getFieldValue(subF, nug, true);
              lineData[fName] = fValue;
            });
          }
          clusterData.push(lineData);
        });
      }
      value = clusterData;

      break;
    }

    default:
      break;
  }
  return { value, name };
}
