import { type FC, useState } from "react";
import {
  isAFormField, type Appearance, type BaseAppearance, type FormColumn, type FormComponent,
  type FormComponentTypes, type FormContainer, type FormFieldTypes, type FormPanel,
  type LayoutTypes, type UseFormReturnWithSections
} from "@models/FormModels";
import { DynamicField, SectionTop } from "@timmons-group/shared-react-components";
import { Box, Card, CardContent, Collapse, Divider, Stack, type SxProps, Typography, styled } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import Grid from '@mui/material/Unstable_Grid2';
import { useFormContext } from "react-hook-form";

export type FormPanelAppearanceMeta = {
  headerContainer?: Appearance;
  header?: Appearance;
  content?: Appearance;
  icon?: Appearance;
}

// Create a type for all the known valid component types
export type FormComponentRendererTypes = FormFieldTypes | LayoutTypes | 'allComponents' | 'allFields';

/**
 * The FormComponentsRenderers type is a record of the different types of components that can be rendered
 * and the method to render them
 * @param types - allows each component type to have a specific render method
 * @param ids - allows for specific components to have a specific render method
 */
export type FormComponentsRenderers = {
  types: Record<FormComponentRendererTypes, FormComponentRenderMethod>;
  ids: Record<string, FormComponentRenderMethod>;
}

export type FormComponentRenderMethod = (
  component: FormComponent, allFields: Record<string, any>[], baseAppearance?: BaseAppearance, index?: number, options?: any
) => JSX.Element;

export type FormComponentsOptions = {
  renderers: FormComponentsRenderers;
}

export interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

export type RenderedFormComponentProps = {
  component: FormComponent;
  index?: number;
  baseAppearance?: BaseAppearance;
  allFields: Record<string, any>[];
  options?: FormComponentsOptions;
}

const createSX = (baseAppearance: BaseAppearance | undefined, componentAppearance: Appearance | undefined, componentType: FormComponentTypes) => {
  let sx: SxProps = baseAppearance?.[componentType]?.sx ?? {};
  if (componentAppearance?.sx) {
    sx = { ...sx, ...componentAppearance.sx } as SxProps;
  }

  return sx;
}

const createFieldSX = (baseAppearance: BaseAppearance | undefined, componentAppearance: Appearance | undefined, componentType: FormFieldTypes) => {
  const allBase = baseAppearance?.allFields?.sx ?? {};
  const typeBase = baseAppearance?.[componentType]?.sx ?? {};
  const componentSpecific = componentAppearance?.sx ?? {};
  // return the merged options
  // componentSpecific will override typeBase, which will override allBase
  return { ...allBase, ...typeBase, ...componentSpecific };
}

const getMetaFieldOptions = (baseAppearance: BaseAppearance | undefined, componentAppearance: Appearance | undefined, componentType: FormFieldTypes) => {
  const allBase = baseAppearance?.allFields?.meta?.fieldOptions ?? {};
  const typeBase = baseAppearance?.[componentType]?.meta?.fieldOptions ?? {};
  const componentSpecific = componentAppearance?.meta?.fieldOptions ?? {};
  // return the merged options
  // componentSpecific will override typeBase, which will override allBase
  return { ...allBase, ...typeBase, ...componentSpecific };
}

export const RenderedFormComponent: FC<RenderedFormComponentProps> = ({ component, index, allFields, baseAppearance, options }) => {
  const allContext = useFormContext() as unknown as UseFormReturnWithSections;
  const { control } = allContext.useFormObject;
  let customRender = options?.renderers?.types[component.type] || options?.renderers?.types.allComponents;
  // check if the component is a FormField and if options has the "allFields" renderer use it as the custom render
  if (isAFormField(component.type) && options?.renderers?.types.allFields) {
    customRender = customRender || options?.renderers?.types.allFields;
  }

  if (component.key) {
    // check if there is a custom render method for this component
    customRender = options?.renderers?.ids[component.key] || customRender;
  }

  if (customRender) {
    return customRender(component, allFields, baseAppearance, index, options);
  }

  const sx = createSX(baseAppearance, component.appearance, component.type);
  switch (component.type) {
    case 'columns':
      return <Columns baseAppearance={baseAppearance} columns={component.columns} allFields={allFields} />
    case 'panel':
      return <FormPanelComponent index={index} baseAppearance={baseAppearance} component={component} allFields={allFields} />;
    case 'description':
      return <Typography sx={sx} variant="sectionDescription">{component.description}</Typography>;
    case 'title':
      return <Typography sx={sx} variant="sectionHeader">{component.title}</Typography>;
    case 'divider': {
      return <Divider sx={sx} />;
    }
    case 'container':
      return <FormContainerComponent component={component} allFields={allFields} baseAppearance={baseAppearance} />;
    case 'date':
    case 'int':
    case 'float':
    case 'currency':
    case 'choice':
    case 'flag':
    case 'object':
    case 'text': {
      const field = allFields.find((field: Record<string, any>) => {
        return field.render.name === component.key
      });

      if (!field) {
        return <div>Field not found</div>;
      }

      const fieldSX = createFieldSX(baseAppearance, component.appearance, component.type);

      // Get the field options from the meta field options
      const fieldOptions = getMetaFieldOptions(baseAppearance, component.appearance, component.type as FormFieldTypes);

      // if the component has a maxWidth, set it in the props
      // otherwise, just pass the options
      const props = component.maxWidth ? { options: fieldOptions, sx: { ...fieldSX, maxWidth: component.maxWidth } } : { sx: fieldSX, options: fieldOptions };

      return (
        <DynamicField
          key={index}
          field={field}
          control={control}
          {...props}
        />
      )
    }
    default:
      return <div>Unknown</div>;
  }
}

export type ColumnsProps = {
  columns: FormColumn[];
  allFields: Record<string, any>[];
  baseAppearance?: BaseAppearance;
}

export const Columns: FC<ColumnsProps> = ({ columns, allFields, baseAppearance }: any) => {
  // loop through the columns and render using MUI Grid
  const spacing = { xs: 1, sm: 2, md: 4 };
  return (
    <Grid container spacing={spacing}>
      {columns.map((column: FormColumn, index: number) => {
        // prop size is a string that will be used to set the width of the column
        const gridProps = {
          [column.size]: column.width
        }

        return (
          <Grid key={index} {...gridProps}>
            <FormComponents components={column.components} allFields={allFields} baseAppearance={baseAppearance} />
          </Grid>
        );
      })}
    </Grid>
  );
}

export type FormComponentsProps = {
  allFields: Record<string, any>[];
  components: FormComponent[];
  baseAppearance?: BaseAppearance;
  options?: FormComponentsOptions;
}

export const FormComponents: FC<FormComponentsProps> = ({ allFields, components, baseAppearance, options }) => {
  return (
    <>
      {components.map((component: FormComponent, index: number) => {
        const key = (component.key ?? 'formComponent') + index;
        return (
          <RenderedFormComponent
            allFields={allFields}
            baseAppearance={baseAppearance}
            key={key}
            component={component}
            options={options}
            index={index}
          />
        );
      })}
    </>
  );
}

export type FormContainerComponentProps = {
  component: FormContainer;
  allFields: Record<string, any>[];
  baseAppearance?: BaseAppearance;
}

export const FormContainerComponent: FC<FormContainerComponentProps> = ({ component, allFields, baseAppearance }) => {
  return <>
    <FormComponents components={component.components} allFields={allFields} baseAppearance={baseAppearance} />
  </>
}

export type FormPanelComponentProps = {
  component: FormPanel;
  allFields: Record<string, any>[];
  baseAppearance?: BaseAppearance;
  index?: number;
}

export const FormPanelComponent: FC<FormPanelComponentProps> = ({ component, index, allFields, baseAppearance }) => {
  // do not allow the panel to be collapsed if it is not set to be collapsible
  const collapsed = component.collapsible && component.collapsed;
  const [expanded, setExpanded] = useState<boolean>(!collapsed);
  const sx: SxProps = { position: 'relative' };
  if (index) {
    sx.marginTop = '16px';
  }
  const { collapsible, title } = component;

  const renderSectionTitle = (title: string) => {
    return (
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="sectionHeader">{title}</Typography>
        {collapsible &&
          <ExpandMore
            expand={expanded}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon />
          </ExpandMore>
        }
      </Stack>
    );
  }

  const renderContent = () => {
    if (collapsible) {
      return (
        <Collapse in={expanded} timeout="auto">
          <FormPanelContent component={component} allFields={allFields} baseAppearance={baseAppearance} />
        </Collapse>
      );
    }
    return <FormPanelContent component={component} allFields={allFields} baseAppearance={baseAppearance} />;
  }

  return (
    <Card sx={sx}>
      <Box sx={{ flexGrow: 1 }}>
        <SectionTop renderTitle={renderSectionTitle} title={title} description={component.description} />
      </Box>
      {renderContent()}
    </Card>
  );
}

export type FormPanelContentProps = {
  component: FormPanel;
  allFields: Record<string, any>[];
  baseAppearance?: BaseAppearance;
}

export const FormPanelContent: FC<FormPanelContentProps> = ({ component, allFields, baseAppearance }) => {
  return (
    <CardContent>
      <FormComponents allFields={allFields} components={component.components} baseAppearance={baseAppearance} />
    </CardContent>
  );
}

export const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));