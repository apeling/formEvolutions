//Third party bits
import React from 'react';
import PropTypes from 'prop-types';

import { useFormContext } from 'react-hook-form';

// Third party components
import { Button, Card, CardContent, Container, Stack, Skeleton } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';

// Internal bits
import DynamicField from '../../components/DynamicField';
import SubHeader from '../../components/SubHeader';
import LoadingSpinner from '../LoadingSpinner';
import { createRowFields, functionOrDefault } from '../../helpers';
import { FIELD_TYPES } from '../../constants';
import { SectionTop } from '../../components/SectionTop';

/** @module FormSections */
/**
 * @typedef {object} FormSectionProps
 * @property {string} [title] - the title to display in the section
 * @property {string} [description] - the description to display in the section
 * @property {renderSectionDescription} [renderFormDescription] - a function to render the form description (bypassed if renderFormInformation is provided)
 * @property {renderSectionTitle} [renderFormTitle] - a function to render the form title (bypassed if renderFormInformation is provided)
 * @property {renderSectionTop} [renderFormInformation] - a function to render the form information (title and description)
 * @property {renderSectionTitle} [renderSectionTitle] - a function to render the section title
 * @property {renderSectionDescription} [renderSectionDescription] - a function to render the section description
 * @property {renderSectionTop} [renderSectionTop] - a function to render the section top
 * @property {function} [renderLoading] - a function to render the loading indicator
 * @property {number} [columnCount] - the number of columns to render
 * @property {object} [fieldOptions] - the options to pass to the fields
 * @property {boolean} [hideEmptySections] - whether or not to hide the section if it is empty
 * @property {object} [children] - the children to render
 */
/**
 * FormSections will loop through the sections and render them and their fields inside an html form
 * @function FormSections
 * @param {FormSectionProps} props - props object
 * @returns {React.ReactElement} - the rendered form sections
 */
const FormSections = ({
  children, formTitle, formDescription, renderFormDescription, renderFormTitle, columnCount = 1, fieldOptions, hideEmptySections = true,
  renderLoading, renderFormInformation, renderSectionTitle, renderSectionDescription, renderSectionTop, ...props
}) => {
  const { sections, formProcessing, useFormObject } = useFormContext();
  const { control } = useFormObject;

  const loadingIndicator = functionOrDefault(renderLoading, () => (
    <div>
      <h1>Processing</h1>
      <Skeleton variant="rectangular" height={300} />
    </div>
  ));

  if (formProcessing) {
    return loadingIndicator();
  }

  if (!sections) {
    return (
      <div>
        <h1>Error</h1>
        <p>No form sections were provided</p>
      </div>
    );
  }

  const theSection = renderColumnSection;
  const sectOpts = {
    columnCount,
    fieldOptions,
    hideEmptySections,
    renderSectionTitle,
    renderSectionDescription,
    renderSectionTop
  };

  const hasTopRender = renderFormInformation && (typeof renderFormInformation === 'function');
  const hasTopText = !hasTopRender && (formTitle || formDescription || renderFormDescription || renderFormTitle);

  return (
    <form data-src-form="genericForm">
      {sections.map((section, index) => {
        const sx = { position: 'relative' };
        if (index) {
          sx.marginTop = '16px';
        }
        return (
          <Card key={index} sx={sx}>
            {index === 0 && hasTopRender &&
              renderFormInformation(formTitle, formDescription)
            }
            {index === 0 && hasTopText &&
              <SectionTop title={formTitle} description={formDescription} renderDescription={renderFormDescription} renderTitle={renderFormTitle} />
            }
            {theSection(section, control, index, sectOpts)}
          </Card>
        );
      })}
      {children}
    </form>
  );
};
FormSections.propTypes = {
  children: PropTypes.node,
  formTitle: PropTypes.string,
  formDescription: PropTypes.string,
  renderFormDescription: PropTypes.func,
  renderFormTitle: PropTypes.func,
  renderFormInformation: PropTypes.func,
  renderSectionTitle: PropTypes.func,
  renderSectionDescription: PropTypes.func,
  renderSectionTop: PropTypes.func,
  fieldOptions: PropTypes.object,
  hideEmptySections: PropTypes.bool,
  renderLoading: PropTypes.func,
  columnCount: PropTypes.number,
};

/** @module GenericConfigForm */
/**
 * A Generic Form with a header and buttons to submit and cancel
 * Must be wrapped in a FormProvider
 * @function GenericConfigForm
 * @param {object} props
 * @param {string} [props.headerTitle] - the title to display in the header
 * @param {string} [props.resetColor] - the color to use for the edit button
 * @param {string} [props.cancelColor] - the color to use for the cancel button
 * @param {string} [props.cancelUrl] - the url to redirect to when the cancel button is clicked
 * @param {boolean} [props.isEdit] - whether or not the form is in edit mode
 * @param {string} [props.submitColor] - the color to use for the submit button
 * @param {FormSectionProps} [props.sectionProps] - the props to pass to the section (See FormSections Component)
 * @param {string} [props.cancelLabel] - the label to use for the cancel button
 * @param {string} [props.resetLabel] - the label to use for the reset button
 * @param {string} [props.submitLabel] - the label to use for the submit button
 * @param {function} [props.onSubmit] - the function to call when the form is submitted
 * @param {boolean} [props.modifying] - whether or not the form is currently being modified
 * @param {object} [props.children] - the children to render
 * @param {function} [props.renderLoading] - the function to render while the form is loading
 * @returns {React.ReactElement} - the rendered form
 */
const GenericConfigForm = ({
  headerTitle, resetColor, cancelColor, cancelUrl, isEdit, submitColor, sectionProps, onSubmit, modifying,
  cancelLabel, resetLabel, submitLabel, children, renderLoading
}) => {
  // Get the form context
  // useFormObject is all the properties from react-hook-form useForm object
  // formProcessing is a boolean that is true when the form is processing
  // forceReset is a function that will reset the form to the initial values
  const { formProcessing, forceReset, useFormObject } = useFormContext();
  const { handleSubmit } = useFormObject;

  const submitForm = functionOrDefault(onSubmit, (data) => {
    console.warn('no onSubmit provided. Data to submit: ', data);
  });

  // onSubmit is not called if the form is invalid
  // so we need to manually check for this
  const preSubmit = (evt) => {
    // const themValues = getValues();
    handleSubmit(submitForm)(evt);
  };

  const loadingIndicator = functionOrDefault(renderLoading, () => <LoadingSpinner isActive={true} />);

  return (
    <>
      <SubHeader data-src-form-subheader="genericForm"
        title={headerTitle}
        rightRender={
          () =>
            <Stack spacing={2} direction="row" justifyContent="flex-end">
              <Button data-src-form-button="cancel" color={cancelColor} href={cancelUrl}>{cancelLabel || 'Cancel'}</Button>
              {isEdit &&
                <Button data-src-form-button="reset" color={resetColor} onClick={forceReset}>{resetLabel || 'Reset'}</Button>
              }
              <Button data-src-form-button="submit" color={submitColor} onClick={preSubmit}>{submitLabel || 'Save'}</Button>
            </Stack>
        }
      />
      {(formProcessing || modifying) && loadingIndicator()}
      <Container sx={{ position: 'relative', marginTop: '16px' }} maxWidth={false}>
        <FormSections {...sectionProps}>
          {children}
        </FormSections>
      </Container>
    </>
  );
};

GenericConfigForm.propTypes = {
  headerTitle: PropTypes.string,
  resetColor: PropTypes.string,
  cancelColor: PropTypes.string,
  cancelUrl: PropTypes.string,
  cancelLabel: PropTypes.string,
  resetLabel: PropTypes.string,
  isEdit: PropTypes.bool,
  submitLabel: PropTypes.string,
  submitColor: PropTypes.string,
  // Runtime error if this is not defined ABOVE
  sectionProps: PropTypes.shape(FormSections.propTypes),
  children: PropTypes.node,
  onSubmit: PropTypes.func,
  modifying: PropTypes.bool,
  renderLoading: PropTypes.func,
};

/** @module SectionRow */
/**
 * Callback for rendering a section description
 * @callback renderSectionDescription
 * @param {string} description - the description to render
 * @param {number} index - the index of the section
 * @returns {React.ReactElement} - the rendered description
 */

/**
 * Callback for rendering a section title
 * @callback renderSectionTitle
 * @param {string} title - the description to render
 * @param {number} index - the index of the section
 * @returns {React.ReactElement} - the rendered description
 */

/**
 * Callback for rendering a section title
 * @callback renderSectionTop
 * @param {object} section - the section properties (title, description, etc)
 * @param {number} index - the index of the section
 * @returns {React.ReactElement} - the rendered description
 */

/**
 * Renderer for a section with
 * @callback renderColumnSection
 * @param {object} section - the section to render
 * @param {array} section.fields - the fields to render in the section
 * @param {string} [section.title] - the title of the section
 * @param {string} [section.description] - the description of the section
 * @param {object} control - the control object from react-hook-form
 * @param {number} index - the index of the section
 * @param {object} [options] - options object
 * @param {number} [options.columnCount] - the number of columns to render
 * @param {renderSectionDescription} [options.renderSectionDescription] - a function to render the section description
 * @param {renderSectionTitle} [options.renderSectionTitle] - a function to render the section title
 * @param {renderSectionTop} [options.renderSectionTop] - a function to render the section top
 * @param {boolean} [options.hideEmptySections] - a flag to hide sections that are empty
 * @returns {React.ReactElement} - the rendered column section
 */
const renderColumnSection = (section, control, index, options) => {
  // create two columns of fields
  if (section.visible === false && options?.hideEmptySections) {
    return null;
  }

  const rows = createRowFields(section.fields, options?.columnCount);
  const hasTopRender = options?.renderSectionTop && (typeof options?.renderSectionTop === 'function');
  const hasTop = !hasTopRender && (section.name || section.description);

  return (
    <React.Fragment key={index}>
      {hasTopRender && options.renderSectionTop(section, index)}
      {hasTop &&
        <SectionTop
          title={section.name}
          description={section.description}
          renderDescription={options?.renderSectionDescription}
          renderTitle={options?.renderSectionTitle}
        />
      }
      <CardContent>
        {rows.map((rowItem, rIndex) => {
          return (
            <SectionRow row={rowItem} control={control} options={options} key={`${index}-row-${rIndex}`} />
          );
        })}
      </CardContent>
    </React.Fragment>
  );
};
/**
 * Component to render a row of fields inside a section
 * @function SectionRow
 * @param {object} props - props object
 * @param {object} props.row - the row object
 * @param {array} props.row.fields - the fields to render
 * @param {boolean} [props.row.solitary] - whether or not the row is a solitary field
 * @param {number} [props.row.size] - the size of the solitary field
 * @param {number} [props.row.maxColumns] - the max number of columns to render
 * @param {object} props.control - the control object from useForm
 * @param {object} [props.options] - the options object
 * @param {object} [props.options.fieldOptions] - the options to pass to the fields
 * @returns {React.ReactElement} - the rendered row using Grid
 * @example
 * <CardContent>
    {rows.map((rowItem, rIndex) => {
      return (
        <SectionRow row={rowItem} control={control} options={options} key={`${index}-row-${rIndex}`} />
      );
    })}
  </CardContent>
 */
const SectionRow = ({ row, control, options }) => {
  const { fields, solitary, size, maxColumns } = row;
  const colsAllowed = maxColumns || 1;
  let colSize = 12 / fields.length;
  if (solitary && !isNaN(size)) {
    colSize = parseInt(size);
  }

  const spacing = colsAllowed === 1 ? 2 : { xs: 1, sm: 2, md: 4 };

  return (
    <Grid container spacing={spacing}>
      {fields.map((field) => {
        const { render } = field;
        const isCluster = render?.type === FIELD_TYPES.CLUSTER ? true : false;

        return (
          <Grid container={isCluster} xs={colSize} key={`grid-item-${field?.render?.name}`}>
            <DynamicField
              field={field}
              control={control}
              options={options?.fieldOptions || {}}
            />
          </Grid>
        );
      })}
    </Grid>
  );
};

SectionRow.propTypes = {
  row: PropTypes.shape({
    fields: PropTypes.array.isRequired,
    solitary: PropTypes.bool,
    size: PropTypes.number,
    maxColumns: PropTypes.number,
  }),
  control: PropTypes.object,
  options: PropTypes.object,
};

export {
  FormSections,
  SectionRow,
  GenericConfigForm
};