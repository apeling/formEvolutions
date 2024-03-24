/**
 * Form helper functions
 * @module composables/FormHelpers
 */
import {
  reactive, ref, inject, Ref, nextTick
} from 'vue';
import pDebounce from 'p-debounce';
import {
  string, StringSchema, array, DateSchema, date, number, object, NumberSchema, Schema
} from 'yup';
import { FormContext, FormValidationResult } from 'vee-validate';
import type { Toast } from 'vue-dk-toast';
import {
  SelectOption, DynamicField, FieldRenderOpts
} from '@/models';
import { DATE_MSG } from '@/constants';
import api from '@/api';
import { sortOn } from './Formatters';

export function mapChoices(items: Record<string, any>[], idProp = 'id', labelProp = 'name'): SelectOption[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((node) => ({
    id: node[idProp].toString(),
    label: node[labelProp]
  }));
}

export function validDateFormat(value: string): boolean {
  return new RegExp(/^\d{2}\/\d{2}\/\d{4}$/).test(value);
}

export function validCurrencyFormat(value: string): boolean {
  return new RegExp(/^-?\d+\.?\d{0,2}$/).test(value);
}

export function validDoubleFormat(value: string, int = 4, frac = 4): boolean {
  return new RegExp(`^\\d{0,${int}}(\\.\\d{0,${frac}})?$`).test(value);
}

export function nameCheckFunction(id: number | string = -1, slug = 'Project'): (value: string) => Promise<any> {
  return (value) => api.post(`/${slug}/NameInUse`, { id, name: value || '' });
}

export function useNameChecker(id: number | string = -1, slug = 'Project'): (value: string) => Promise<any> {
  const endPoint = nameCheckFunction(id, slug);
  const checkName = async (value, resolve) => {
    try {
      endPoint(value).then((resp) => resolve(!resp.data));
    } catch {
      resolve(false);
    }
  };

  const slowName = pDebounce(checkName, 750);

  return (value) => new Promise((resolve) => slowName(value, resolve));
}

/**
 *
 * @param theForm vee-validate useForm object
 * @param id if editing need to pass an id so the item does not flag itself
 * @param propName fieldName to use for value and validating
 * @param slug api slug
 * @returns object full of goodies
 */
export function nameCheckMethods(theForm: FormContext, id: number | string = -1, fieldName = 'projectName', slug = 'Project'): Record<string, any> {
  let nameChecked = false;
  let nameIsUnique = false;

  return {
    get nameChecked() {
      return nameChecked;
    },
    get nameIsUnique() {
      return nameIsUnique;
    },
    isValid: () => (nameChecked ? nameIsUnique : true),
    debounced: useNameChecker(id, slug),
    instant: nameCheckFunction(id, slug),
    checkUnique: async (method: (inc: string) => Promise<any>) => (
      method(theForm.values[fieldName].trim()).then(async (res: any) => {
        nameChecked = true;
        nameIsUnique = typeof res === 'object' ? !res.data : res;
        await theForm.validateField(fieldName);
        return nameIsUnique;
      })
    )
  };
}

export function scrollToFirstError(validation: FormValidationResult<any>): void {
  if (validation.valid) {
    return;
  }

  let el: HTMLElement | null = null;
  const { errors } = validation;

  if (errors) {
    const [first] = Object.keys(errors);
    if (first) {
      const label: Element | null = document.querySelector(`label[for='${first}']`);
      el = Array.isArray(label) ? label[0] : label;

      if (!el) {
        el = document.getElementById(first);
      }

      if (!el) {
        [el] = document.getElementsByName(first);
      }
    }
  }
  /* else if (results) {
    const keys = Object.keys(results);
    for (let i = 0; i < keys.length; i++) {
      const field = results[keys[i]];
      if (!field.valid) {
        [el] = document.getElementsByName(keys[i]);
        break;
      }
    }
  } */

  if (el) {
    el.scrollIntoView();
  }
}

/**
 * Covert multiselect form input into an api ready array
 * @param selections
 * @returns array of {id: number} objects
 */
export function multiToPayload(selections: string[]): { id: number }[] {
  return Array.isArray(selections) ? selections.map((id) => ({ id: parseInt(id, 10) })) : [];
}

/**
 * Cause coming up with a toast is hard
 * @returns Object { toast: Object, makeToast: Function }
 */
export function useToast(): Record<'toast' | 'makeToast', any> {
  const toast: Toast | undefined = inject<Toast>('$toast');

  return {
    toast,
    makeToast: (message: string, success = false): void => {
      if (toast) {
        toast(message, {
          type: success ? 'success' : 'error',
          positionY: 'top'
        });
      }
    }
  };
}

export function yupLink(label: string, isRequired = false): Schema<any> {
  // Need nullable to avoid type error on 'object' even if required.
  // Link modal has a standalone form and will define the structure / push data into this field.
  const schema = object().label(label).nullable();
  return isRequired ? schema.required() : schema;
}

export function yupString(label?: string, isRequired = true): StringSchema {
  const schema: StringSchema = string().label(label || 'This field');
  return isRequired ? schema.required() : schema;
}

export function yupDate(label: string, isRequired = false, msg: string = DATE_MSG): DateSchema<any> {
  // If you can't figure out why date validation is not working remove the "typeError(msg)" this will spit out more detail
  const schema: any = date()
    .transform((curr, orig) => (orig === '' ? null : curr))
    .default(undefined)
    .typeError(msg)
    // value is the user's input as a date object
    .test('formatted', msg, (value, context: any) => (
      !context || !context.originalValue ? true : validDateFormat(context.originalValue)
    ))
    .nullable().label(label);
  return isRequired ? schema.required() : schema;
}

export function yupTypeAhead(label?: string, isRequired = true): StringSchema<any> {
  return yupString(label, isRequired).nullable();
}

export function yupTrimString(label?: string, isRequired = true, msg?: string | null): StringSchema {
  // use .strict(false) if submit logic / api will not trim values
  return yupString(label, isRequired).trim(msg || 'Remove leading and/or trailing spaces');
}

export function yupInt(label: string, isRequired = true, maxLength: number | undefined | null, msg: string): NumberSchema<any> {
  let schema: NumberSchema<any> = number().integer().nullable().label(label)
    .transform((curr, orig) => (orig === '' ? null : curr))
    .typeError(msg);

  // Add another test if maxLength is passed in
  if (maxLength) {
    schema = schema.test('maxLength', `${label} cannot be more than ${maxLength} characters`, (value, context: any) => (
      !context || !context.originalValue ? true : context.originalValue.toString().length <= maxLength
    ));
  }

  return isRequired ? schema.required() : schema;
}
export function yupFloat(label: string, isRequired = true, int = 5, frac = 2, maxLength: number | undefined | null, msg: string, maxValue: number | undefined | null): NumberSchema<any> {
  let schema: NumberSchema<any> = number().nullable().label(label)
    .transform((curr, orig) => (orig === '' ? null : curr))
    .typeError(msg)
    .test('formatted', msg, (value, context: any) => (
      !context || !context.originalValue ? true : validDoubleFormat(context.originalValue, int, frac)
    ));

  // Add another test if maxLength is passed in
  if (maxLength) {
    schema = schema.test('maxLength', `${label} cannot be more than ${maxLength} characters`, (value, context: any) => (
      !context || !context.originalValue ? true : context.originalValue.toString().length <= maxLength
    ));
  }

  if (maxValue !== null && maxValue !== undefined) {
    schema = schema.test('maxValue', `${label} cannot be greater than 1`, (value, context: any) => (
      !context || !context.originalValue ? true : parseFloat(context.originalValue.toString()) <= 1
    ));
  }

  return isRequired ? schema.required() : schema;
}

export function yupCurrency(label: string, isRequired = true, maxLength: number | undefined | null, msg: string): NumberSchema<any> {
  let schema: NumberSchema<any> = number().nullable().label(label)
    .transform((curr, orig) => (orig === '' ? null : curr))
    .typeError(msg)
    .test('formatted', msg, (value, context: any) => (
      !context || !context.originalValue ? true : validCurrencyFormat(context.originalValue)
    ));

  // Add another test if maxLength is passed in
  if (maxLength) {
    schema = schema.test('maxLength', `${label} cannot be more than ${maxLength} characters`, (value, context: any) => (
      !context || !context.originalValue ? true : context.originalValue.toString().length <= maxLength
    ));
  }

  return isRequired ? schema.required() : schema;
}

export function yupTrimStringMax(label?: string, isRequired = true, maxLength?: number | null, msg?: string | null): StringSchema {
  // use .strict(false) if submit logic / api will not trim values
  const schema = yupTrimString(label, isRequired, msg);
  return maxLength ? schema.max(maxLength) : schema;
}

export function yupMultiselect(label?: string, isRequired = true): Schema<any> {
  const message = `Please select at least one ${label || 'item'}`;
  const schema = array().label(label || 'This field');
  return isRequired ? schema.required(message).min(1, message) : schema;
}

export function getSelectValue(multiple: boolean, inData: SelectOption | SelectOption[]): string[] | string {
  if (multiple) {
    return sortOn((inData as SelectOption[])).map((con: SelectOption) => con?.id.toString());
  }

  return (inData as SelectOption)?.id?.toString() || '';
}

export function useHydrate(initial: Record<string, any>): Record<string, any> {
  const hydration = reactive(initial);
  const isHydrated = ref(false);

  const checkHydration = () => {
    const notDone = Object.keys(hydration).find((key) => hydration[key] === false);
    isHydrated.value = !notDone;
  };

  const set = (prop: string, flag = true) => {
    hydration[prop] = flag;
    checkHydration();
  };

  checkHydration();

  return {
    hydration,
    isHydrated,
    checkHydration,
    set,
    asyncHydrate: (url, model: Ref | null, prop, mapMethod = mapChoices) => (
      api.get(url).then((res: any) => {
        if (res && res.data) {
          if (model) {
            const theModel = model;
            theModel.value = mapMethod(res.data);
          }

          if (prop) {
            set(prop);
          }
          return mapMethod(res.data);
        }
        return [];
      }).catch((e) => console.warn(`Could not load ${prop || 'items'}`, e))
    )
  };
}

export function useLinkModal(formValues: Record<string, any>): Record<string, any> {
  const linkModal = ref<HTMLElement>();
  const linkModalProps = ref<Record<string, any>>({
    name: null,
    label: null,
    nestedProps: null
  });

  return {
    linkModal,
    linkModalProps,
    showLinkModal: async (fieldId, field: DynamicField, type = 'add', nestedProps: any = null) => {
      const { render }: { render: FieldRenderOpts } = field;
      linkModalProps.value = {
        name: render.name,
        label: render.label,
        nestedProps: nestedProps ? { ...nestedProps } : null
      };

      await nextTick();

      const modalRef: any = linkModal.value;
      if (modalRef) {
        if (type === 'delete' && modalRef.openDelete) {
          modalRef.openDelete();
        } else if (modalRef.openModal) {
          if (nestedProps) {
            modalRef.openModal(type === 'edit' ? formValues[nestedProps.parent][nestedProps.index][nestedProps.name] : null);
          } else {
            modalRef.openModal(type === 'edit' ? formValues[fieldId] : null);
          }
        }
      }
    }
  };
}
