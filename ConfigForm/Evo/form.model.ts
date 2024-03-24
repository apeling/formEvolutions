import { UseFormReturn } from "react-hook-form";

import { SxProps } from "@mui/material";
import { FIELD_TYPES as JSTYPES } from "@timmons-group/shared-react-components";

const FIELD_TYPES = {
  ...JSTYPES
} as const;

//create a const FORM_FIELD_TYPES object that is a lowercase version of the FIELD_TYPES object keys
export const FORM_FIELD_TYPES = {
  text: 'text',
  int: 'int',
  float: 'float',
  currency: 'currency',
  date: 'date',
  boolean: 'boolean',
  choice: 'choice',
  object: 'object',
  radio: 'radio',
  flag: 'flag',
} as const;

export const LAYOUT_TYPES = {
  columns: 'columns',
  panel: 'panel',
  description: 'description',
  title: 'title',
  divider: 'divider',
  container: 'container',
} as const;

// User defined type guard | https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
export const isAFormField = (type: string): type is FormFieldTypes => {
  return Object.keys(FORM_FIELD_TYPES).includes(type);
}

export type DataField = typeof FIELD_TYPES[keyof typeof FIELD_TYPES];

//create a union type for the different types of fields using the keyof the FIELD_TYPES object
export type FieldType = keyof typeof FIELD_TYPES;
export type LayoutTypes = keyof typeof LAYOUT_TYPES;
export type FormFieldTypes = Lowercase<FieldType>;
export type FormComponentTypes = FormFieldTypes | LayoutTypes;
export type FormAppearanceTypes = FormFieldTypes | LayoutTypes | 'allFields';
export type FormComponent = FormColumns | FormPanel | FormDescription | FormTitle | FormField | FormDivider | FormContainer;

export type Appearance = {
  className?: string;
  style?: React.CSSProperties;
  sx?: SxProps;
  meta?: Record<string, any>;
};

// extend the VisualProperties type to include the text properties
export type TextAppearanceProperties = Appearance & {
  variant?: string;
};

export type FormField = {
  key: string;
  type: FormFieldTypes;
  label: string;
  input: true;
  maxWidth?: string;
  appearance?: Appearance;
}

export type FormColumn = {
  width: number;
  size: string;
  components: FormComponent[];
  appearance?: Appearance;
}

export type FormColumns = {
  key: string;
  type: typeof LAYOUT_TYPES.columns;
  columns: FormColumn[];
  appearance?: Appearance;
}

export type FormDivider = {
  key?: string;
  type: typeof LAYOUT_TYPES.divider;
  appearance?: Appearance;
}

export type FormContainer = {
  key: string;
  type: typeof LAYOUT_TYPES.container;
  collapsible?: boolean;
  collapsed?: boolean;
  components: FormComponent[];
  appearance?: Appearance;
}

export type FormPanel = {
  key: string;
  type: typeof LAYOUT_TYPES.panel;
  title: string;
  description?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  components: FormComponent[];
  appearance?: Appearance;
}

export type FormDescription = {
  key: string;
  type: typeof LAYOUT_TYPES.description;
  description: string;
  appearance?: TextAppearanceProperties;
}

export type FormTitle = {
  key: string;
  type: typeof LAYOUT_TYPES.title;
  title: string;
  appearance?: TextAppearanceProperties;
}

export type Field = {
  name: string;
  type: DataField | FieldType;
  sectionId?: string;
};

// need a new type that extends the UseFormReturn type with sections
export type UseFormReturnWithSections = {
  sections: Record<string, any>[];
  formProcessing: boolean;
  forceReset: () => void;
  useFormObject: UseFormReturn;
}

// base appearance should be a map of the form component types to their appearance
// this will allow for the form to be styled based on the type of component
export type BaseAppearance = {
  [key in FormAppearanceTypes]?: Appearance;
};

export type FormDefinition = {
  components: FormComponent[];
  appearance?: Appearance;
  baseAppearance?: BaseAppearance;
}