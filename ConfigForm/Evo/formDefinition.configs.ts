import { FormDefinition, LAYOUT_TYPES, FORM_FIELD_TYPES } from "@models/FormModels";
import { FIELD_TYPES } from "@timmons-group/shared-react-components";

export const createTextModel = (
  name: string,
  label: string,
  required = false,
  otherThings = {},
  dataThings = {}
) => ({
  label,
  path: name,
  type: 0,
  model: {
    name,
    id: 5,
    modelid: 10,
    type: 0,
    data: dataThings,
  },
  required,
  ...otherThings,
});

const fieldMeta = {
  fieldOptions: {
    icon: {
      style: { fontSize: 20, top: 2, position: 'relative' }
    }
  }
}

export const MODAL_LAYOUT = {
  type: 1,
  sections: [
    {
      id: 1,
      editable: true,
      enabled: true,
      name: 'General',
      order: 10,
      layout: [
        {
          "label": "Organization",
          "path": "organizationId",
          "type": 10,
          "model": {
            "type": 10,
            "name": "organizationId",
            "possibleChoices": []
          },
          "required": true,
          "url": "/api/organizations"
        },
        {
          "label": "Funding Year",
          "path": "fundingYearId",
          "type": 10,
          "model": {
            "id": 28,
            "modelid": 3,
            "type": 10,
            "name": "fundingYearId",
            "possibleChoices": [],
            data: {
              "labelField": 'alias'
            }
          },
          "required": true,
          iconHelperText: 'Funding Year refers to the federal fiscal year of appropriation.',
          "url": "/api/fundingyears"
        },
        {
          "label": "Funding Program",
          "path": "fundingProgramId",
          "type": 10,
          "model": {
            "id": 28,
            "modelid": 3,
            "type": 10,
            "name": "fundingProgramId",
            "possibleChoices": []
          },
          "required": true,
          "url": "/api/fundingprograms"
        },
        createTextModel('grantId', 'Grant ID', true, {
          regexpValidation: {
            pattern: '^\\d{2}-DG-\\d{11}$',
            errorMessage:
              'Grant ID must follow the format ##-DG-###########',
          },
          placeholder: '##-DG-###########',
          helperText: 'Grant ID must follow the format ##-DG-###########',
        }),
      ]
    }
  ]
}

export const MODAL_DEFINITION: FormDefinition = {
  baseAppearance: {
    divider: {
      sx: {
        marginTop: 2,
        marginBottom: 2,
      }
    },
    allFields: {
      meta: fieldMeta,
      sx: {
        marginBottom: 2
      }
    },
  },
  components: [
    {
      type: LAYOUT_TYPES.description,
      key: 'description',
      description: 'To add a new grant, select the Organization, Funding Program, Funding Year and Grant ID that the grant is associated with.',
      appearance: {
        sx: {
          marginBottom: 2,
          fontStyle: 'normal',
        }
      }
    },
    {
      type: FORM_FIELD_TYPES.text,
      key: 'organizationId',
      label: 'Organization',
      input: true
    },
    {
      type: FORM_FIELD_TYPES.text,
      key: 'fundingYearId',
      label: 'Funding Year',
      input: true
    },
    {
      type: FORM_FIELD_TYPES.text,
      key: 'fundingProgramId',
      label: 'Funding Program',
      input: true
    },
    {
      type: FORM_FIELD_TYPES.text,
      key: 'grantId',
      label: 'Grant ID',
      input: true,
      appearance: {
        sx: {
          marginBottom: 0
        }
      }
    }
  ]
};

export const createCurrencyModel = (name: string, label: string, required = false, otherThings = {}) => (
  createAnyModel(FIELD_TYPES.CURRENCY, name, label, required, otherThings)
);

export const createAnyModel = (fieldType: number, name: string, label: string, required = false, otherThings = {}) => {
  const type = fieldType ?? FIELD_TYPES.TEXT;
  return {
    label,
    path: name,
    type,
    model: {
      name,
      id: 5,
      modelid: 10,
      type,
    },
    required,
    ...otherThings,
  }
};

const plannedCostLabel = 'Total planned cost';
const communitiesLabel = 'Total estimated number of communities to be assisted';

export const SFA_FORM_LAYOUT = {
  id: 2,
  modelId: 10,
  enabled: true,
  name: 'Something',
  type: 1,
  sections: [
    {
      id: 1,
      editable: true,
      enabled: true,
      name: 'General',
      order: 10,
      layout: [
        createCurrencyModel('adminPlannedCost', plannedCostLabel),
        createCurrencyModel('prepPlannedCost', plannedCostLabel),
        createCurrencyModel('sosPlannedCost', plannedCostLabel),
        createCurrencyModel('trainingPlannedCost', plannedCostLabel),
        createAnyModel(FIELD_TYPES.INT, 'trainingPersonnel', 'Number of personnel to be trained'),
      ]
    },
    {
      id: 2,
      editable: true,
      enabled: true,
      name: 'General',
      order: 10,
      layout: [
        createAnyModel(FIELD_TYPES.INT, 'cwppPlannedCompleted', 'Total planned number to be completed'),
        createCurrencyModel('cwppPlannedCost', plannedCostLabel),
        createCurrencyModel('cwppCommunities', communitiesLabel),
        createAnyModel(FIELD_TYPES.INT, 'preventConducted', 'Total number to be conducted/implemented'),
        createCurrencyModel('preventPlannedCost', plannedCostLabel),
        createCurrencyModel('preventCommunities', communitiesLabel),
        createAnyModel(FIELD_TYPES.INT, 'mitigatedCompleted', 'Total number to be completed'),
        createCurrencyModel('mitigatedPlannedCost', plannedCostLabel),
        createCurrencyModel('mitigatedCommunities', communitiesLabel),
        createAnyModel(FIELD_TYPES.FLOAT, 'directFundFireAcres', 'Total acres of prescribed fire treatment'),
        createAnyModel(FIELD_TYPES.FLOAT, 'directFundMechAcres', 'Total acres of mechanical or other treatment'),
        createAnyModel(FIELD_TYPES.FLOAT, 'directFundBioAcres', 'Total acres of biomass / by-product utilization'),
        createAnyModel(FIELD_TYPES.FLOAT, 'leveragedFireAcres', 'Total acres prescribed fire treatments LEVERAGED'),
        createAnyModel(FIELD_TYPES.FLOAT, 'leveragedTotalAcres', 'Total acres mechanical treatments LEVERAGED'),
      ]
    }
  ]
}

export const AccompFormDef: FormDefinition = {
  baseAppearance: {
    title: {
      sx: {
        marginBottom: 2,
      }
    },
    description: {
      sx: {
        fontSize: 16,
        fontStyle: 'normal',
        marginBottom: 2,
      }
    },
    divider: {
      sx: {
        marginTop: 2,
        marginBottom: 2,
      }
    },
  },
  components: [
    {
      type: LAYOUT_TYPES.panel,
      key: 'general',
      title: 'CROSS-FUNCTIONAL PROGRAM INVESTMENTS',
      collapsible: true,
      components: [
        {
          type: 'title',
          key: 'CATEGORY:PROGRAM_ADMINISTRATION',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:PROGRAM_ADMINISTRATION',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 6,
              size: 'md',
              components: [
                {
                  type: 'currency',
                  key: 'adminPlannedCost',
                  label: 'Total Planned Cost',
                  input: true
                },
              ]
            }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'title',
          key: 'CATEGORY:PREPAREDNESS',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:PREPAREDNESS',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 6,
              size: 'md',
              components: [
                {
                  type: 'currency',
                  key: 'prepPlannedCost',
                  label: 'Total Planned Cost',
                  input: true
                },
              ]
            }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'title',
          key: 'CATEGORY:SUPPRESSION_OPERATIONS_&_SUPPORT',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:SUPPRESSION_OPERATIONS_&_SUPPORT',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 6,
              size: 'md',
              components: [
                {
                  type: 'currency',
                  key: 'sosPlannedCost',
                  label: 'Total Planned Cost',
                  input: true
                },
              ]
            }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'title',
          key: 'CATEGORY:TRAINING',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:TRAINING',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 6,
              size: 'md',
              components: [
                {
                  type: 'currency',
                  key: 'trainingPlannedCost',
                  label: 'Total Planned Cost',
                  input: true
                }
              ]
            },
            {
              width: 6,
              size: 'md',
              components: [
                {
                  type: 'int',
                  key: 'trainingPersonnel',
                  label: 'Number of personnel to be trained',
                  input: true
                },
              ]
            },
          ]
        },
      ]
    },
    {
      type: LAYOUT_TYPES.panel,
      key: 'commMity',
      title: 'COMMUNITY MITIGATION AND HAZARDOUS FUELS',
      collapsible: true,
      components: [
        {
          type: 'title',
          key: 'CATEGORY:CWPPS_FIRE_MANAGEMENT_PLANS_RISK_ASSESSMENTS',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:CWPPS_FIRE_MANAGEMENT_PLANS_RISK_ASSESSMENTS',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'int',
                  key: 'cwppPlannedCompleted',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'currency',
                  key: 'cwppPlannedCost',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'int',
                  key: 'cwppCommunities',
                  label: 'me',
                  input: true
                },
              ]
            }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'title',
          key: 'CATEGORY:PREVENTION_EDUCATION_PROGRAMS',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:PREVENTION_EDUCATION_PROGRAMS',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'int',
                  key: 'preventConducted',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'currency',
                  key: 'preventPlannedCost',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'int',
                  key: 'preventCommunities',
                  label: 'me',
                  input: true
                },
              ]
            }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'title',
          key: 'CATEGORY:HAZARDOUS_FUELS_REDUCTION_MITIGATION_PROJECTS',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:HAZARDOUS_FUELS_REDUCTION_MITIGATION_PROJECTS',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'int',
                  key: 'mitigatedCompleted',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'currency',
                  key: 'mitigatedPlannedCost',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'int',
                  key: 'mitigatedCommunities',
                  label: 'me',
                  input: true
                },
              ]
            }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'title',
          key: 'CATEGORY:HAZARDOUS_FUELS_REDUCTION_TREATMENTS_DIRECTLY_FUNDED',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:HAZARDOUS_FUELS_REDUCTION_TREATMENTS_DIRECTLY_FUNDED',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'float',
                  key: 'directFundFireAcres',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'float',
                  key: 'directFundMechAcres',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 4,
              size: 'md',
              components: [
                {
                  type: 'float',
                  key: 'directFundBioAcres',
                  label: 'me',
                  input: true
                },
              ]
            }
          ]
        },
        {
          type: 'divider',
        },
        {
          type: 'title',
          key: 'CATEGORY:HAZARDOUS_FUELS_REDUCTION_TREATMENTS_LEVERAGED',
          title: 'Change Me'
        },
        {
          type: 'description',
          key: 'CATEGORY:HAZARDOUS_FUELS_REDUCTION_TREATMENTS_LEVERAGED',
          description: 'Change Me'
        },
        {
          type: 'columns',
          key: 'columns',
          columns: [
            {
              width: 6,
              size: 'md',
              components: [
                {
                  type: 'float',
                  key: 'leveragedFireAcres',
                  label: 'meh',
                  input: true
                },
              ]
            },
            {
              width: 6,
              size: 'md',
              components: [
                {
                  type: 'float',
                  key: 'leveragedTotalAcres',
                  label: 'meh',
                  input: true
                },
              ]
            }
          ]
        },
      ]
    },
  ],
};