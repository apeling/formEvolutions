/** @module ConfigForm */
//Third party bits
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { FormProvider } from 'react-hook-form';

// Internal bits
import { parseFormLayout } from '../../hooks/useFormLayout';
import { useConfigForm } from '../../hooks/useConfigForm';
import LoadingSpinner from '../LoadingSpinner';
import { functionOrDefault } from '../../helpers';

/**
 * Configurable form wrapper. Parses PAM style layout and waits and then wraps the children in a DynamicForm
 *
 * @function ConfigForm
 * @param {object} props
 * @param {object} props.formLayout - the layout of the form. This component should not be rendered until the formLayout is loaded
 * @param {object} [props.data] - the data to populate the form with
 * @param {object} [props.parseOptions] - options to pass to the parser
 * @param {string} [props.urlDomain] - the domain to use for the API calls
 * @param {function} [props.renderLoading] - the function to render while the form is loading
 * @param {function} [props.addCustomValidations] - a function to add custom validations to the form - MUST be a function that returns an object of validation functions
 * @param {object} props.children - the children to render
 * @returns {React.ReactElement} - the wrapped children
 * @example
 * <ConfigForm formLayout={formLayout} data={data} parseOptions={{ choiceFormatter: choiceFormatter2 }}>
 *  <MyForm />
 * </ConfigForm>
 */
const ConfigForm = ({ formLayout, data, urlDomain, parseOptions = {}, children, renderLoading, addCustomValidations }) => {
  const [parsed, setParsed] = useState(null);

  useEffect(() => {
    const parseIt = async () => {
      const parsed = await parseFormLayout(formLayout, urlDomain, parseOptions);
      setParsed(parsed);
    };

    if (formLayout) {
      parseIt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formLayout]);

  if (parsed) {
    return (
      <ConfigFormProvider layout={parsed} data={data} options={parseOptions} addCustomValidations={addCustomValidations}>
        {children}
      </ConfigFormProvider>
    );
  }

  return functionOrDefault(renderLoading, () => (<LoadingSpinner isActive={true} />))();
};

ConfigForm.propTypes = {
  formLayout: PropTypes.object,
  data: PropTypes.object,
  urlDomain: PropTypes.string,
  parseOptions: PropTypes.object,
  renderLoading: PropTypes.func,
  addCustomValidations: PropTypes.func,
  children: PropTypes.node,
};

/**
 * Wraps any children in a FormProvider and sets up the useFormContext values
 * See GenericConfigForm for a complete example of how to implement the the React Hook Form context
 * @function ConfigFormProvider
 * @param {object} props - props object
 * @param {object} props.layout - the layout object (a parsed form layout)
 * @param {object} [props.data] - the data to populate the form with
 * @param {string} [props.urlDomain] - the domain to use for the API calls
 * @param {object} [props.options] - options to pass to the parser
 * @param {object} props.children - the children to render
 * @param {function} [props.addCustomValidations] - a function to add custom validations to the form - MUST be a function that returns an object of validation functions
 * @returns {React.ReactElement} - the wrapped children
 * @example <DynamicForm layout={layout} data={data}><MyForm /></DynamicForm>
 *
 */
const ConfigFormProvider = ({ layout, data, urlDomain, children, options, addCustomValidations }) => {
  const { useFormObject, ...rest } = useConfigForm(layout, data, { urlDomain, ...options }, addCustomValidations);

  return (
    <FormProvider useFormObject={useFormObject} {...rest}>
      {children}
    </FormProvider>
  );
};

ConfigFormProvider.propTypes = {
  layout: PropTypes.object,
  data: PropTypes.object,
  urlDomain: PropTypes.string,
  children: PropTypes.node,
  options: PropTypes.object,
  addCustomValidations: PropTypes.func,
};

export {
  ConfigFormProvider,
  ConfigForm,
};